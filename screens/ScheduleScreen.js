import React, { useState, useRef, useEffect } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Platform, Alert } from "react-native";
import { Edit2, X, Trash2 } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScheduleBoard } from "../components/ScheduleBoard";

export const ScheduleScreen = ({ projects = [], setProjects, deleteProject, schedule = [], expandedProjId, setExpandedProjId }) => {
  const scrollViewRef = useRef(null);
  const [cardLayouts, setCardLayouts] = useState({});
  const [dayFilter, setDayFilter] = useState("전체");

  useEffect(() => {
    if (expandedProjId && cardLayouts[expandedProjId] !== undefined) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: cardLayouts[expandedProjId], animated: true });
      }, 50);
    }
  }, [expandedProjId, cardLayouts]);

  useEffect(() => {
    setDayFilter("전체");
  }, [expandedProjId]);

  const getDDay = (startDateStr) => {
    if (!startDateStr) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startObj = new Date(startDateStr);
    startObj.setHours(0, 0, 0, 0);
    const diffTime = startObj - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "D-Day";
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [formTitle, setFormTitle] = useState("");
  const [formMembers, setFormMembers] = useState("");
  const [formNote, setFormNote] = useState("");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState("start");

  const openEditModal = (proj) => {
    setEditingProject(proj);
    setFormTitle(proj.title);
    setFormMembers(proj.members || "");
    setFormNote(proj.note || "");

    // Parse dates
    const startObj = proj.startDate ? new Date(proj.startDate) : new Date();
    const endObj = proj.endDate ? new Date(proj.endDate) : new Date();
    setStartDate(isNaN(startObj) ? new Date() : startObj);
    setEndDate(isNaN(endObj) ? new Date() : endObj);

    setEditModalVisible(true);
  };

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      if (pickerType === "start") setStartDate(selectedDate);
      else setEndDate(selectedDate);
    }
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    // Calculate days
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    let totalDays = 0;
    if (endDay >= startDay) {
      const diffTime = Math.abs(endDay - startDay);
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const updatedProject = {
      ...editingProject,
      title: formTitle,
      members: formMembers,
      note: formNote,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      totalDays
    };

    setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
    setEditModalVisible(false);
  };

  const handleDelete = (projId) => {
    Alert.alert(
      "프로젝트 삭제",
      "삭제하시면 되돌릴 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제", 
          style: "destructive", 
          onPress: async () => {
            if (deleteProject) {
              const result = await deleteProject(projId);
              if (result.success) {
                if (expandedProjId === projId) setExpandedProjId(null);
              } else {
                Alert.alert("삭제 실패", result.error || "문제가 발생했습니다.");
              }
            } else {
              setProjects(projects.filter(p => p.id !== projId));
              if (expandedProjId === projId) setExpandedProjId(null);
            }
          } 
        }
      ]
    );
  };

  // 선택된 프로젝트가 있으면 해당 프로젝트만 표시, 없으면 전체 표시
  const displayedProjects = expandedProjId
    ? projects.filter(p => p.id === expandedProjId)
    : projects;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>프로젝트 상세 일정 리스트</Text>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollInner}
      >
        {displayedProjects.length > 0 ? (
          displayedProjects.map((proj) => (
            <View
              key={proj.id}
              style={styles.detailCard}
              onLayout={(e) => {
                const layout = e.nativeEvent.layout;
                setCardLayouts((prev) => ({ ...prev, [proj.id]: layout.y }));
              }}
            >
              {/* 상단 프로젝트 정보 부분을 클릭 가능하게 함 */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (expandedProjId === proj.id) {
                    setExpandedProjId(null); // 이미 열려있으면 닫기
                  } else {
                    setExpandedProjId(proj.id); // 아니면 열기
                  }
                }}
              >
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailTitle}>{proj.title}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity onPress={() => openEditModal(proj)} style={styles.editBtn}>
                      <Edit2 size={18} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(proj.id)} style={[styles.editBtn, styles.deleteBtn]}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.detailSubTextRow}>
                  <Text style={[styles.detailSubText, { flex: 1, marginBottom: 0 }]}>
                    진행 기간: {proj.startDate} ~ {proj.endDate}
                  </Text>
                  <View style={styles.inlineBadge}>
                    <Text style={styles.inlineBadgeText}>총 {proj.totalDays}일</Text>
                  </View>
                </View>

                {proj.members ? (
                  <View style={styles.detailSubTextRow}>
                    <Text style={[styles.detailSubText, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                      참여 인원: {proj.members}
                    </Text>
                    <View style={styles.inlineBadge}>
                      <Text style={styles.inlineBadgeText}>
                        총 {proj.members.split(',').filter(m => m.trim().length > 0).length}명
                      </Text>
                    </View>
                  </View>
                ) : null}

                {proj.note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>{proj.note}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              {/* 촬영 일정 보드 (클릭 시 토글) */}
              {expandedProjId === proj.id && (
                <View style={styles.timelineWrapper}>
                  <View style={[styles.sectionHeader, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                    <Text style={styles.sectionTitle}>촬영 일정 보드</Text>
                    <View style={styles.dDayBadge}>
                      <Text style={styles.dDayText}>{getDDay(proj.startDate)}</Text>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, paddingBottom: 5 }}>
                    {["전체", ...Array.from({ length: proj.totalDays }, (_, i) => `${i + 1}일차`)].map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.filterTab, dayFilter === day && styles.filterTabActive]}
                        onPress={() => setDayFilter(day)}
                      >
                        <Text style={[styles.filterTabText, dayFilter === day && styles.filterTabTextActive]}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <ScheduleBoard
                    schedule={schedule.filter(item => {
                      if (!item.date || !proj.startDate || !proj.endDate) return false;
                      const itemDate = new Date(item.date);
                      const sDate = new Date(proj.startDate);
                      const eDate = new Date(proj.endDate);
                      let isInRange = itemDate >= sDate && itemDate <= eDate;

                      if (isInRange && dayFilter !== "전체") {
                        const dayNum = parseInt(dayFilter.replace("일차", ""));
                        const targetDate = new Date(sDate);
                        targetDate.setDate(targetDate.getDate() + (dayNum - 1));
                        if (formatDate(itemDate) !== formatDate(targetDate)) {
                          isInRange = false;
                        }
                      }
                      return isInRange;
                    }).sort((a, b) => new Date(a.date + 'T' + a.time.split(' ~ ')[0]) - new Date(b.date + 'T' + b.time.split(' ~ ')[0]))}
                    projectStartDate={proj.startDate}
                  />
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>등록된 프로젝트가 없습니다.</Text>
          </View>
        )}

      </ScrollView>

      {/* 수정 모달 */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>프로젝트 수정</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>프로젝트명</Text>
              <TextInput
                style={styles.input}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="예: 파리 패션위크 촬영"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>참여 인원</Text>
              <TextInput
                style={styles.input}
                value={formMembers}
                onChangeText={setFormMembers}
                placeholder="이름을 콤마(,)로 구분"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>기간 설정</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => { setPickerType("start"); setShowPicker(true); }}
                >
                  <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
                <Text style={styles.dateSeparator}>~</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => { setPickerType("end"); setShowPicker(true); }}
                >
                  <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>
              </View>

              {showPicker && (
                Platform.OS === "ios" ? (
                  <View style={{ marginBottom: 15, backgroundColor: "#F8FAFC", borderRadius: 12 }}>
                    <DateTimePicker
                      value={pickerType === "start" ? startDate : endDate}
                      mode="date"
                      display="spinner"
                      onChange={onChangeDate}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPicker(false)}
                      style={{ padding: 10, alignItems: "center", backgroundColor: "#EEF2FF", borderRadius: 8, margin: 10 }}
                    >
                      <Text style={{ color: "#4F46E5", fontWeight: "700" }}>완료</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={pickerType === "start" ? startDate : endDate}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )
              )}

              <Text style={styles.label}>비고 (메모)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formNote}
                onChangeText={setFormNote}
                placeholder="추가 메모를 입력하세요."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerTitle: {
    paddingHorizontal: 20,
    marginTop: 20,
    fontSize: 16,
    color: "#64748B",
    marginBottom: 10,
  },
  projectListContainer: {
    marginBottom: 15,
  },
  scroll: {
    paddingLeft: 20,
    flexGrow: 0,
  },
  projectCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    width: 150,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginBottom: 10, // Shadow 여백
  },
  projectCardSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  iconRow: {
    marginBottom: 8,
  },
  projTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  projDates: { fontSize: 12, color: "#64748B" },

  scrollInner: { paddingBottom: 120, paddingHorizontal: 20 },
  detailCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
  },
  badge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 10,
  },
  badgeText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "700",
  },
  detailSubText: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
  },
  detailSubTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  inlineBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  inlineBadgeText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "700",
  },
  noteBox: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noteText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  timelineWrapper: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 15,
  },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  dDayBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dDayText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "#4F46E5",
  },
  filterTabText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
  },
  filterTabTextActive: {
    color: "#FFF",
  },
  emptyWrap: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  editBtn: {
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deleteBtn: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInput: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  dateSeparator: {
    marginHorizontal: 10,
    fontSize: 18,
    color: "#64748B",
    fontWeight: "700",
  },
  textArea: {
    height: 100, // min-height for multiline
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
