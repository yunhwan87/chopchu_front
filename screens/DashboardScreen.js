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
} from "react-native";
import { Plus, X } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScheduleBoard } from "../components/ScheduleBoard";

export const DashboardScreen = (props) => {
  const { projects = [], schedule, setActiveTab, setExpandedProjId } = props;
  const project = projects[0] || { risks: 0, pendingQuestions: 0 };
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

  const handleSave = () => {
    if (!projectName.trim()) return;
    const newProject = {
      id: Date.now(),
      title: projectName,
      members: membersStr,
      totalDays,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      note,
      risks: 0,
      pendingQuestions: 0,
    };
    props.setProjects([...props.projects, newProject]);
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>프로젝트 관리</Text>
          <TouchableOpacity
            style={styles.addProjectBtn}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={18} color="#FFF" />
            <Text style={styles.addProjectText}>프로젝트 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 위험 및 대기 알림 섹션 */}
        <View style={styles.alertContainer}>
          <View style={[styles.alertCard, { backgroundColor: "#FEF2F2" }]}>
            <Text style={styles.alertLabel}>위험 {project.risks}</Text>
          </View>
          <View style={[styles.alertCard, { backgroundColor: "#EFF6FF" }]}>
            <Text style={styles.alertLabelBlue}>
              대기 {project.pendingQuestions}
            </Text>
          </View>
        </View>

        {/* 프로젝트 목록 섹션 */}
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
  alertContainer: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  alertCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  alertLabel: { color: "#B91C1C", fontWeight: "700", fontSize: 15 },
  alertLabelBlue: { color: "#1D4ED8", fontWeight: "700", fontSize: 15 },
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
});
