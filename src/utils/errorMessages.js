const HANGUL_REGEX = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

export const extractErrorMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
    if (typeof error?.error_description === 'string') return error.error_description;
    if (typeof error?.details === 'string') return error.details;
    return String(error);
};

export const toKoreanErrorMessage = (
    error,
    fallback = '요청을 처리하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
) => {
    const message = extractErrorMessage(error).trim();
    if (!message) return fallback;
    if (HANGUL_REGEX.test(message)) return message;

    const normalized = message.toLowerCase();

    if (
        normalized.includes('network') ||
        normalized.includes('failed to fetch') ||
        normalized.includes('fetch failed') ||
        normalized.includes('timeout')
    ) {
        return '네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요.';
    }

    if (
        normalized.includes('user not authenticated') ||
        normalized.includes('no user logged in') ||
        normalized.includes('jwt') ||
        normalized.includes('not authenticated')
    ) {
        return '로그인이 필요해요. 다시 로그인해 주세요.';
    }

    if (
        normalized.includes('invalid login credentials') ||
        normalized.includes('invalid credentials')
    ) {
        return '이메일 또는 비밀번호가 맞지 않아요. 다시 확인해 주세요.';
    }

    if (
        normalized.includes('email not confirmed') ||
        normalized.includes('email not verified')
    ) {
        return '이메일 인증이 필요해요. 메일함에서 인증 후 다시 시도해 주세요.';
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
        (normalized.includes('at least') || normalized.includes('too short') || normalized.includes('weak'))
    ) {
        return '비밀번호가 너무 짧거나 약해요. 6자 이상으로 입력해 주세요.';
    }

    if (
        normalized.includes('already registered') ||
        normalized.includes('already exists') ||
        normalized.includes('duplicate key')
    ) {
        return '이미 사용 중인 정보가 있어요. 입력값을 확인해 주세요.';
    }

    if (normalized.includes('nickname') || normalized.includes('profiles')) {
        return '이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.';
    }

    if (
        normalized.includes('permission denied') ||
        normalized.includes('row-level security') ||
        normalized.includes('not allowed')
    ) {
        return '해당 작업 권한이 없어요. 권한을 확인해 주세요.';
    }

    if (
        normalized.includes('rate limit') ||
        normalized.includes('too many requests')
    ) {
        return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    }

    return fallback;
};
