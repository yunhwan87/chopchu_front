import { supabase } from '../lib/supabase';

/**
 * 프로젝트 목록 가져오기 (내가 멤버로 속한 프로젝트만)
 */
export const getProjects = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            project_members!inner(user_id),
            all_members:project_members (
                user_id,
                role,
                profiles (nickname, email)
            )
        `)
        .eq('project_members.user_id', userData.user?.id);

    if (error) throw error;
    return data;
};

/**
 * 새 프로젝트 생성 및 멤버 초대
 */
export const createProject = async ({ title, startDate, endDate, totalDays, note, memberIds = [] }) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('로그인이 필요해요. 다시 로그인해 주세요.');

    // 1. 프로젝트 생성
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
            {
                title,
                created_by: user.id,
                start_date: startDate,
                end_date: endDate,
                total_days: totalDays,
                note: note
            }
        ])
        .select()
        .single();

    if (projectError) throw projectError;

    // 2. 추가 멤버 초대 (작성자는 트리거에 의해 자동 추가됨)
    if (memberIds.length > 0) {
        const memberData = memberIds.map(userId => ({
            project_id: project.id,
            user_id: userId,
            role: 'member'
        }));

        const { error: memberError } = await supabase
            .from('project_members')
            .insert(memberData);

        if (memberError) {
            console.error('Error inviting members:', memberError);
            // 프로젝트는 생성되었으므로 에러를 던지기보다 로그를 남기고 진행할 수 있음
        }
    }

    return project;
};

/**
 * 프로젝트 상세 정보 및 멤버 목록 가져오기
 */
export const getProjectDetails = async (projectId) => {
    const { data, error } = await supabase
        .from('projects')
        .select(`
      *,
      project_members (
        user_id,
        role,
        profiles (
          email,
          nickname,
          avatar_url
        )
      )
    `)
        .eq('id', projectId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * 프로젝트 삭제 (연관된 모든 데이터 순차 삭제)
 */
export const deleteProject = async (projectId) => {
    try {
        // 1. 연관된 데이터의 ID들을 먼저 수집
        const [
            { data: locations },
            { data: rooms },
            { data: requests },
            { data: itineraries }
        ] = await Promise.all([
            supabase.from('locations').select('id').eq('project_id', projectId),
            supabase.from('chat_rooms').select('id').eq('project_id', projectId),
            supabase.from('requests').select('id').eq('project_id', projectId),
            supabase.from('itinery').select('id').eq('project_id', projectId)
        ]);

        const locationIds = locations?.map(l => l.id) || [];
        const roomIds = rooms?.map(r => r.id) || [];
        const requestIds = requests?.map(r => r.id) || [];
        const itineraryIds = itineraries?.map(i => i.id) || [];

        // 2. 최하위 자식 테이블 데이터 삭제 (Foreign Key 제약 조건 순서 고려)
        
        // 2-1. 일정 관련 하위 데이터
        if (itineraryIds.length > 0) {
            await supabase.from('itinery_locations').delete().in('itinery_id', itineraryIds);
        }
        
        // 2-2. 장소 관련 하위 데이터
        if (locationIds.length > 0) {
            await Promise.all([
                supabase.from('locations_poc').delete().in('location_id', locationIds),
                supabase.from('itinery_locations').delete().in('location_id', locationIds)
            ]);
        }

        // 2-3. 채팅 관련 하위 데이터
        if (roomIds.length > 0) {
            await Promise.all([
                supabase.from('messages').delete().in('room_id', roomIds),
                supabase.from('chat_room_members').delete().in('room_id', roomIds)
            ]);
        }

        // 2-4. 요청 관련 하위 데이터
        if (requestIds.length > 0) {
            await supabase.from('request_messages').delete().in('request_id', requestIds);
        }

        // 3. 중간 부모 테이블 데이터 삭제
        await Promise.all([
            supabase.from('itinery').delete().eq('project_id', projectId),
            supabase.from('locations').delete().eq('project_id', projectId),
            supabase.from('chat_rooms').delete().eq('project_id', projectId),
            supabase.from('requests').delete().eq('project_id', projectId),
            supabase.from('project_members').delete().eq('project_id', projectId)
        ]);

        // 4. 최종 프로젝트 삭제
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error during project full deletion:', err);
        throw err;
    }
};

/**
 * 프로젝트 정보 수정 및 멤버 동기화
 */
export const updateProject = async (projectId, { title, startDate, endDate, totalDays, note, memberIds = [] }) => {
    console.log(`[API] updateProject called for ID: ${projectId}`, { title, memberIds });

    // 0. 권한 및 존재 여부 우선 확인
    const { data: currentProj, error: currentFetchError } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

    if (currentFetchError) {
        console.error('[API] Error finding project before update:', currentFetchError);
    }

    // 1. 기본 프로젝트 정보 업데이트 시도
    console.log('[API] Step 1: Updating projects table...');
    const { data: updateData, error: projectError } = await supabase
        .from('projects')
        .update({
            title,
            start_date: startDate,
            end_date: endDate,
            total_days: totalDays,
            note
        })
        .eq('id', projectId)
        .select();

    let projectInfoSuccess = false;
    let project = currentProj; // 기본값은 기존 정보

    if (projectError) {
        console.error('[API] Project Info Update DB Error:', projectError);
    } else if (updateData && updateData.length > 0) {
        console.log('[API] Project details updated successfully');
        projectInfoSuccess = true;
        project = updateData[0];
    } else {
        console.warn('[API] Project table update affected 0 rows (Check RLS)');
    }

    // 2. 멤버 리스트 동기화 시도 (프로젝트가 존재하면 무조건 시도)
    console.log(`[API] Step 2: Syncing members for project ${projectId}. New memberIds:`, memberIds);

    const { data: existingMembers, error: fetchError } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId);

    let memberSyncSuccess = true;

    if (fetchError) {
        console.error('[API] Error fetching existing members:', fetchError);
        memberSyncSuccess = false;
    } else {
        const existingUserIds = existingMembers.map(m => m.user_id);
        const ownerId = existingMembers.find(m => m.role === 'owner')?.user_id;
        const ownerFromProj = currentProj?.created_by;

        // 추가할 멤버 (기존에 없던 멤버)
        const membersToAdd = memberIds.filter(id => !existingUserIds.includes(id));
        
        // 삭제할 멤버 (기본 멤버 리스트에 없는데 DB에는 있는 멤버, 단 owner/방장 제외)
        const membersToRemove = existingUserIds.filter(id => 
            !memberIds.includes(id) && id !== ownerId && id !== ownerFromProj
        );

        console.log(`[API] Members to add:`, membersToAdd);
        console.log(`[API] Members to remove:`, membersToRemove);

        // 신규 멤버 추가
        if (membersToAdd.length > 0) {
            const { error: insertError } = await supabase.from('project_members').insert(
                membersToAdd.map(userId => ({
                    project_id: projectId,
                    user_id: userId,
                    role: 'member'
                }))
            );
            if (insertError) {
                console.error('[API] Member Insert Error:', insertError);
                memberSyncSuccess = false;
            } else {
                console.log('[API] Member Insert Success');
            }
        }

        // 제거된 멤버 삭제
        if (membersToRemove.length > 0) {
            const { error: deleteError } = await supabase.from('project_members')
                .delete()
                .eq('project_id', projectId)
                .in('user_id', membersToRemove);
            if (deleteError) {
                console.error('[API] Member Delete Error:', deleteError);
                memberSyncSuccess = false;
            } else {
                console.log('[API] Member Delete Success');
            }
        }
    }

    // 3. 최신 데이터 재조회 (멤버 정보 포함)
    const { data: finalProject, error: finalError } = await supabase
        .from('projects')
        .select(`
            *,
            all_members:project_members (
                user_id,
                role,
                profiles (nickname, email)
            )
        `)
        .eq('id', projectId)
        .single();

    if (finalError) {
        console.error('[API] Error fetching final project data:', finalError);
    }

    return {
        ...(finalProject || project),
        infoUpdated: projectInfoSuccess,
        membersSynced: memberSyncSuccess
    };
};
