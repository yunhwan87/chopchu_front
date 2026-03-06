import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useProjects } from '../src/hooks/useProjects';
import { Plus, Folder, LogOut } from 'lucide-react-native';
import { useAuth } from '../src/hooks/useAuth';
import { searchUsers } from '../src/api/profiles';
import { UserPlus, X, Search } from 'lucide-react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * 임시 프로젝트 선택 화면 (Temp)
 */
export const TempProjectSelectorScreen = ({ onSelectProject }) => {
    const { projects, loading, fetchProjects, addProject } = useProjects();
    const { logout } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);

    // 폼 상태
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [note, setNote] = useState('');

    // 멤버 검색 및 선택 상태
    const [memberQuery, setMemberQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searching, setSearching] = useState(false);

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    // 사용자 검색 로직
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (memberQuery.length >= 2) {
                setSearching(true);
                try {
                    const results = await searchUsers(memberQuery);
                    // 이미 선택된 멤버는 검색 결과에서 제외
                    setSearchResults(results.filter(r => !selectedMembers.some(sm => sm.id === r.id)));
                } catch (err) {
                    console.error('Search error:', err);
                } finally {
                    setSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [memberQuery, selectedMembers]);

    const handleCreateProject = async () => {
        if (!title.trim()) {
            Alert.alert('알림', '프로젝트 이름을 입력해주세요.');
            return;
        }

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        const result = await addProject({
            title: title.trim(),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalDays,
            note: note.trim(),
            memberIds: selectedMembers.map(m => m.id)
        });

        if (result.success) {
            setModalVisible(false);
            resetForm();
            Alert.alert('성공', '새 프로젝트가 생성되었습니다.');
        } else {
            Alert.alert('오류', result.error);
        }
    };

    const resetForm = () => {
        setTitle('');
        setStartDate(new Date());
        setEndDate(new Date());
        setNote('');
        setMemberQuery('');
        setSearchResults([]);
        setSelectedMembers([]);
    };

    const toggleMember = (user) => {
        if (selectedMembers.find(m => m.id === user.id)) {
            setSelectedMembers(selectedMembers.filter(m => m.id !== user.id));
        } else {
            setSelectedMembers([...selectedMembers, user]);
            setMemberQuery('');
            setSearchResults([]);
        }
    };

    const renderProjectItem = ({ item }) => (
        <TouchableOpacity
            style={styles.projectCard}
            onPress={() => onSelectProject(item)}
        >
            <View style={styles.iconContainer}>
                <Folder color="#4F46E5" size={24} />
            </View>
            <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>{item.title}</Text>
                <Text style={styles.projectSubtitle}>
                    {item.start_date ? `${item.start_date} ~ ` : ''}
                    {item.status === 'ongoing' ? '진행 중' : item.status === 'completed' ? '완료' : '보류'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>내 프로젝트 (Temp)</Text>
                    <Text style={styles.subtitle}>작업할 프로젝트를 선택하거나 새로 만드세요.</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <LogOut color="#64748B" size={20} />
                </TouchableOpacity>
            </View>

            {loading && projects.length === 0 ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={projects}
                    renderItem={renderProjectItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>참여 중인 프로젝트가 없습니다.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Plus color="#FFF" size={32} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>새 프로젝트 생성</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <X color="#64748B" size={24} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            style={{ width: '100%' }}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                <View style={{ width: '100%' }}>
                                    <View style={styles.formItem}>
                                        <Text style={styles.label}>프로젝트 이름</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="예: 파리 패션위크 촬영"
                                            value={title}
                                            onChangeText={setTitle}
                                        />
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.formItem, { flex: 1 }]}>
                                            <Text style={styles.label}>시작일</Text>
                                            <TouchableOpacity
                                                style={styles.dateSelector}
                                                onPress={() => setShowStartPicker(true)}
                                            >
                                                <Text>{startDate.toLocaleDateString()}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={[styles.formItem, { flex: 1, marginLeft: 12 }]}>
                                            <Text style={styles.label}>종료일</Text>
                                            <TouchableOpacity
                                                style={styles.dateSelector}
                                                onPress={() => setShowEndPicker(true)}
                                            >
                                                <Text>{endDate.toLocaleDateString()}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.formItem}>
                                        <Text style={styles.label}>참여 인원 검색</Text>
                                        <View style={styles.searchContainer}>
                                            <Search color="#94A3B8" size={18} style={styles.searchIcon} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="이메일 또는 닉네임 검색"
                                                value={memberQuery}
                                                onChangeText={setMemberQuery}
                                            />
                                            {searching && <ActivityIndicator size="small" color="#4F46E5" />}
                                        </View>

                                        {/* 검색 결과 */}
                                        {searchResults.length > 0 && (
                                            <View style={styles.searchResults}>
                                                {searchResults.map(user => (
                                                    <TouchableOpacity
                                                        key={user.id}
                                                        style={styles.searchResultItem}
                                                        onPress={() => toggleMember(user)}
                                                    >
                                                        <View style={styles.avatarPlaceholder}>
                                                            <Text style={styles.avatarText}>{user.nickname?.[0] || 'U'}</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.searchResultName}>{user.nickname || 'Unknown'}</Text>
                                                            <Text style={styles.searchResultEmail}>{user.email}</Text>
                                                        </View>
                                                        <UserPlus color="#4F46E5" size={20} />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}

                                        {/* 선택된 멤버 목록 */}
                                        {selectedMembers.length > 0 && (
                                            <View style={styles.selectedMembers}>
                                                {selectedMembers.map(user => (
                                                    <View key={user.id} style={styles.memberTag}>
                                                        <Text style={styles.memberTagText}>{user.nickname || user.email}</Text>
                                                        <TouchableOpacity onPress={() => toggleMember(user)}>
                                                            <X color="#FFF" size={14} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.formItem}>
                                        <Text style={styles.label}>비고 (Notes)</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            placeholder="프로젝트에 대한 추가 정보"
                                            value={note}
                                            onChangeText={setNote}
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>
                                </View>
                            }
                            ListFooterComponent={
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => {
                                            setModalVisible(false);
                                            resetForm();
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.confirmButton]}
                                        onPress={handleCreateProject}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#FFF" size="small" />
                                        ) : (
                                            <Text style={styles.confirmButtonText}>생성하기</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            }
                        />

                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                onChange={(event, date) => {
                                    setShowStartPicker(false);
                                    if (date) setStartDate(date);
                                }}
                            />
                        )}
                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                onChange={(event, date) => {
                                    setShowEndPicker(false);
                                    if (date) setEndDate(date);
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1E293B',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    logoutButton: {
        padding: 8,
        backgroundColor: '#FFF',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    listContainer: {
        paddingBottom: 100,
    },
    projectCard: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    projectInfo: {
        flex: 1,
    },
    projectTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    projectStatus: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '85%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
    },
    searchResults: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        marginTop: 8,
        maxHeight: 200,
        overflow: 'hidden',
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    searchResultName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    searchResultEmail: {
        fontSize: 12,
        color: '#64748B',
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#4F46E5',
        fontWeight: '700',
        fontSize: 12,
    },
    selectedMembers: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    memberTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F46E5',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    memberTagText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 6,
    },
    projectSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    input: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    formItem: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        width: '100%',
    },
    dateSelector: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        justifyContent: 'center',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F1F5F9',
    },
    confirmButton: {
        backgroundColor: '#4F46E5',
    },
    cancelButtonText: {
        color: '#64748B',
        fontWeight: '700',
    },
    confirmButtonText: {
        color: '#FFF',
        fontWeight: '700',
    },
});
