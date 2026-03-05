import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { MapPin, Edit2, Plus, X, Check } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export const LocationManager = ({ locations, setLocations }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);

  const [formDate, setFormDate] = useState("");
  const [formName, setFormName] = useState("");
  const [formRequests, setFormRequests] = useState([]);
  const [formStatus, setFormStatus] = useState("요청중");

  const [newRequest, setNewRequest] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const openAddModal = () => {
    setEditingLoc(null);
    setFormDate("");
    setFormName("");
    setFormRequests([]);
    setFormStatus("요청중");
    setNewRequest("");
    setDateObj(new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (loc) => {
    setEditingLoc(loc);
    setFormDate(loc.date || "");
    setFormName(loc.name);
    setFormRequests(loc.requests || []);
    setFormStatus(loc.status === "섭외 중" ? "요청중" : loc.status || "요청중");
    setNewRequest("");
    if (loc.date) {
      const parsed = new Date(loc.date);
      if (!isNaN(parsed)) setDateObj(parsed);
    } else {
      setDateObj(new Date());
    }
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (selectedDate) {
      setDateObj(selectedDate);
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      setFormDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    if (editingLoc) {
      setLocations(
        locations.map((item) =>
          item.id === editingLoc.id
            ? { ...item, date: formDate, name: formName, requests: formRequests, status: formStatus }
            : item
        )
      );
    } else {
      const newLoc = {
        id: Date.now(),
        date: formDate,
        name: formName,
        requests: formRequests,
        status: formStatus,
      };
      setLocations([...locations, newLoc]);
    }
    setModalVisible(false);
  };

  const addRequest = () => {
    if (newRequest.trim()) {
      setFormRequests([...formRequests, { id: Date.now(), text: newRequest, checked: false }]);
      setNewRequest("");
    }
  };

  const toggleRequest = (index) => {
    const updated = [...formRequests];
    updated[index].checked = !updated[index].checked;
    setFormRequests(updated);
  };

  const removeRequest = (id) => {
    setFormRequests(formRequests.filter((r) => r.id !== id));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Plus size={20} color="#FFF" />
        <Text style={styles.addButtonText}>장소섭외 요청</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {locations.map((loc) => {
          const displayStatus = loc.status === "섭외 중" ? "요청중" : loc.status || "요청중";
          return (
            <View key={loc.id} style={styles.locCardHorizontal}>
              <View style={styles.cardLeft}>
                <View style={styles.iconWrapper}>
                  <MapPin size={24} color="#6366F1" />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.locName} numberOfLines={1}>{loc.name}</Text>
                  {loc.date ? <Text style={styles.locSubText}>일자: {loc.date}</Text> : null}
                  {loc.requests && loc.requests.length > 0 ? (
                    <Text style={styles.locSubText}>
                      요청사항: {loc.requests.filter(r => r.checked).length}/{loc.requests.length} 완료
                    </Text>
                  ) : null}
                  {/* 기존 데이터 호환성을 위해 비용이 있으면 표시 */}
                  {(!loc.date && (!loc.requests || loc.requests.length === 0) && loc.cost) ? (
                    <Text style={styles.locSubText}>비용: {loc.cost}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardRight}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: displayStatus === "확정" ? "#D1FAE5" : "#EEF2FF",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: displayStatus === "확정" ? "#065F46" : "#4F46E5" },
                    ]}
                  >
                    {displayStatus}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(loc)}
                >
                  <Edit2 size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 추가/편집 모달 */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLoc ? "장소 편집" : "장소 추가"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>촬영일자</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: "center" }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: formDate ? "#1E293B" : "#9CA3AF" }}>
                  {formDate || "날짜 선택"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                Platform.OS === "ios" ? (
                  <View style={{ marginBottom: 15 }}>
                    <DateTimePicker
                      value={dateObj}
                      mode="date"
                      display="spinner"
                      onChange={onChangeDate}
                    />
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={{ padding: 10, alignItems: "center", backgroundColor: "#EEF2FF", borderRadius: 8 }}
                    >
                      <Text style={{ color: "#4F46E5", fontWeight: "700" }}>완료</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )
              )}

              <Text style={styles.label}>장소명</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="예: 에펠탑 광장"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>요청사항</Text>
              <View style={styles.requestInputRow}>
                <TextInput
                  style={[styles.input, styles.requestInput]}
                  value={newRequest}
                  onChangeText={setNewRequest}
                  placeholder="체크리스트 추가..."
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={addRequest}
                />
                <TouchableOpacity style={styles.addRequestBtn} onPress={addRequest}>
                  <Plus size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {formRequests.map((req, index) => (
                <View key={req.id} style={styles.requestItem}>
                  <TouchableOpacity
                    style={[styles.checkbox, req.checked && styles.checkboxActive]}
                    onPress={() => toggleRequest(index)}
                  >
                    {req.checked && <Check size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <Text style={[styles.requestText, req.checked && styles.requestTextChecked]}>
                    {req.text}
                  </Text>
                  <TouchableOpacity onPress={() => removeRequest(req.id)} style={{ padding: 4 }}>
                    <X size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={[styles.label, { marginTop: 20 }]}>상태</Text>
              <View style={styles.statusRow}>
                {["요청중", "확정"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      formStatus === status && styles.statusOptionActive,
                    ]}
                    onPress={() => setFormStatus(status)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formStatus === status && styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  locCardHorizontal: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    paddingRight: 10,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  locName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  locSubText: { fontSize: 13, color: "#64748B", marginBottom: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  editButton: {
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: "100%",
    padding: 24,
    elevation: 5, // Android shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
  },
  requestInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  requestInput: {
    flex: 1,
    marginBottom: 0, // override
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  addRequestBtn: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  checkboxActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#4F46E5",
  },
  requestText: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
  },
  requestTextChecked: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  statusRow: { flexDirection: "row", marginBottom: 20 },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  statusOptionActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  statusOptionText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  statusOptionTextActive: { color: "#4F46E5", fontWeight: "700" },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
