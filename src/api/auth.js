import { supabase } from '../lib/supabase';

/**
 * 회원가입 (Email) 및 프로필 생성
 */
export const signUp = async (email, password, nickname) => {
    // 1. Auth 회원가입
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nickname,
            },
        },
    });
    if (error) throw error;

    // 2. 가입 시 profiles 테이블의 정보 업데이트 (트리거에 의해 이미 행이 생성되어 있으므로 update 사용)
    if (data?.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                email: email,
                nickname: nickname,
                updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);

        if (profileError) {
            console.warn("프로필 업데이트 실패:", profileError.message);
        }
    }

    return data;
};

/**
 * 로그인 (Email)
 */
export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
};

/**
 * 로그아웃
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

/**
 * 현재 세션 확인
 */
export const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
};

/**
 * 닉네임 중복 확인
 */
export const checkNickname = async (nickname) => {
    // profiles 테이블에서 확인
    const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname)
        .maybeSingle();

    if (error) {
        console.error("CheckNickname Error:", error.message);
        throw error;
    }

    return !!data; // data가 있으면 중복(true), 없으면 사용가능(false)
};
