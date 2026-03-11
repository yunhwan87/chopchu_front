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
 * 프로젝트 삭제
 */
export const deleteProject = async (projectId) => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) throw error;
    return true;
};
