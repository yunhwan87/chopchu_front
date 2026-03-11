import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { getUserProfile, updateUserProfile } from '../api/profiles';
import { toKoreanErrorMessage } from '../utils/errorMessages';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. 현재 세션 가져오기
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                try {
                    const profileData = await getUserProfile(currentUser.id);
                    setProfile(profileData);
                } catch (err) {
                    console.error("Error loading profile:", err);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        // 2. 인증 상태 변경 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                try {
                    const profileData = await getUserProfile(currentUser.id);
                    setProfile(profileData);
                } catch (err) {
                    console.error("Error loading profile during auth change:", err);
                }
            } else {
                setProfile(null);
            }
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

    const register = async (email, password, nickname) => {
        setLoading(true);
        const result = await authService.register(email, password, nickname);
        setLoading(false);
        return result;
    };

    const logout = async () => {
        setLoading(true);
        await authService.logout();
        setLoading(false);
    };

    const checkNickname = async (nickname) => {
        const result = await authService.checkNickname(nickname);
        return result;
    };

    const updateProfile = async (updates) => {
        if (!user) return { success: false, error: "로그인이 필요해요. 다시 로그인해 주세요." };
        try {
            const data = await updateUserProfile(user.id, updates);
            setProfile(data);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: toKoreanErrorMessage(error, '프로필을 수정하지 못했어요.') };
        }
    };

    const updatePassword = async (newPassword) => {
        if (!user) return { success: false, error: "로그인이 필요해요. 다시 로그인해 주세요." };
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: toKoreanErrorMessage(error, '비밀번호를 변경하지 못했어요.') };
        }
    };

    return {
        user,
        profile,
        loading,
        login,
        register,
        logout,
        checkNickname,
        updateProfile,
        updatePassword,
    };
};
