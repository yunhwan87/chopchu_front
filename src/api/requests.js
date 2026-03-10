import { supabase } from "../lib/supabase";

/**
 * 특정 프로젝트의 보낸 요청 또는 받는 요청 목록을 가져옵니다.
 * @param {string} projectId 
 * @param {string} userId - 현재 로그인한 유저의 ID
 * @param {string} type - 'sent' (내가 보낸 요청) | 'received' (내가 받은 요청)
 */
export const fetchRequests = async (projectId, userId, type) => {
    try {
        let query = supabase
            .from('requests')
            .select(`
                *,
                sender:profiles!requests_sender_id_fkey(id, email, nickname, avatar_url),
                receiver:profiles!requests_receiver_id_fkey(id, email, nickname, avatar_url)
            `)
            .order('created_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        if (type === 'sent') {
            query = query.eq('sender_id', userId).neq('status', 'resolved');
        } else if (type === 'received') {
            query = query.eq('receiver_id', userId).neq('status', 'resolved');
        } else if (type === 'resolved') {
            // 보낸 요청이든 받은 요청이든 상태가 resolved인 것
            query = query.or(`sender_id.eq.${userId}, receiver_id.eq.${userId}`).eq('status', 'resolved');
        }

        const { data, error } = await query;
        if (error) throw error;

        return { data, error: null };
    } catch (err) {
        console.error(`Error fetching ${type} requests: `, err);
        return { data: null, error: err };
    }
};

/**
 * 특정 요청의 메시지(스레드) 목록을 가져옵니다.
 * @param {string} requestId 
 */
export const fetchRequestMessages = async (requestId) => {
    try {
        const { data, error } = await supabase
            .from('request_messages')
            .select(`
                *,
                sender:profiles!request_messages_sender_id_fkey(id, email, nickname, avatar_url)
            `)
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('Error fetching request messages:', err);
        return { data: null, error: err };
    }
};

/**
 * 새로운 요청을 생성합니다. (기본 메시지 포함)
 * @param {Object} requestData 
 * @param {string} requestData.projectId
 * @param {string} requestData.senderId
 * @param {string} requestData.receiverId
 * @param {string} requestData.title
 * @param {string} requestData.content - 첫 번째 메시지가 될 내용
 */
export const createRequest = async ({ projectId, senderId, receiverId, title, content }) => {
    try {
        // 1. 요청 기본 정보 생성
        const { data: request, error: requestError } = await supabase
            .from('requests')
            .insert({
                project_id: projectId,
                sender_id: senderId,
                receiver_id: receiverId,
                title: title,
                status: 'pending' // 기본 상태
            })
            .select()
            .single();

        if (requestError) throw requestError;

        // 2. 요청 내용(첫 메시지) 생성
        const { error: messageError } = await supabase
            .from('request_messages')
            .insert({
                request_id: request.id,
                sender_id: senderId,
                content: content
            });

        if (messageError) throw messageError;

        return { data: request, error: null };
    } catch (err) {
        console.error('Error creating request:', err);
        return { data: null, error: err };
    }
};

/**
 * 스레드에 새로운 답변/추가 메시지를 남깁니다.
 * @param {string} requestId 
 * @param {string} senderId 
 * @param {string} content 
 */
export const addRequestMessage = async (requestId, senderId, content) => {
    try {
        const { data, error } = await supabase
            .from('request_messages')
            .insert({
                request_id: requestId,
                sender_id: senderId,
                content: content,
            })
            .select(`
                *,
                sender:profiles!request_messages_sender_id_fkey(id, email, nickname, avatar_url)
            `)
            .single();

        if (error) throw error;

        // 새 메시지가 달리면 부모 요청의 updated_at을 갱신 (선택적)
        await supabase.from('requests').update({ updated_at: new Date().toISOString() }).eq('id', requestId);

        return { data, error: null };
    } catch (err) {
        console.error('Error adding request message:', err);
        return { data: null, error: err };
    }
};

/**
 * 요청의 상태를 변경합니다. (pending, in_progress, need_info, resolved)
 * @param {string} requestId 
 * @param {string} status 
 */
export const updateRequestStatus = async (requestId, status) => {
    try {
        const { data, error } = await supabase
            .from('requests')
            .update({ status: status, updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('Error updating request status:', err);
        return { data: null, error: err };
    }
};
