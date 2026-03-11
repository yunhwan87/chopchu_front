import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { X, User } from "lucide-react-native";
import { useAuth } from "../src/hooks/useAuth";
import { useRequests } from "../src/hooks/useRequests";
import { supabase } from "../src/lib/supabase";
import { toKoreanErrorMessage } from "../src/utils/errorMessages";

export const NewRequestModal = ({ visible, onClose, project, onCreated }) => {
    const { user } = useAuth();
    const { createNewRequest } = useRequests();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    // 팀원 목록 (수신자 선택용)
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedReceiver, setSelectedReceiver] = useState(null);

    useEffect(() => {
        if (visible && project) {
            fetchTeamMembers();
        } else {
            // 초기화
            setTitle("");
            setContent("");
            setSelectedReceiver(null);
        }
    }, [visible, project]);

    const fetchTeamMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('project_members')
                .select(`
          user_id,
          profiles:user_id(nickname, email)
        `)
                .eq('project_id', project.id);

            if (!error && data) {
                // 본인 제외
                const others = data.filter(m => m.user_id !== user.id).map(m => ({
                    id: m.user_id,
                    nickname: m.profiles?.nickname || m.profiles?.email
                }));
                setTeamMembers(others);
            }
        } catch (err) {
            console.error("Failed to fetch team members", err);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim() || !selectedReceiver) return;

        setLoading(true);
        const { data, error } = await createNewRequest({
            projectId: project.id,
            senderId: user.id,
            receiverId: selectedReceiver.id,
            title: title.trim(),
            content: content.trim()
        });
        setLoading(false);

        if (!error && data) {
            onCreated();
            onClose();
        } else {
            Alert.alert("오류", toKoreanErrorMessage(error, "요청 생성에 실패했어요."));
        }
    };

    const isFormValid = title.trim() && content.trim() && selectedReceiver;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>새 요청 작성</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!isFormValid || loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#4F46E5" />
                        ) : (
                            <Text style={[styles.submitText, !isFormValid && styles.submitDisabled]}>전송</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.label}>받는 사람 (담당자)</Text>
                    <View style={styles.memberList}>
                        {teamMembers.length === 0 ? (
                            <Text style={styles.emptyText}>선택 가능한 팀원이 없습니다.</Text>
                        ) : (
                            teamMembers.map(member => (
                                <TouchableOpacity
                                    key={member.id}
                                    style={[styles.memberBadge, selectedReceiver?.id === member.id && styles.memberActive]}
                                    onPress={() => setSelectedReceiver(member)}
                                >
                                    <User size={14} color={selectedReceiver?.id === member.id ? "#FFF" : "#64748B"} />
                                    <Text style={[styles.memberBadgeText, selectedReceiver?.id === member.id && styles.memberActiveText]}>
                                        {member.nickname}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    <Text style={styles.label}>제목</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="어떤 요청인가요? (예: 장소 섭외 확인)"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>상세 내용</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="요청할 내용이나 질문을 상세히 적어주세요."
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFF" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
    closeBtn: { padding: 4 },
    submitText: { fontSize: 16, fontWeight: "700", color: "#4F46E5" },
    submitDisabled: { color: "#CBD5E1" },

    content: { padding: 20 },
    label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8, marginTop: 16 },

    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: "#1E293B",
    },
    textArea: { height: 150, paddingTop: 16 },

    memberList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    memberBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "transparent"
    },
    memberActive: {
        backgroundColor: "#4F46E5",
    },
    memberBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginLeft: 4,
    },
    memberActiveText: { color: "#FFF" },
    emptyText: { color: "#94A3B8", fontSize: 13 }
});
