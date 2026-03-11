import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { getProjectDetails } from '../src/api/projects';
import { createChatRoom } from '../src/api/chat';
import { useAuth } from '../src/hooks/useAuth';

export const ChatCreationModal = ({ visible, onClose, project, onCreated }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (visible && project) {
            loadMembers();
            setSelectedMembers([]);
            setRoomName('');
        }
    }, [visible, project]);

    const loadMembers = async () => {
        try {
            setFetching(true);
            const data = await getProjectDetails(project.id);
            if (data && data.project_members) {
                // 본인 제외
                const otherMembers = data.project_members.filter(m => m.user_id !== user.id);
                setMembers(otherMembers);
            }
        } catch (error) {
            console.error('멤버 불러오기 실패:', error.message);
        } finally {
            setFetching(false);
        }
    };

    const toggleMember = (memberId) => {
        if (selectedMembers.includes(memberId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== memberId));
        } else {
            setSelectedMembers([...selectedMembers, memberId]);
        }
    };

    const handleCreate = async () => {
        if (!roomName.trim()) {
            alert('채팅방 이름을 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            // 생성자도 멤버에 포함해야 함
            const memberIds = [user.id, ...selectedMembers];
            const newRoom = await createChatRoom(project.id, roomName, memberIds);
            onCreated(newRoom);
        } catch (error) {
            alert('채팅방 생성에 실패했습니다.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderMember = ({ item }) => {
        const isSelected = selectedMembers.includes(item.user_id);
        const nickname = item.profiles?.nickname || item.profiles?.email?.split('@')[0] || '알 수 없는 사용자';

        return (
            <TouchableOpacity
                style={styles.memberItem}
                onPress={() => toggleMember(item.user_id)}
                activeOpacity={0.7}
            >
                <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{nickname.substring(0, 1)}</Text>
                </View>
                <Text style={styles.memberName}>{nickname}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={16} color="#FFF" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>새 채팅방 만들기</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>채팅방 이름</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="채팅방 이름을 입력하세요"
                            value={roomName}
                            onChangeText={setRoomName}
                            maxLength={30}
                        />
                    </View>

                    <View style={styles.membersArea}>
                        <Text style={styles.label}>대화상대 선택 ({selectedMembers.length}명)</Text>
                        {fetching ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />
                        ) : members.length === 0 ? (
                            <Text style={styles.emptyText}>초대할 수 있는 멤버가 없습니다.</Text>
                        ) : (
                            <FlatList
                                data={members}
                                keyExtractor={(item) => item.user_id}
                                renderItem={renderMember}
                                style={styles.memberList}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.createBtn, (!roomName.trim() || loading) && styles.createBtnDisabled]}
                            onPress={handleCreate}
                            disabled={!roomName.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.createBtnText}>채팅방 생성</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    closeBtn: {
        position: 'absolute',
        right: 0,
        padding: 5,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1E293B',
    },
    membersArea: {
        flex: 1,
    },
    memberList: {
        flex: 1,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    memberAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
    },
    memberName: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    emptyText: {
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 20,
    },
    footer: {
        marginTop: 10,
        paddingBottom: 20,
    },
    createBtn: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    createBtnDisabled: {
        backgroundColor: '#E2E8F0',
    },
    createBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
