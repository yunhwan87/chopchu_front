import { supabase } from '../lib/supabase';

/**
 * 이메일 또는 닉네임으로 사용자 검색
 */
export const searchUsers = async (query) => {
    if (!query || query.length < 2) return [];

    console.log('Searching users with query:', query);
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nickname, avatar_url')
        .or(`email.ilike.%${query}%,nickname.ilike.%${query}%`)
        .limit(5);

    if (error) {
        console.error('Search error details:', error);
        throw error;
    }
    console.log('Search results:', data);
    return data;
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
