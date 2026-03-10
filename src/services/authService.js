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
    async register(email, password, nickname) {
        try {
            const data = await authApi.signUp(email, password, nickname);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Signup Service Error Details:', error);

            let errorMessage = error.message;

            // Supabase Auth의 기본 에러들 처리
            if (errorMessage === "User already registered") {
                errorMessage = "이미 가입된 이메일 주소입니다. 다른 이메일을 사용하거나 로그인을 해주세요.";
            } else if (errorMessage === "Signup confirmed") {
                errorMessage = "가입 승인이 필요하거나 이미 가입된 계정입니다.";
            } else if (errorMessage.includes("nickname") || errorMessage.includes("profiles")) {
                // DB 제약 조건이나 트리거 등으로 인한 닉네임 오류 발생 시
                errorMessage = "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.";
            }

            return { success: false, error: errorMessage };
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
    },

    /**
     * 닉네임 중복 확인
     */
    async checkNickname(nickname) {
        try {
            const isTaken = await authApi.checkNickname(nickname);
            return { success: true, isTaken };
        } catch (error) {
            console.error('Check Nickname Service Error:', error.message);
            return { success: false, error: error.message };
        }
    }
};
