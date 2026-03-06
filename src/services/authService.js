import * as authApi from '../api/auth';

export const authService = {
    /**
     * 로그인 로직 (추가적인 데이터 가공이 필요한 경우 여기서 처리)
     */
    async login(email, password) {
        try {
            const data = await authApi.signIn(email, password);
            // 로그인 성공 후 추가 작업 (예: 로컬 스토리지 저장 등 - Supabase는 자동 처리됨)
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login Service Error:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * 회원가입 로직
     */
    async register(email, password) {
        try {
            const data = await authApi.signUp(email, password);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Signup Service Error:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * 로그아웃
     */
    async logout() {
        try {
            await authApi.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
