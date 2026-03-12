import { supabase } from '../lib/supabase';

/**
 * 이메일 또는 닉네임으로 사용자 검색
 */
export const searchUsers = async (query) => {
    if (!query || query.length < 2) return [];
    
    const trimmedQuery = query.trim();
    console.log(`[API] Triggered search for: "${trimmedQuery}"`);
    
    // 이메일이나 닉네임에 해당 검색어가 포함된 유저 검색
    const { data, error, count } = await supabase
        .from('profiles')
        .select('id, email, nickname, avatar_url')
        .or(`email.ilike.%${trimmedQuery}%,nickname.ilike.%${trimmedQuery}%`)
        .limit(10);

    if (error) {
        console.error('[API] Supabase Error:', error.message, error.details);
        return [];
    }

    console.log(`[API] DB Raw Data Count: ${data?.length || 0}`);
    
    const validData = data || [];
    console.log(`[API] Results for "${trimmedQuery}":`, validData.map(u => u.email));
    return validData;
};

/**
 * 사용자 ID로 프로필 정보 조회
 */
export const getUserProfile = async (userId) => {
    if (!userId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error.message);
        throw error;
    }

    return data;
};

/**
 * 사용자 프로필 정보 업데이트
 */
export const updateUserProfile = async (userId, updates) => {
    if (!userId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user profile:', error.message);
        throw error;
    }

    return data;
};
