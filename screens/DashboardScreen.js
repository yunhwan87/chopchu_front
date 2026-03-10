import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { Plus, X, Folder } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScheduleBoard } from "../components/ScheduleBoard";
import { useProjects } from "../src/hooks/useProjects";
import { useEffect } from "react";
import { useAuth } from "../src/hooks/useAuth";
import { useRequests } from "../src/hooks/useRequests";
import { CommunicationLog } from "../components/CommunicationLog";

export const DashboardScreen = (props) => {
  const { projects = [], schedule, setActiveTab, setExpandedProjId, onSelectProject, currentProject, addProject, projectsLoading } = props;
  const { user } = useAuth();
  const { requests: receivedRequests, loading: requestsLoading, loadRequests } = useRequests();

  // 탭 이동 시 요청 목록 갱신 연동

  useEffect(() => {
    if (user?.id) {
      // 프로젝트 관계없이 유저가 받은 모든 대기 요청을 로드
      loadRequests(null, user.id, 'received');
    }
  }, [user?.id, loadRequests]);

  const [modalVisible, setModalVisible] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [membersStr, setMembersStr] = useState("");
  const [note, setNote] = useState("");

  // Dates
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState("start"); // "start" or "end"

  const membersCount = membersStr.split(",").filter((m) => m.trim().length > 0).length;

  // Calculate days difference (startDate -> endDate)
  // Ensure we drop time portion for correct day diff
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  let totalDays = 0;
  if (endDay >= startDay) {
    const diffTime = Math.abs(endDay - startDay);
    totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of start day
  }

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      if (pickerType === "start") {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const openPicker = (type) => {
    setPickerType(type);
    setShowPicker(true);
  };

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      Alert.alert("알림", "프로젝트명을 입력해주세요.");
      return;
    }

    try {
      const projectData = {
        title: projectName,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        totalDays: totalDays,
        note: note,
        // membersStr은 현재 DB 스키마에 따라 처리 방식이 다를 수 있으나, 
        // 우선 note나 다른 필드에 포함하거나 생략 가능합니다.
        // 현재는 title과 날짜 정보가 핵심입니다.
      };

      const result = await addProject(projectData);

      if (result.success) {
        // 로컬 MOCK 데이터와 싱크를 맞추고 싶다면 남겨두지만, 
        // 실제로는 apiProjects가 hook 내부에서 업데이트되므로 자동 갱신됩니다.
        if (props.setProjects && props.projects) {
          const newMockProject = {
            id: result.data.id,
            title: projectName,
            members: membersStr,
            totalDays,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            note,
          };
          props.setProjects([...props.projects, newMockProject]);
        }

        setModalVisible(false);
        setProjectName("");
        setMembersStr("");
        setNote("");
        setStartDate(new Date());
        setEndDate(new Date());
      } else {
        Alert.alert("저장 실패", result.error || "프로젝트를 생성할 수 없습니다.");
      }
    } catch (error) {
      Alert.alert("에러", "시스템 오류가 발생했습니다.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>대기중인 요청</Text>
          <TouchableOpacity
            style={styles.addProjectBtn}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={18} color="#FFF" />
            <Text style={styles.addProjectText}>프로젝트 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 받은 요청 리스트 섹션 (기존 알림 섹션 대체) */}
        <View style={styles.requestsWrapper}>
          <CommunicationLog
            requests={receivedRequests}
            currentUserId={user?.id}
            type="received"
            onRefresh={() => loadRequests(null, user.id, 'received')}
            isDashboard={true}
          />
          {receivedRequests.length === 0 && !requestsLoading && (
            <View style={styles.emptyRequests}>
              <Text style={styles.emptyRequestsText}>새로운 요청이 없습니다.</Text>
            </View>
          )}
        </View>


        {/* 신규: 내 프로젝트 (Temp) 화면 스타일의 바로가기 섹션 - 세로 리스트형으로 변경 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>프로젝트 바로가기</Text>
        </View>
        <View style={styles.recentProjectsVerticalList}>
          {projects.map((proj) => (
            <TouchableOpacity
              key={proj.id}
              style={styles.recentProjectCardVertical}
              onPress={() => {
                if (onSelectProject) onSelectProject(proj);
                if (setExpandedProjId) setExpandedProjId(proj.id);
                if (setActiveTab) setActiveTab("Schedule");
              }}
            >
              <View style={styles.recentProjectIcon}>
                <Folder color="#4F46E5" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentProjectTitle} numberOfLines={1}>
                  {proj.title}
                </Text>
                <Text style={styles.recentProjectSubtitle}>
                  {proj.startDate} ~ {proj.endDate}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {projects.length === 0 && !projectsLoading && (
            <Text style={styles.emptyRecentText}>등록된 프로젝트가 없습니다.</Text>
          )}
        </View>



        {/* 프로젝트 목록 섹션 - 주석 처리
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>참여 중인 프로젝트</Text>
        </View>
        <View style={styles.projectListContainer}>
          {projects.map((proj) => (
            <TouchableOpacity
              key={proj.id}
              style={styles.projectListCard}
              activeOpacity={0.8}
              onPress={() => {
                setExpandedProjId(proj.id);
                setActiveTab("Schedule");
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.projectListTitle} numberOfLines={1}>
                  {proj.title}
                </Text>
                <Text style={styles.projectListDates}>
                  {proj.startDate} ~ {proj.endDate}
                </Text>
              </View>
              <View style={styles.projectDaysBadge}>
                <Text style={styles.projectDaysText}>{proj.totalDays}일</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        */}


        {/* 추후 활용할 것이니 삭제 금지
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>오늘의 촬영 타임라인</Text>
        </View>
        <ScheduleBoard schedule={schedule} />
        */}
      </ScrollView>

      {/* 프로젝트 추가 모달 */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 프로젝트 추가</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>프로젝트명</Text>
              <TextInput
                style={styles.input}
                value={projectName}
                onChangeText={setProjectName}
                placeholder="예: 파리 패션위크 촬영"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.labelRow}>
                <Text style={styles.label}>참여 인원</Text>
                <Text style={styles.highlightText}>총 {membersCount}명</Text>
              </View>
              <TextInput
                style={styles.input}
                value={membersStr}
                onChangeText={setMembersStr}
                placeholder="이름을 콤마(,)로 구분하여 입력 (예: 홍길동, 김철수)"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.labelRow}>
                <Text style={styles.label}>기간 설정</Text>
                <Text style={styles.highlightText}>
                  {totalDays > 0 ? `총 ${totalDays}일` : "날짜 오류"}
                </Text>
              </View>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => openPicker("start")}
                >
                  <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
                <Text style={styles.dateSeparator}>~</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => openPicker("end")}
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
                value={note}
                onChangeText={setNote}
                placeholder="추가적인 요청사항이나 메모를 입력하세요."
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
  container: { paddingBottom: 120 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  addProjectBtn: {
    flexDirection: "row",
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  addProjectText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
  requestsWrapper: {
    paddingTop: 5,
  },
  emptyRequests: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyRequestsText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  sectionHeader: { paddingHorizontal: 20, marginTop: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: "#1E293B" },

  // Project List Styles
  projectListContainer: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  projectListCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectListTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },
  projectListDates: {
    fontSize: 13,
    color: "#64748B",
  },
  projectDaysBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  projectDaysText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "700",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", // Bottom sheet 느낌
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8, marginTop: 10 },
  highlightText: { fontSize: 14, fontWeight: "700", color: "#4F46E5" },
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
    height: 100,
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

  // 신규 스타일 - 세로형 리스트로 수정
  recentProjectsVerticalList: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  recentProjectCardVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  recentProjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentProjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  recentProjectSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyRecentText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});


