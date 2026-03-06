import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { X, Plus, Trash2, User, Phone, Mail } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocations } from '../src/hooks/useLocations';

export const LocationForm = ({ projectId, onClose, onSuccess }) => {
    const { addLocation, loading } = useLocations(projectId);

    // 기본 정보 상태
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [status, setStatus] = useState('requested');
    const [cardStatus, setCardStatus] = useState('pending');
    const [shootingTime, setShootingTime] = useState('');
    const [content, setContent] = useState('');

    // 비용 관련 상태
    const [cost, setCost] = useState('');
    const [depositStatus, setDepositStatus] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [note, setNote] = useState('');

    // 담당자(POC) 목록 상태
    const [pocs, setPocs] = useState([{ name: '', phone: '', email: '' }]);

    const handleAddPoc = () => {
        setPocs([...pocs, { name: '', phone: '', email: '' }]);
    };

    const handleRemovePoc = (index) => {
        if (pocs.length === 1) return;
        setPocs(pocs.filter((_, i) => i !== index));
    };

    const handlePocChange = (index, field, value) => {
        const newPocs = [...pocs];
        newPocs[index][field] = value;
        setPocs(newPocs);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('알림', '장소 이름을 입력해주세요.');
            return;
        }

        const validPocs = pocs.filter(p => p.name.trim() !== '');

        const locationData = {
            title: title.trim(),
            location_date: date.toISOString().split('T')[0],
            status,
            card_status: cardStatus,
            shooting_time: shootingTime.trim(),
            content: content.trim(),
            cost: parseFloat(cost) || 0,
            deposit_status: depositStatus,
            deposit_amount: parseFloat(depositAmount) || 0,
            note: note.trim(),
        };

        const result = await addLocation(locationData, validPocs);

        if (result.success) {
            Alert.alert('성공', '장소가 성공적으로 등록되었습니다.');
            onSuccess();
        } else {
            Alert.alert('오류', result.error);
        }
    };

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>새 장소 등록</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X color="#64748B" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    {/* 기본 정보 */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>기본 정보</Text>
                        <View style={styles.formItem}>
                            <Text style={styles.label}>장소 이름 *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="예: 루브르 박물관"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formItem, { flex: 1 }]}>
                                <Text style={styles.label}>날짜</Text>
                                <TouchableOpacity
                                    style={styles.dateSelector}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text>{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formItem, { flex: 1, marginLeft: 12 }]}>
                                <Text style={styles.label}>촬영 시간</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="예: 14:00~18:00"
                                    value={shootingTime}
                                    onChangeText={setShootingTime}
                                />
                            </View>
                        </View>

                        <View style={styles.formItem}>
                            <Text style={styles.label}>장소 상태</Text>
                            <View style={styles.statusRow}>
                                {['requested', 'confirmed', 'hold'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[
                                            styles.statusBtn,
                                            status === s && styles.statusBtnActive
                                        ]}
                                        onPress={() => setStatus(s)}
                                    >
                                        <Text style={[
                                            styles.statusBtnText,
                                            status === s && styles.statusBtnTextActive
                                        ]}>
                                            {s === 'requested' ? '요청 중' : s === 'confirmed' ? '확정' : '보류'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* 담당자(POC) 정보 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>담당자 정보(POC)</Text>
                            <TouchableOpacity onPress={handleAddPoc}>
                                <Plus color="#4F46E5" size={20} />
                            </TouchableOpacity>
                        </View>

                        {pocs.map((poc, index) => (
                            <View key={index} style={styles.contactItem}>
                                <View style={styles.contactHeader}>
                                    <Text style={styles.contactIndex}>담당자 {index + 1}</Text>
                                    {pocs.length > 1 && (
                                        <TouchableOpacity onPress={() => handleRemovePoc(index)}>
                                            <Trash2 color="#EF4444" size={18} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.contactGrid}>
                                    <View style={styles.contactInputContainer}>
                                        <User size={16} color="#94A3B8" />
                                        <TextInput
                                            style={styles.contactInput}
                                            placeholder="이름"
                                            value={poc.name}
                                            onChangeText={(val) => handlePocChange(index, 'name', val)}
                                        />
                                    </View>
                                    <View style={styles.contactInputContainer}>
                                        <Phone size={16} color="#94A3B8" />
                                        <TextInput
                                            style={styles.contactInput}
                                            placeholder="연락처"
                                            value={poc.phone}
                                            onChangeText={(val) => handlePocChange(index, 'phone', val)}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>
                                <View style={[styles.contactInputContainer, { marginTop: 8 }]}>
                                    <Mail size={16} color="#94A3B8" />
                                    <TextInput
                                        style={styles.contactInput}
                                        placeholder="이메일"
                                        value={poc.email}
                                        onChangeText={(val) => handlePocChange(index, 'email', val)}
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* 비용 정보 */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>비용 정보</Text>
                        <View style={styles.formItem}>
                            <Text style={styles.label}>총 비용 (원)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                value={cost}
                                onChangeText={setCost}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.rowAlign}>
                            <Text style={styles.label}>선금 여부</Text>
                            <Switch
                                value={depositStatus}
                                onValueChange={setDepositStatus}
                                trackColor={{ false: '#E2E8F0', true: '#4F46E5' }}
                            />
                        </View>
                        {depositStatus && (
                            <View style={[styles.formItem, { marginTop: 12 }]}>
                                <Text style={styles.label}>선금 금액 (원)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={depositAmount}
                                    onChangeText={setDepositAmount}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}
                    </View>

                    {/* 상세 내용 및 비고 */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>상세 내용</Text>
                        <View style={styles.formItem}>
                            <Text style={styles.label}>요청 내용</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="장소 관련 구체적인 요청 사항을 적어주세요."
                                value={content}
                                onChangeText={setContent}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                        <View style={styles.formItem}>
                            <Text style={styles.label}>비고</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="추가 참고 사항"
                                value={note}
                                onChangeText={setNote}
                            />
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnCancel]}
                        onPress={onClose}
                    >
                        <Text style={styles.btnTextCancel}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnSubmit]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.btnTextSubmit}>등록하기</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDate(selectedDate);
                        }}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '92%',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
    },
    form: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
    formItem: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#1E293B',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    rowAlign: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateSelector: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        justifyContent: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBtn: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        alignItems: 'center',
    },
    statusBtnActive: {
        backgroundColor: '#4F46E5',
    },
    statusBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    statusBtnTextActive: {
        color: '#FFF',
    },
    contactItem: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    contactHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    contactIndex: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
    },
    contactGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    contactInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
    },
    contactInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 8,
        color: '#1E293B',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        paddingBottom: 20,
    },
    btn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    btnCancel: {
        backgroundColor: '#F1F5F9',
    },
    btnSubmit: {
        backgroundColor: '#4F46E5',
    },
    btnTextCancel: {
        color: '#64748B',
        fontWeight: '700',
    },
    btnTextSubmit: {
        color: '#FFF',
        fontWeight: '700',
    },
});
