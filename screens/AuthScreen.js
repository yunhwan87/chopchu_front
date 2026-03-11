import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Animated,
    StyleSheet,
    Dimensions,
    Platform,
} from "react-native";
import { LoginForm } from "../components/LoginForm";

const { height, width } = Dimensions.get("window");

export const AuthScreen = ({ onLogin }) => {
    const [showLogin, setShowLogin] = useState(false);

    // 애니메이션용 값 (크기 1 => 0.7, Y값 중앙(0) => 위로 이동(-height/3))
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;

    // 폼 투명도용 애니메이션
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // 컴포넌트 마운트 시 애니메이션 로직
    useEffect(() => {
        // 처음에 로고가 대기하는 시간 (예: 1.5초)
        const initTimer = setTimeout(() => {
            // 대기 후, 병렬 애니메이션 시작
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(translateYAnim, {
                    toValue: -height * 0.32, // 더 높이 이동 (-0.25 -> -0.32)
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // 이동이 끝나거나 진행되는 도중에 폼 보여주기 시작
                setShowLogin(true);
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }).start();
            });
        }, 1500); // 1.5초 로딩 타임

        return () => clearTimeout(initTimer);
    }, []);

    return (
        <View style={styles.container}>
            {/* OnSync 로고 컨테이너 */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        transform: [
                            { translateY: translateYAnim },
                            { scale: scaleAnim },
                        ],
                    },
                ]}
            >
                <Text style={styles.brandTitle}>OnSync</Text>
                <Text style={styles.subTitle}>완벽한 촬영의 시작</Text>
            </Animated.View>

            {/* 로그인 폼 컨테이너 (opacity로 페이드인) */}
            <Animated.View style={[styles.formContainer, { opacity: opacityAnim }]}>
                {showLogin && <LoginForm onLogin={onLogin} />}
            </Animated.View>

            {/* 배경 장식 원 (디자인 포인트) */}
            <View style={[styles.bgCircle, styles.circleOne]} />
            <View style={[styles.bgCircle, styles.circleTwo]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#EEF2FF", // 전체 배경색
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden", // 디자인 원 삐져나가지 않게
    },
    logoContainer: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    brandTitle: {
        fontSize: 60,
        fontWeight: "900",
        color: "#4F46E5",
        letterSpacing: -2,
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            },
            android: {
                elevation: 5,
                textShadowColor: "rgba(79, 70, 229, 0.3)",
                textShadowOffset: { width: 0, height: 10 },
                textShadowRadius: 15,
            },
        }),
    },
    subTitle: {
        fontSize: 18,
        color: "#6366F1",
        fontWeight: "700",
        letterSpacing: 2,
    },
    formContainer: {
        width: "100%",
        paddingHorizontal: 20,
        marginTop: height * 0.2, // 폼을 더 아래로 밀기 (0.1 -> 0.2)
        zIndex: 20,
    },
    // 배경 디자인용 원
    bgCircle: {
        position: "absolute",
        borderRadius: 500,
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        zIndex: 1, // 배경이므로 로고/폼보다 뒤
    },
    circleOne: {
        width: 300,
        height: 300,
        top: -100,
        right: -50,
    },
    circleTwo: {
        width: width * 1.5,
        height: width * 1.5,
        bottom: -width * 0.8,
        left: -width * 0.3,
        backgroundColor: "rgba(79, 70, 229, 0.05)",
    },
});
