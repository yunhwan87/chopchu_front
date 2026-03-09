import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export const LoginForm = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        // 실제 서비스에서는 여기에 인증 로직이 들어갑니다.
        // 현재는 이메일이나 비밀번호 검증 없이 무조건 로그인 되도록 구현합니다.
        const nickname = email.includes("@") ? email.split("@")[0] : email;
        onLogin((nickname || "김제작").trim());
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>로그인하여 시작하기</Text>
            <Text style={styles.subtitle}>OnSync 데이터에 접근하려면 로그인하세요.</Text>

            <TextInput
                style={styles.input}
                placeholder="이메일 주소"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>로그인</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
                <Text style={styles.footerText}>계정이 없으신가요?</Text>
                <TouchableOpacity>
                    <Text style={styles.footerLink}>회원가입</Text>
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
});
