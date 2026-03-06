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
