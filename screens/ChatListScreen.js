import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Plus, MessageSquare } from 'lucide-react-native';
import { fetchChatRooms } from '../src/api/chat';
import { ChatCreationModal } from '../components/ChatCreationModal';

export const ChatListScreen = ({ project, onEnterRoom }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    const loadRooms = async () => {
        try {
            setLoading(true);
            // 모든 채팅방을 가져오기 위해 인자 없이 호출 (유저 요청)
            const data = await fetchChatRooms();
            setRooms(data);
        } catch (error) {
            console.error('채팅방 불러오기 실패:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRooms();
    }, []);

    const renderItem = ({ item }) => {
        const lastMessage = item.messages && item.messages.length > 0 ? item.messages[0].content : '빈 채팅방에 대화를 시작해보세요';
        const date = item.updated_at ? new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const memberCount = item.chat_room_members ? item.chat_room_members.length : 0;
        const projectTitle = item.projects?.title;

        return (
            <TouchableOpacity
                style={styles.roomItem}
                onPress={() => onEnterRoom(item)}
            >
                <View style={styles.roomAvatar}>
                    <MessageSquare size={24} color="#64748B" />
                </View>
                <View style={styles.roomInfo}>
                    <View style={styles.roomHeader}>
                        <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.memberCount}>{memberCount}</Text>
                        <View style={{ flex: 1 }} />
                        <View style={styles.timeContainer}>
                            {projectTitle && (
                                <Text style={styles.projectText} numberOfLines={1}>
                                    {projectTitle}
                                </Text>
                            )}
                            <Text style={styles.timeText}>{date}</Text>
                        </View>
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={2}>
                        {lastMessage}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
            ) : rooms.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>참여 중인 채팅방이 없습니다.</Text>
                    <Text style={styles.emptySubText}>우측 하단의 + 버튼을 눌러 새 채팅방을 만들어보세요.</Text>
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={loadRooms}
                />
            )}

            {/* 새 채팅방 버튼 */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Plus size={24} color="#FFF" />
            </TouchableOpacity>

            <ChatCreationModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                project={project}
                onCreated={(newRoom) => {
                    setModalVisible(false);
                    onEnterRoom(newRoom);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    listContent: { paddingBottom: 100 },
    roomItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    roomAvatar: {
        width: 50,
        height: 50,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    roomInfo: { flex: 1 },
    roomHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    roomName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        maxWidth: '50%',
    },
    memberCount: {
        fontSize: 13,
        color: '#94A3B8',
        marginLeft: 6,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    projectText: {
        fontSize: 11,
        color: '#6366F1', // Indigo color for project name visibility
        fontWeight: '600',
        marginBottom: 2,
        maxWidth: 100,
    },
    timeText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    lastMessage: {
        fontSize: 14,
        color: '#64748B',
    },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#475569', fontSize: 16, fontWeight: '600', marginBottom: 8 },
    emptySubText: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 120, // 바텀 네비게이션 공간 + 여백 추가 (요청 페이지와 동일하게 수정)
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4F46E5', // 테마 파란색으로 변경
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    }
});
