import * as authApi from '../api/auth';
import { toKoreanErrorMessage } from '../utils/errorMessages';

const translateSignupError = (rawMessage = '') => {
    const message = String(rawMessage || '');
    const normalized = message.toLowerCase();

    if (message === 'User already registered') {
        return '이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 입력해 주세요.';
    }

    if (message === 'Signup confirmed') {
        return '이미 가입이 완료된 계정이에요. 로그인해 주세요.';
    }

    if (
        normalized.includes('unable to validate email address') ||
        normalized.includes('invalid email') ||
        normalized.includes('email address is invalid') ||
        normalized.includes('email format')
    ) {
        return '이메일 형식이 올바르지 않아요. 예: name@example.com';
    }

    if (
        normalized.includes('password') &&
        (normalized.includes('at least') || normalized.includes('should be at least') || normalized.includes('weak'))
    ) {
        return '비밀번호가 너무 짧거나 약해요. 6자 이상으로 입력해 주세요.';
    }

    if (normalized.includes('already been registered') || normalized.includes('already exists')) {
        return '이미 사용 중인 이메일이에요. 다른 이메일을 입력해 주세요.';
    }

    if (normalized.includes('nickname') || normalized.includes('profiles')) {
        return '이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.';
    }

    if (normalized.includes('network') || normalized.includes('fetch failed') || normalized.includes('failed to fetch')) {
        return '네트워크가 불안정해요. 잠시 후 다시 시도해 주세요.';
    }

    if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
        return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    }

    return toKoreanErrorMessage(message, '회원가입 중 문제가 발생했어요. 입력 정보를 확인한 뒤 다시 시도해 주세요.');
};

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
            return { success: false, error: toKoreanErrorMessage(error, '로그인에 실패했어요. 이메일과 비밀번호를 확인해 주세요.') };
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
            return { success: false, error: translateSignupError(error?.message) };
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
            return { success: false, error: toKoreanErrorMessage(error, '로그아웃 중 문제가 발생했어요.') };
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
            return { success: false, error: toKoreanErrorMessage(error, '닉네임 중복 확인 중 문제가 발생했어요.') };
        }
    }
};
