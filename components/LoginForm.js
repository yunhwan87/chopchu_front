import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../src/hooks/useAuth";
import { toKoreanErrorMessage } from "../src/utils/errorMessages";

export const LoginForm = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [isNicknameChecked, setIsNicknameChecked] = useState(false);
    const [checkingNickname, setCheckingNickname] = useState(false);
    const { login, register, checkNickname, loading } = useAuth();

    const handleCheckNickname = async () => {
        const trimmedNickname = nickname.trim();
        if (!trimmedNickname) {
            Alert.alert("알림", "닉네임을 입력해주세요.");
            return;
        }

        setCheckingNickname(true);
        const result = await checkNickname(trimmedNickname);
        setCheckingNickname(false);

        if (result.success) {
            if (result.isTaken) {
                Alert.alert("알림", "이미 사용 중인 닉네임입니다.");
                setIsNicknameChecked(false);
            } else {
                Alert.alert("성공", "사용 가능한 닉네임입니다.");
                setIsNicknameChecked(true);
            }
        } else {
            Alert.alert("오류", "중복 확인 중 문제가 발생했습니다.");
        }
    };

    const handleSubmit = async () => {
        if (!email || !password || (!isLogin && !nickname)) {
            Alert.alert("알림", isLogin ? "이메일과 비밀번호를 입력해주세요." : "이메일, 비밀번호, 닉네임을 모두 입력해주세요.");
            return;
        }

        if (!isLogin && !isNicknameChecked) {
            Alert.alert("알림", "이미 사용 중인 닉네임입니다.");
            return;
        }

        const result = isLogin
            ? await login(email, password)
            : await register(email, password, nickname);

        if (result.success) {
            if (isLogin) {
                onLogin();
            } else {
                Alert.alert("성공", "회원가입이 완료되었습니다. 이제 로그인해주세요.");
                setIsLogin(true);
            }
        } else {
            Alert.alert("오류", toKoreanErrorMessage(result.error, "로그인 또는 회원가입 중 문제가 발생했어요."));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isLogin ? "로그인하여 시작하기" : "새 계정 만들기"}</Text>
            <Text style={styles.subtitle}>
                {isLogin ? "OnSync 데이터에 접근하려면 로그인하세요." : "정보를 입력하여 가입하세요."}
            </Text>

            <TextInput
                style={styles.input}
                placeholder="이메일 주소"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
            />

            {!isLogin && (
                <View style={styles.nicknameContainer}>
                    <TextInput
                        style={[styles.input, styles.nicknameInput]}
                        placeholder="닉네임"
                        placeholderTextColor="#9CA3AF"
                        value={nickname}
                        onChangeText={(text) => {
                            setNickname(text);
                            setIsNicknameChecked(false);
                        }}
                        autoCapitalize="none"
                        editable={!loading && !checkingNickname}
                    />
                    <TouchableOpacity
                        style={[styles.checkButton, isNicknameChecked && styles.checkButtonSuccess]}
                        onPress={handleCheckNickname}
                        disabled={loading || checkingNickname}
                    >
                        {checkingNickname ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.checkButtonText}>
                                {isNicknameChecked ? "확인됨" : "중복확인"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
            <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.buttonText}>{isLogin ? "로그인" : "회원가입"}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
                <Text style={styles.footerText}>
                    {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                    <Text style={styles.footerLink}>{isLogin ? "회원가입" : "로그인"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFF",
        padding: 24,
        borderRadius: 24,
        width: "100%",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1E293B",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 24,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#1E293B",
        marginBottom: 16,
    },
    button: {
        backgroundColor: "#4F46E5",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
    },
    buttonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    buttonDisabled: {
        backgroundColor: "#A5B4FC",
    },
    forgotPassword: {
        alignItems: "center",
        marginTop: 16,
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: "#4F46E5",
        fontSize: 14,
        fontWeight: "600",
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "center",
    },
    footerText: {
        color: "#64748B",
        fontSize: 14,
        marginRight: 6,
    },
    footerLink: {
        color: "#4F46E5",
        fontSize: 14,
        fontWeight: "700",
    },
    nicknameContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    nicknameInput: {
        flex: 1,
        marginBottom: 0,
        marginRight: 8,
    },
    checkButton: {
        backgroundColor: "#4F46E5",
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        minWidth: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    checkButtonSuccess: {
        backgroundColor: "#10B981",
    },
    checkButtonText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "600",
    },
});
