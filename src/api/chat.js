import { supabase } from '../lib/supabase';

// 1. 로그인한 유저의 채팅방 목록 가져오기
export const fetchChatRooms = async (projectId) => {
    try {
        const { data: userMemberData, error: memberError } = await supabase
            .from('chat_room_members')
            .select('room_id');

        if (memberError) throw memberError;

        if (!userMemberData || userMemberData.length === 0) return [];

        const roomIds = userMemberData.map(m => m.room_id);

        const { data: roomsData, error: roomsError } = await supabase
            .from('chat_rooms')
            .select(`
        *,
        chat_room_members (
          user_id
        ),
        messages (
          content,
          created_at
        )
      `)
            .in('id', roomIds)
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false });

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
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
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
