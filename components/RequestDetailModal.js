import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { User, X, Send, ChevronDown } from "lucide-react-native";
import { useAuth } from "../src/hooks/useAuth";
import { useRequests } from "../src/hooks/useRequests";
import { summarizeRequestToLocation } from "../src/services/summarizeService";
import { toKoreanErrorMessage } from "../src/utils/errorMessages";

const STATUS_OPTIONS = [
    { value: "pending", label: "요청 확인 대기 중", bg: "#FFF7ED", text: "#EA580C" },
    { value: "in_progress", label: "해결 중", bg: "#EFF6FF", text: "#3B82F6" },
    { value: "need_info", label: "추가확인", bg: "#FEF2F2", text: "#EF4444" },
    { value: "resolved", label: "해결완료", bg: "#F0FDF4", text: "#16A34A" },
];

export const RequestDetailModal = ({ visible, onClose, request, type, onRefresh, project }) => {
    const { user } = useAuth();
    const { getThread, replyToRequest, changeStatus } = useRequests();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(request?.status || "pending");
    const [aiSummarizing, setAiSummarizing] = useState(false);

    useEffect(() => {
        if (visible && request) {
            setCurrentStatus(request.status);
            loadMessages();

            // 받은 사람이고 상태가 대기 중이면 자동으로 해결 중으로 변경
            if (type === 'received' && request.status === 'pending') {
                handleAutoInProgress();
            }
        }
    }, [visible, request]);

    const handleAutoInProgress = async () => {
        const { data, error } = await changeStatus(request.id, 'in_progress');
        if (!error && !data?.error) {
            setCurrentStatus('in_progress');
            if (onRefresh) onRefresh();
        } else if (error) {
            Alert.alert("오류", toKoreanErrorMessage(error, "상태 변경에 실패했어요."));
        }
    }

    const loadMessages = async () => {
        setLoading(true);
        const { data } = await getThread(request.id);
        if (data) setMessages(data);
        setLoading(false);
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;

        const { data, error } = await replyToRequest(request.id, user.id, replyText.trim());
        if (data && !error) {
            setMessages([...messages, data]);
            setReplyText("");
        } else if (error) {
            Alert.alert("오류", toKoreanErrorMessage(error, "답변 전송에 실패했어요."));
        }
    };

    const handleStatusChange = async (newStatusValue) => {
        const { data, error } = await changeStatus(request.id, newStatusValue);
        if (!error && !data?.error) {
            setCurrentStatus(newStatusValue);
            setShowStatusMenu(false);
            // 부모 컴포넌트의 리스트 갱신은 useRequests 훅 안에서 낙관적 업데이트됨
        } else if (error) {
            Alert.alert("오류", toKoreanErrorMessage(error, "상태 변경에 실패했어요."));
        }
    };

    if (!request) return null;

    const statusInfo = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0];
    // 받은 쪽(담당자)이거나, 아직 보낸 쪽도 status를 바꿀 수 있다면 권한 부여
    // (정책상 누구나 바꿀 수 있지만, UI에서는 '내가 받은 요청'일 때 주로 변경)
    const canEditStatus = type === 'received';
    // 보낸 쪽(요청자)은 명시적으로 "해결 완료" 및 "되돌리기" 버튼을 사용할 수 있음
    const isSender = request.sender_id === user?.id;
    const canResolve = isSender && currentStatus !== 'resolved';
    const canUndoResolve = isSender && currentStatus === 'resolved';

    const handleResolveConfirm = () => {
        Alert.alert(
            "요청 해결 확인",
            "이 요청이 완전히 해결되었나요?\n해결 완료 처리 후 관련된 섭외지가 있다면 AI가 자동으로 요약을 추가합니다.",
            [
                { text: "아니요", style: "cancel" },
                {
                    text: "네, 해결되었습니다",
                    onPress: async () => {
                        setAiSummarizing(true);
                        try {
                            const result = await summarizeRequestToLocation(project.id, request, messages);
                            if (result.success) {
                                if (result.locationName) {
                                    alert(`[AI 요약 완료]\n'${result.locationName}' 섭외지에 자동 요약이 추가되었습니다.\n\n${result.summary}`);
                                } else {
                                    alert(`[요청 해결]\n${result.summary}`);
                                }
                            } else {
                                console.log("AI 요약 생략:", result.reason);
                            }
                        } catch (error) {
                            console.error("AI 요약 실패:", error);
                        } finally {
                            setAiSummarizing(false);
                            handleStatusChange("resolved");
                        }
                    }
                }
            ]
        );
    };

    const handleUndoResolve = () => {
        Alert.alert(
            "해결 상태 되돌리기",
            "이 요청을 다시 진행 중 상태로 되돌리시겠습니까?",
            [
                { text: "취소", style: "cancel" },
                { text: "되돌리기", onPress: () => handleStatusChange("in_progress") }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            {aiSummarizing && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.loadingText}>AI가 대화 내용을 요약하고 있습니다...</Text>
                </View>
            )}
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>요청 상세</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* 요청 정보 요약 및 상태 변경 */}
                <View style={styles.infoBox}>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>보낸 사람: {request.sender?.nickname || request.sender?.email || "알 수 없음"}</Text>
                        <Text style={styles.infoLabel}>받는 사람: {request.receiver?.nickname || request.receiver?.email || "알 수 없음"}</Text>
                    </View>

                    <View style={styles.statusWrap}>
                        <Text style={styles.infoLabel}>현재 상태:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                            {canEditStatus ? (
                                <TouchableOpacity
                                    style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}
                                    onPress={() => setShowStatusMenu(!showStatusMenu)}
                                >
                                    <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                                    <ChevronDown size={14} color={statusInfo.text} style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                                    <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                                </View>
                            )}

                            {canResolve && (
                                <TouchableOpacity style={styles.resolveBtn} onPress={handleResolveConfirm}>
                                    <Text style={styles.resolveBtnText}>해결 완료 표시</Text>
                                </TouchableOpacity>
                            )}

                            {canUndoResolve && (
                                <TouchableOpacity style={styles.undoBtn} onPress={handleUndoResolve}>
                                    <Text style={styles.undoBtnText}>해결 되돌리기</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* 상태 변경 메뉴 */}
                    {showStatusMenu && canEditStatus && (
                        <View style={styles.statusMenu}>
                            {STATUS_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={styles.statusMenuItem}
                                    onPress={() => handleStatusChange(opt.value)}
                                >
                                    <Text style={[styles.statusText, { color: opt.text }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* 스레드 영역 */}
                <ScrollView style={styles.threadContainer} contentContainerStyle={{ padding: 20 }}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <View key={msg.id || index} style={[styles.messageRow, isMe ? styles.messageMe : styles.messageOther]}>
                                    {!isMe && (
                                        <View style={styles.avatar}>
                                            <User size={16} color="#64748B" />
                                        </View>
                                    )}
                                    <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                                        {!isMe && <Text style={styles.senderName}>{msg.sender?.nickname || msg.sender?.email}</Text>}
                                        <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
                                            {msg.content}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* 입력창 */}
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        placeholder="답변이나 추가 내용을 입력하세요..."
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
                        onPress={handleSendReply}
                        disabled={!replyText.trim()}
                    >
                        <Send size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
    },
    loadingText: {
        color: "#FFF",
        marginTop: 12,
        fontSize: 15,
        fontWeight: "600",
    },
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
    closeBtn: { padding: 4 },
    infoBox: {
        backgroundColor: "#FFF",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        zIndex: 10,
    },
    requestTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 12 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    infoLabel: { fontSize: 13, color: "#64748B", fontWeight: "500" },
    statusWrap: { flexDirection: "row", alignItems: "center" },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 10,
    },
    statusText: { fontSize: 13, fontWeight: "700" },
    statusMenu: {
        position: "absolute",
        bottom: -150,
        left: 80,
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 100,
    },
    statusMenuItem: { paddingVertical: 10, paddingHorizontal: 16 },
    resolveBtn: {
        backgroundColor: "#16A34A",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    resolveBtnText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "700",
    },
    undoBtn: {
        backgroundColor: "#FFF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    undoBtnText: {
        color: "#64748B",
        fontSize: 12,
        fontWeight: "700",
    },

    threadContainer: { flex: 1 },
    messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
    messageMe: { justifyContent: "flex-end" },
    messageOther: { justifyContent: "flex-start" },
    avatar: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: "#E2E8F0",
        justifyContent: "center", alignItems: "center", marginRight: 8,
    },
    messageBubble: { padding: 14, borderRadius: 16, maxWidth: "75%" },
    bubbleMe: { backgroundColor: "#4F46E5", borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: "#FFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E2E8F0" },
    senderName: { fontSize: 12, color: "#94A3B8", marginBottom: 4, fontWeight: "600" },
    messageText: { fontSize: 14, lineHeight: 20 },
    textMe: { color: "#FFF" },
    textOther: { color: "#1E293B" },

    inputArea: {
        flexDirection: "row",
        padding: 16,
        backgroundColor: "#FFF",
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        alignItems: "center",
    },
    input: {
        flex: 1,
        backgroundColor: "#F1F5F9",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 10,
        maxHeight: 100,
        fontSize: 15,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: "#4F46E5",
        justifyContent: "center", alignItems: "center", marginLeft: 12,
    },
    sendBtnDisabled: { backgroundColor: "#CBD5E1" }
});
