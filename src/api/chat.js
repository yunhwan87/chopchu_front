import { supabase } from '../lib/supabase';

// 1. 로그인한 유저의 채팅방 목록 가져오기
export const fetchChatRooms = async (projectId = null) => {
    try {
        const { data: userMemberData, error: memberError } = await supabase
            .from('chat_room_members')
            .select('room_id');

        if (memberError) throw memberError;

        if (!userMemberData || userMemberData.length === 0) return [];

        const roomIds = userMemberData.map(m => m.room_id);

        let query = supabase
            .from('chat_rooms')
            .select(`
        *,
        projects (
          title
        ),
        chat_room_members (
          user_id
        ),
        messages (
          content,
          created_at
        )
      `)
            .in('id', roomIds)
            .order('updated_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        // messages 가 배열이므로, 개수 제한이나 정렬을 selectQuery 에서 처리하도록 수정 가능하지만
        // 여기서는 가져온 후 messages[0]을 쓰기 위해 select 내부 정렬 추가
        // Supabase select 에서 subquery 정렬은 .order('messages.created_at', { ascending: false }) 형식이 가능함
        query = query.order('created_at', { foreignTable: 'messages', ascending: false });

        const { data: roomsData, error: roomsError } = await query;

        if (roomsError) throw roomsError;

        return roomsData;
    } catch (error) {
        console.error('채팅방 목록 가져오기 오류:', error.message);
        throw error;
    }
};

// 2. 새로운 채팅방 생성하기
export const createChatRoom = async (projectId, name, memberIds) => {
    try {
        // 채팅방 생성
        const { data: roomData, error: roomError } = await supabase
            .from('chat_rooms')
            .insert([{ project_id: projectId, name }])
            .select()
            .single();

        if (roomError) throw roomError;

        // 멤버 추가
        const membersToInsert = memberIds.map(userId => ({
            room_id: roomData.id,
            user_id: userId
        }));

        const { error: memberError } = await supabase
            .from('chat_room_members')
            .insert(membersToInsert);

        if (memberError) throw memberError;

        return roomData;
    } catch (error) {
        console.error('채팅방 생성 오류:', error.message);
        throw error;
    }
};

// 3. 채팅방의 이전 메시지 가져오기
export const fetchMessages = async (roomId) => {
    try {
        // 1. 메시지만 먼저 가져옵니다.
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!messages || messages.length === 0) return [];

        // 2. 메시지 작성자들의 고유 ID 목록을 추출합니다.
        const senderIds = [...new Set(messages.map(m => m.sender_id))];

        // 3. 해당 작성자들의 프로필 정보를 한 번에 가져옵니다.
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nickname, avatar_url')
            .in('id', senderIds);

        // 4. 프로필 정보를 Map 형태로 변환 (조회 성능 최적화)
        const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

        // 5. 메시지 데이터에 프로필 정보를 합쳐서 반환합니다.
        return messages.map(m => ({
            ...m,
            profiles: profileMap[m.sender_id] || null
        }));

    } catch (error) {
        console.error('메시지 가져오기 오류:', error.message);
        throw error;
    }
};

// 4. 메시지 전송하기
export const sendMessage = async (roomId, senderId, content) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert([{
                room_id: roomId,
                sender_id: senderId,
                content: content
            }])
            .select()
            .single();

        if (error) throw error;

        // 채팅방 updated_at 갱신
        await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', roomId);

        return data;
    } catch (error) {
        console.error('메시지 전송 오류:', error.message);
        throw error;
    }
};
