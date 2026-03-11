import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert
} from 'react-native';
import { ArrowLeft, Send, Search, X, Calendar as CalendarIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { fetchMessages, sendMessage } from '../src/api/chat';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/lib/supabase';
import { summarizeChatByDate } from '../src/services/summarizeService';
import { toKoreanErrorMessage } from '../src/utils/errorMessages';

// 캘린더 한국어 화
LocaleConfig.locales['ko'] = {
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

export const ChatRoomScreen = ({ room, project, onBack }) => {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [summarizing, setSummarizing] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    // 검색 관련 상태
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchDate, setSearchDate] = useState(null);

    const flatListRef = useRef(null);

    useEffect(() => {
        loadMessages();

        // Supabase Realtime Subscription setup
        const subscription = supabase
            .channel(`chat_room_${room.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `room_id=eq.${room.id}`
            }, (payload) => {
                // 새로 들어온 메시지를 상태에 추가 (본인이 보낸 메시지는 로컬에서 먼저 추가할 수 있으므로 중복 체크 필요)
                const newMessage = payload.new;
                setMessages(prev => {
                    if (prev.find(m => m.id === newMessage.id)) return prev;

                    // 작성자 정보를 위해 다시 fetch하거나 현재 캐시된 정보 활용
                    // 이 예제에서는 간략하게 로컬에 추가
                    return [...prev, newMessage];
                });

                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [room.id]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const data = await fetchMessages(room.id);
            setMessages(data);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
        } catch (error) {
            console.error('메시지 불러오기 실패:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const content = inputText.trim();
        setInputText(''); // 인풋 초기화

        try {
            await sendMessage(room.id, user.id, content);
            // 메시지는 Supabase Realtime subscription을 통해 자동으로 화면에 추가됩니다.
        } catch (error) {
            alert('메시지 전송 실패');
            console.error(error);
            // 에러 시 temp 메시지 삭제 로직 필요
        }
    };

    const handleDateSelect = async (day) => {
        // AI 요약을 바로 실행하지 않고, 해당 날짜로 대화를 필터링만 함
        setSearchDate(day.dateString);
        setShowCalendar(false);
        setIsSearchMode(true); // 검색 모드 함께 활성화 (UI 통일성)
    };

    const handleSummarizeDate = async () => {
        if (!searchDate) return;

        Alert.alert(
            "대화 요약",
            `해당 날짜(${searchDate})의 대화를 요약하시겠습니까?`,
            [
                { text: "아니오", style: "cancel" },
                {
                    text: "예",
                    onPress: async () => {
                        try {
                            setSummarizing(true);
                            const summary = await summarizeChatByDate(room.id, searchDate);
                            alert(`[${searchDate} 요약 결과]\n\n${summary}`);
                        } catch (error) {
                            alert(toKoreanErrorMessage(error, "요약을 불러오는 중 문제가 발생했어요."));
                        } finally {
                            setSummarizing(false);
                        }
                    }
                }
            ]
        );
    };

    // 메시지가 있는 날짜 계산
    const markedDates = {};
    messages.forEach(m => {
        const dateStr = m.created_at.split('T')[0];
        markedDates[dateStr] = {
            marked: true,
            dotColor: '#4F46E5', // 메시지가 있는 날은 파란 점 표시
            activeOpacity: 0.8
        };
    });

    // 검색어 및 날짜 필터링
    let filteredMessages = messages;

    if (searchKeyword.trim()) {
        filteredMessages = filteredMessages.filter(m => m.content.includes(searchKeyword.trim()));
    }

    if (searchDate) {
        filteredMessages = filteredMessages.filter(m => m.created_at.startsWith(searchDate));
    }

    const renderMessage = ({ item }) => {
        const isMe = item.sender_id === user?.id;
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                {!isMe && (
                    <View style={styles.senderAvatar}>
                        <Text style={styles.senderAvatarText}>
                            {item.profiles?.nickname ? item.profiles.nickname.substring(0, 1) : '?'}
                        </Text>
                    </View>
                )}
                <View style={styles.messageContent}>
                    {!isMe && <Text style={styles.senderName}>{item.profiles?.nickname || '알 수 없음'}</Text>}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                            {item.content}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>{time}</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 115 : 20}
        >
            {/* 커스텀 헤더 */}
            <View style={styles.header}>
                {isSearchMode ? (
                    <View style={styles.searchHeaderArea}>
                        <TouchableOpacity
                            onPress={() => {
                                setIsSearchMode(false);
                                setSearchKeyword('');
                                setSearchDate(null);
                            }}
                            style={styles.backBtn}
                        >
                            <ArrowLeft size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="대화 내용 검색"
                            value={searchKeyword}
                            onChangeText={setSearchKeyword}
                            autoFocus
                        />
                        {searchKeyword.trim() ? (
                            <TouchableOpacity onPress={() => setSearchKeyword('')} style={{ marginHorizontal: 8 }}>
                                <X size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.calendarIconBtn}>
                            <CalendarIcon size={22} color="#4F46E5" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{room.name}</Text>
                        <TouchableOpacity
                            style={styles.summarizeBtn}
                            onPress={() => setIsSearchMode(true)}
                        >
                            <Search size={16} color="#4F46E5" />
                            <Text style={styles.summarizeText}>대화 검색</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <View style={styles.chatArea}>
                {/* 날짜 검색 활성화 시 표시되는 배너 */}
                {searchDate && (
                    <View style={styles.dateFilterBanner}>
                        <Text style={styles.dateFilterText}>{searchDate} 대화</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                                style={[styles.inlineSummarizeBtn, summarizing && { opacity: 0.5 }]}
                                onPress={handleSummarizeDate}
                                disabled={summarizing}
                            >
                                {summarizing ? (
                                    <ActivityIndicator size="small" color="#4F46E5" />
                                ) : (
                                    <Text style={styles.inlineSummarizeText}>해당 일자 요약</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setSearchDate(null)} style={{ marginLeft: 8 }}>
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#4F46E5" />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={filteredMessages}
                        keyExtractor={item => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TextInput
                    style={styles.input}
                    placeholder="메시지를 입력하세요..."
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                >
                    <Send size={20} color={inputText.trim() ? "#FFF" : "#94A3B8"} />
                </TouchableOpacity>
            </View>

            {/* AI 요약 캘린더 모달 */}
            <Modal visible={showCalendar} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.calendarContainer}>
                        <View style={styles.calendarHeader}>
                            <Text style={styles.calendarTitle}>요약할 날짜를 선택하세요</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Calendar
                            current={new Date().toISOString().split('T')[0]}
                            markedDates={markedDates}
                            onDayPress={handleDateSelect}
                            theme={{
                                todayTextColor: '#EA580C',
                                arrowColor: '#4F46E5',
                                dotColor: '#4F46E5',
                                selectedDayBackgroundColor: '#4F46E5',
                                selectedDayTextColor: '#ffffff',
                                textDayFontWeight: '500',
                            }}
                            // 대화가 없는 날은 연하게(비활성화) 보이도록 처리
                            dayComponent={({ date, state }) => {
                                const hasMessages = markedDates[date.dateString];
                                const isToday = date.dateString === new Date().toISOString().split('T')[0];
                                return (
                                    <TouchableOpacity
                                        onPress={() => handleDateSelect(date)}
                                        style={{
                                            padding: 8,
                                            alignItems: 'center',
                                            opacity: hasMessages ? 1 : 0.3 // 메시지 없으면 투명도 30%
                                        }}
                                    >
                                        <Text style={{
                                            textAlign: 'center',
                                            color: isToday ? '#EA580C' : (state === 'disabled' ? 'gray' : '#1E293B'),
                                            fontWeight: hasMessages ? 'bold' : 'normal'
                                        }}>
                                            {date.day}
                                        </Text>
                                        {hasMessages && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#4F46E5', marginTop: 2 }} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#B2C7D9' }, // 카카오톡 배경색과 비슷한 톤
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        elevation: 2,
    },
    backBtn: { marginRight: 16 },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    summarizeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    summarizeText: {
        marginLeft: 4,
        color: '#4F46E5',
        fontWeight: '600',
        fontSize: 12,
    },
    inlineSummarizeBtn: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    inlineSummarizeText: {
        color: '#4F46E5',
        fontSize: 12,
        fontWeight: '600',
    },
    searchHeaderArea: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        color: '#1E293B',
    },
    calendarIconBtn: {
        padding: 8,
        marginLeft: 4,
    },
    dateFilterBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    dateFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    chatArea: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    messageWrapperMe: {
        justifyContent: 'flex-end',
    },
    messageWrapperOther: {
        justifyContent: 'flex-start',
    },
    senderAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 20,
    },
    senderAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    messageContent: {
        maxWidth: '70%',
    },
    senderName: {
        fontSize: 12,
        color: '#475569',
        marginBottom: 4,
        marginLeft: 4,
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
    },
    bubbleMe: {
        backgroundColor: '#4F46E5', // 테마 파란색
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    messageTextMe: {
        color: '#FFF',
    },
    messageTextOther: {
        color: '#1E293B',
    },
    timeText: {
        fontSize: 11,
        color: '#64748B',
        marginHorizontal: 4,
    },
    timeTextMe: {
        marginLeft: 4,
    },
    timeTextOther: {
        marginRight: 4,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingTop: 10,
        // marginBottom/paddingBottom은 컴포넌트 내부에서 insets와 결합하여 인라인 지정
    },
    input: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        minHeight: 40,
        maxHeight: 100,
        fontSize: 16,
        color: '#1E293B',
    },
    sendBtn: {
        backgroundColor: '#4F46E5',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        marginBottom: 2, // input 높이에 맞춤
    },
    sendBtnDisabled: {
        backgroundColor: '#F1F5F9',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    calendarContainer: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    }
});
