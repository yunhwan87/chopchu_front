import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. 현재 세션 가져오기
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 2. 인증 상태 변경 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        setLoading(true);
        const result = await authService.login(email, password);
        setLoading(false);
        return result;
    };

    const register = async (email, password) => {
        setLoading(true);
        const result = await authService.register(email, password);
        setLoading(false);
        return result;
    };

    const logout = async () => {
        setLoading(true);
        await authService.logout();
        setLoading(false);
    };

    return {
        user,
        loading,
        login,
        register,
        logout,
    };
};
