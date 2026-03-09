import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Switch,
} from "react-native";
import { MapPin, Plus, X } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const WAITING_STATUSES = [
  "코디 답변대기중",
  "제작진 답변 대기중",
  "섭외지 답변 대기중",
];
const WAITING_STATUS_ALIASES = {
  답변대기: "코디 답변대기중",
  "코디 답변 대기중": "코디 답변대기중",
  "코디답변 대기중": "코디 답변대기중",
  "제작진답변 대기중": "제작진 답변 대기중",
  "섭외지답변 대기중": "섭외지 답변 대기중",
};
const STATUS_OPTIONS = ["요청중", "확정", ...WAITING_STATUSES, "보류", "취소"];
const FILTER_TABS = ["전체", "요청중", "확정", "보류/취소"];
const CONFLICT_STATUSES = new Set(["요청중", "확정", ...WAITING_STATUSES]);

const normalizeStatus = (status) => {
  if (!status) return "요청중";
  if (status === "섭외 중") return "요청중";
  if (WAITING_STATUS_ALIASES[status]) return WAITING_STATUS_ALIASES[status];
  return status;
};

const isWaitingStatus = (status) => WAITING_STATUSES.includes(status);

const toMinutes = (value) => {
  if (!value || !value.includes(":")) return null;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const isValidTimeRange = (startTime, endTime) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return false;
  return end > start;
};

const getSlotKey = (item) =>
  `${item.date || ""}-${item.startTime || ""}-${item.endTime || ""}`;

const normalizeRequestThreads = (requests = []) => {
  if (!Array.isArray(requests)) return [];

  return requests
    .map((req, index) => {
      if (typeof req === "string") {
        return {
          id: `rq-${Date.now()}-${index}`,
          author: "요청",
          text: req,
          replies: [],
        };
      }

      if (!req || typeof req !== "object") return null;

      const text = req.text || req.request || req.title || "";
      if (!text) return null;

      const replies = Array.isArray(req.replies)
        ? req.replies
            .map((reply, replyIndex) => {
              if (typeof reply === "string") {
                return {
                  id: `rp-${Date.now()}-${index}-${replyIndex}`,
                  author: "댓글",
                  text: reply,
                };
              }

              if (!reply || typeof reply !== "object" || !reply.text)
                return null;

              return {
                id: reply.id || `rp-${Date.now()}-${index}-${replyIndex}`,
                author: reply.author || "댓글",
                text: reply.text,
              };
            })
            .filter(Boolean)
        : [];

      return {
        id: req.id || `rq-${Date.now()}-${index}`,
        author: req.author || "요청",
        text,
        replies,
      };
    })
    .filter(Boolean);
};

export const LocationManager = ({
  locations,
  setLocations,
  currentUserName = "",
  schedule,
  setSchedule,
}) => {

  const [modalVisible, setModalVisible] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("전체");
  const [requestWaitingFilter, setRequestWaitingFilter] = useState("전체");
  const [requestWaitingExpanded, setRequestWaitingExpanded] = useState(false);

  const [formDate, setFormDate] = useState("");
  const [formName, setFormName] = useState("");
  const [formManager, setFormManager] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formDepositPaid, setFormDepositPaid] = useState(false);
  const [formRisk, setFormRisk] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formRequests, setFormRequests] = useState([]);
  const [formStatus, setFormStatus] = useState("요청중");

  const [newRequest, setNewRequest] = useState("");
  const [newRequestAuthor, setNewRequestAuthor] = useState(currentUserName);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAuthorDrafts, setReplyAuthorDrafts] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());
  const [timeError, setTimeError] = useState("");

  const isEditMode = Boolean(editingLoc);

  useEffect(() => {
    setNewRequestAuthor((prev) => prev || currentUserName || "");
  }, [currentUserName]);

  const conflictIds = useMemo(() => {
    const active = locations.filter(
      (item) =>
        item.date &&
        item.startTime &&
        item.endTime &&
        CONFLICT_STATUSES.has(normalizeStatus(item.status)),
    );

    const slotMap = {};
    active.forEach((item) => {
      const key = getSlotKey(item);
      if (!slotMap[key]) slotMap[key] = [];
      slotMap[key].push(item.id);
    });

    const result = new Set();
    Object.values(slotMap)
      .filter((ids) => ids.length >= 2)
      .forEach((ids) => ids.forEach((id) => result.add(id)));
    return result;
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return locations
      .filter((loc) => {
        if (!keyword) return true;
        const name = String(loc.name || "").toLowerCase();
        const manager = String(loc.manager || "").toLowerCase();
        return name.includes(keyword) || manager.includes(keyword);
      })
      .filter((loc) => (riskOnly ? Boolean(loc.risk) : true))
      .filter((loc) => {
        const normalized = normalizeStatus(loc.status);
        if (statusFilter === "전체") return true;
        if (statusFilter === "요청중") {
          if (requestWaitingFilter === "전체") {
            return normalized === "요청중" || isWaitingStatus(normalized);
          }
          return normalized === requestWaitingFilter;
        }
        if (statusFilter === "보류/취소") {
          return normalized === "보류" || normalized === "취소";
        }
        return normalized === statusFilter;
      });
  }, [locations, riskOnly, searchKeyword, statusFilter, requestWaitingFilter]);

  const resetForm = () => {
    setEditingLoc(null);
    setFormDate("");
    setFormName("");
    setFormManager("");
    setFormStartTime("");
    setFormEndTime("");
    setFormCost("");
    setFormDepositPaid(false);
    setFormRisk("");
    setFormMemo("");
    setFormRequests([]);
    setFormStatus("요청중");
    setNewRequest("");
    setNewRequestAuthor(currentUserName);
    setReplyDrafts({});
    setReplyAuthorDrafts({});
    setDateObj(new Date());
    setShowDatePicker(false);
    setTimeError("");
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (loc) => {
    setEditingLoc(loc);
    setFormDate(loc.date || "");
    setFormName(loc.name || "");
    setFormManager(loc.manager || "");
    setFormStartTime(loc.startTime || "");
    setFormEndTime(loc.endTime || "");
    setFormCost(
      loc.cost !== undefined && loc.cost !== null
        ? String(loc.cost).replace(/,/g, "")
        : "",
    );
    setFormDepositPaid(Boolean(loc.depositPaid));
    setFormRisk(loc.risk || "");
    setFormMemo(loc.memo || "");
    setFormRequests(normalizeRequestThreads(loc.requests || []));
    setFormStatus(normalizeStatus(loc.status));
    setNewRequest("");
    setNewRequestAuthor(currentUserName);
    setReplyDrafts({});
    setReplyAuthorDrafts({});
    setTimeError("");

    if (loc.date) {
      const parsed = new Date(loc.date);
      setDateObj(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
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

  const addRequestThread = () => {
    const text = newRequest.trim();
    if (!text) return;

    setFormRequests([
      ...formRequests,
      {
        id: `rq-${Date.now()}`,
        author: newRequestAuthor.trim() || currentUserName || "요청",
        text,
        replies: [],
      },
    ]);
    setNewRequest("");
  };

  const removeRequestThread = (threadId) => {
    setFormRequests(formRequests.filter((thread) => thread.id !== threadId));
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
    setReplyAuthorDrafts((prev) => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  };

  const addReply = (threadId) => {
    const text = String(replyDrafts[threadId] || "").trim();
    if (!text) return;
    const author =
      String(replyAuthorDrafts[threadId] ?? currentUserName ?? "").trim() ||
      "댓글";

    setFormRequests(
      formRequests.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          replies: [
            ...(thread.replies || []),
            { id: `rp-${Date.now()}`, author, text },
          ],
        };
      }),
    );

    setReplyDrafts((prev) => ({ ...prev, [threadId]: "" }));
    setReplyAuthorDrafts((prev) => ({
      ...prev,
      [threadId]: currentUserName || "",
    }));
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    const hasAnyTime = Boolean(formStartTime.trim() || formEndTime.trim());
    if (
      hasAnyTime &&
      !isValidTimeRange(formStartTime.trim(), formEndTime.trim())
    ) {
      setTimeError("시간 범위를 확인해주세요. (예: 09:00 ~ 11:00)");
      return;
    }
    setTimeError("");

    const normalizedRequests = normalizeRequestThreads(formRequests);

    if (isEditMode) {
      const parsedCost = Number(formCost);
      const costValue = Number.isFinite(parsedCost) ? parsedCost : null;

      const payload = {
        date: formDate,
        name: formName.trim(),
        manager: formManager.trim(),
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim(),
        cost: costValue,
        depositPaid: formDepositPaid,
        risk: formRisk.trim(),
        memo: formMemo.trim(),
        requests: normalizedRequests,
        status: formStatus,
      };

      setLocations(
        locations.map((item) =>
          item.id === editingLoc.id ? { ...item, ...payload } : item,
        ),
      );

      // 장소 확정 시 일정에 추가 (이미 있지 않은 경우)
      if (formStatus === "확정") {
        const exists = schedule.find(s => s.locationId === editingLoc.id || s.location === formName);
        if (!exists) {
          setSchedule([...schedule, {
            id: Date.now(),
            locationId: editingLoc.id,
            time: "미정",
            location: formName,
            status: "확정",
            type: "촬영",
            date: formDate // 해당 프로젝트의 기간과 맞아떨어지도록 date 필드 추가
          }]);
        }
      }
    } else {
      const payload = {
        id: Date.now(),
        date: formDate,
        name: formName.trim(),
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim(),
        requests: normalizedRequests,
        status: "요청중",
      };

      setLocations([payload,...locations, newLoc]);

      // 장소 확정 시 일정에 자동 추가
      if (formStatus === "확정") {
        setSchedule([...schedule, {
          id: Date.now(),
          locationId: newLoc.id,
          time: "미정",
          location: formName,
          status: "확정",
          type: "촬영",
          date: formDate // 해당 프로젝트의 기간과 맞아떨어지도록 date 필드 추가
        }]);
      }
    }
    setModalVisible(false);
  };

  const addRequest = () => {
    if (newRequest.trim()) {
      setFormRequests([...formRequests, { id: Date.now(), text: newRequest, checked: false }]);
      setNewRequest("");
    }

    setModalVisible(false);
  };

  const getStatusBadgeStyle = (status) => {
    if (status === "확정") return { bg: "#D1FAE5", text: "#065F46" };
    if (status === "취소") return { bg: "#FEE2E2", text: "#B91C1C" };
    if (status === "보류") return { bg: "#FEF3C7", text: "#92400E" };
    return { bg: "#EEF2FF", text: "#4F46E5" };
  };
  const requestWaitingOptions =
    requestWaitingFilter === "전체"
      ? WAITING_STATUSES
      : ["전체", ...WAITING_STATUSES];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Plus size={20} color="#FFF" />
        <Text style={styles.addButtonText}>장소 섭외 요청</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.searchInput}
        value={searchKeyword}
        onChangeText={setSearchKeyword}
        placeholder="장소명/담당자 검색"
        placeholderTextColor="#9CA3AF"
      />

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_TABS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive,
            ]}
            onPress={() => {
              setStatusFilter(status);
              if (status !== "요청중") {
                setRequestWaitingFilter("전체");
                setRequestWaitingExpanded(false);
              }
            }}
          >
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>리스크만 보기</Text>
        <Switch value={riskOnly} onValueChange={setRiskOnly} />
      </View>

      {statusFilter === "요청중" ? (
        <View style={styles.requestWaitingBox}>
          <TouchableOpacity
            style={styles.requestWaitingHeader}
            activeOpacity={0.8}
            onPress={() => setRequestWaitingExpanded((prev) => !prev)}
          >
            <Text style={styles.toggleLabel}>답변 대기 필터</Text>
            <Text style={styles.requestWaitingValue}>
              {requestWaitingFilter} {requestWaitingExpanded ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {requestWaitingExpanded ? (
            <View style={styles.requestWaitingOptions}>
              {requestWaitingOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.requestWaitingOption,
                    requestWaitingFilter === status &&
                      styles.requestWaitingOptionActive,
                  ]}
                  onPress={() => {
                    setRequestWaitingFilter(status);
                    setRequestWaitingExpanded(false);
                  }}
                >
                  <Text
                    style={[
                      styles.requestWaitingOptionText,
                      requestWaitingFilter === status &&
                        styles.requestWaitingOptionTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={styles.cardList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredLocations.map((loc) => {
          const displayStatus = normalizeStatus(loc.status);
          const statusTone = getStatusBadgeStyle(displayStatus);
          const requestThreads = normalizeRequestThreads(loc.requests || []);
          const threadCount = requestThreads.length;
          const replyCount = requestThreads.reduce(
            (acc, thread) => acc + (thread.replies?.length || 0),
            0,
          );
          const isPresetLocation =
            loc.isPreset === true || loc.id === 1 || loc.id === 2;
          const displayName = `${loc.name || ""}${isPresetLocation ? "*" : ""}`;

          return (
            <TouchableOpacity
              key={loc.id}
              style={styles.locCardHorizontal}
              onPress={() => openEditModal(loc)}
              activeOpacity={0.85}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconWrapper}>
                  <MapPin size={24} color="#6366F1" />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.locName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {loc.manager ? (
                    <Text style={styles.locSubText}>담당자: {loc.manager}</Text>
                  ) : null}
                  {loc.date ? (
                    <Text style={styles.locSubText}>
                      일자: {loc.date}
                      {loc.startTime && loc.endTime
                        ? ` · ${loc.startTime}~${loc.endTime}`
                        : ""}
                    </Text>
                  ) : null}
                  {threadCount > 0 ? (
                    <Text style={styles.locSubText}>
                      요청사항: {threadCount}건 · 댓글 {replyCount}개
                    </Text>
                  ) : null}
                  {loc.cost !== null && loc.cost !== undefined ? (
                    <Text style={styles.locSubText}>
                      비용: ₩ {Number(loc.cost || 0).toLocaleString("ko-KR")}
                      {loc.depositPaid ? " · 선금 Y" : " · 선금 N"}
                    </Text>
                  ) : null}
                  {loc.risk ? (
                    <Text style={styles.riskText}>리스크: {loc.risk}</Text>
                  ) : null}
                  {conflictIds.has(loc.id) ? (
                    <Text style={styles.conflictText}>
                      동일 시간대 섭외 충돌 가능
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardRight}>
                <View
                  style={[styles.badge, { backgroundColor: statusTone.bg }]}
                >
                  <Text style={[styles.badgeText, { color: statusTone.text }]}>
                    {displayStatus}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? "장소 수정" : "장소 섭외 요청"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: "80%" }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>촬영일자</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: "center" }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: formDate ? "#1E293B" : "#9CA3AF" }}>
                  {formDate || "날짜 선택"}
                </Text>
              </TouchableOpacity>

              {showDatePicker &&
                (Platform.OS === "ios" ? (
                  <View style={{ marginBottom: 15 }}>
                    <DateTimePicker
                      value={dateObj}
                      mode="date"
                      display="spinner"
                      onChange={onChangeDate}
                    />
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.pickerDone}
                    >
                      <Text style={styles.pickerDoneText}>완료</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                ))}

              <Text style={styles.label}>장소명</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="예: 에펠탑 광장*"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>시작 시간</Text>
                  <TextInput
                    style={styles.input}
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholder="09:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>종료 시간</Text>
                  <TextInput
                    style={styles.input}
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholder="11:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              {timeError ? (
                <Text style={styles.errorText}>{timeError}</Text>
              ) : null}

              {isEditMode ? (
                <>
                  <Text style={styles.label}>담당자</Text>
                  <TextInput
                    style={styles.input}
                    value={formManager}
                    onChangeText={setFormManager}
                    placeholder="예: 김매니저*"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.label}>비용</Text>
                  <TextInput
                    style={styles.input}
                    value={formCost}
                    onChangeText={setFormCost}
                    placeholder="숫자만 입력"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />

                  <View style={styles.switchRow}>
                    <Text style={styles.labelInline}>선금 여부</Text>
                    <Switch
                      value={formDepositPaid}
                      onValueChange={setFormDepositPaid}
                    />
                  </View>

                  <Text style={styles.label}>리스크</Text>
                  <TextInput
                    style={styles.input}
                    value={formRisk}
                    onChangeText={setFormRisk}
                    placeholder="예: 우천 시 촬영 불가*"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              ) : null}

              <Text style={styles.label}>요청사항</Text>
              <View style={styles.requestComposerRow}>
                <TextInput
                  style={[styles.input, styles.requestAuthorInput]}
                  value={newRequestAuthor}
                  onChangeText={setNewRequestAuthor}
                  placeholder="작성자"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={[styles.input, styles.requestBodyInput]}
                  value={newRequest}
                  onChangeText={setNewRequest}
                  placeholder="요청사항 입력..."
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={addRequestThread}
                />
                <TouchableOpacity
                  style={styles.addRequestBtn}
                  onPress={addRequestThread}
                >
                  <Plus size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              {formRequests.map((thread) => (
                <View key={thread.id} style={styles.threadCard}>
                  <View style={styles.threadHeader}>
                    <Text style={styles.threadAuthor}>{thread.author}</Text>
                    <TouchableOpacity
                      onPress={() => removeRequestThread(thread.id)}
                      style={styles.threadDeleteBtn}
                    >
                      <X size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.threadText}>{thread.text}</Text>

                  {(thread.replies || []).map((reply) => (
                    <View key={reply.id} style={styles.replyItem}>
                      <Text style={styles.replyAuthor}>{reply.author}</Text>
                      <Text style={styles.replyText}>{reply.text}</Text>
                    </View>
                  ))}

                  <View style={styles.replyComposerRow}>
                    <TextInput
                      style={[styles.input, styles.replyAuthorInput]}
                      value={
                        replyAuthorDrafts[thread.id] ?? currentUserName ?? ""
                      }
                      onChangeText={(value) =>
                        setReplyAuthorDrafts((prev) => ({
                          ...prev,
                          [thread.id]: value,
                        }))
                      }
                      placeholder="댓글작성자"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={[styles.input, styles.replyBodyInput]}
                      value={replyDrafts[thread.id] || ""}
                      onChangeText={(value) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [thread.id]: value,
                        }))
                      }
                      placeholder="댓글 입력..."
                      placeholderTextColor="#9CA3AF"
                      onSubmitEditing={() => addReply(thread.id)}
                    />
                    <TouchableOpacity
                      style={styles.replySubmitBtn}
                      onPress={() => addReply(thread.id)}
                    >
                      <Text style={styles.replySubmitText}>등록</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {isEditMode ? (
                <>
                  <Text style={styles.label}>메모</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formMemo}
                    onChangeText={setFormMemo}
                    placeholder="추가 메모를 입력하세요"
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    textAlignVertical="top"
                  />

                  <Text style={[styles.label, { marginTop: 20 }]}>상태</Text>
                  <View style={styles.statusRow}>
                    {STATUS_OPTIONS.map((status) => (
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
                            formStatus === status &&
                              styles.statusOptionTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
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
  searchInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
    marginBottom: 6,
  },
  filterScroll: {
    marginVertical: 6,
    flexGrow: 0,
    minHeight: 40,
    zIndex: 3,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 0,
    paddingRight: 12,
    alignItems: "center",
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    width: 88,
    minWidth: 88,
    maxWidth: 88,
    height: 36,
    minHeight: 36,
    maxHeight: 36,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  filterChipText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },
  filterChipTextActive: {
    color: "#4F46E5",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  toggleLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  requestWaitingBox: {
    marginBottom: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    overflow: "hidden",
  },
  requestWaitingHeader: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestWaitingValue: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  requestWaitingOptions: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 4,
  },
  requestWaitingOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  requestWaitingOptionActive: {
    backgroundColor: "#EEF2FF",
  },
  requestWaitingOptionText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  requestWaitingOptionTextActive: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  cardList: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 120,
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
    marginLeft: 10,
    alignItems: "flex-end",
  },
  locName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  locSubText: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 2,
  },
  riskText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  conflictText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 2,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 0,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
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
    elevation: 5,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  labelInline: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
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
  pickerDone: {
    padding: 10,
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  pickerDoneText: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  errorText: {
    marginTop: -8,
    marginBottom: 12,
    fontSize: 12,
    color: "#B91C1C",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    minHeight: 52,
    marginBottom: 16,
  },
  requestComposerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  requestAuthorInput: {
    width: 92,
    minWidth: 92,
    marginBottom: 0,
  },
  requestBodyInput: {
    flex: 1,
    marginBottom: 0,
  },
  addRequestBtn: {
    backgroundColor: "#4F46E5",
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  threadCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  threadAuthor: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "700",
  },
  threadDeleteBtn: {
    padding: 4,
  },
  threadText: {
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 20,
  },
  replyItem: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  replyAuthor: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 3,
  },
  replyText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  replyComposerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  replyAuthorInput: {
    width: 92,
    minWidth: 92,
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  replyBodyInput: {
    flex: 1,
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  replySubmitBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  replySubmitText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 90,
  },
  statusRow: {
    flexDirection: "row",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  statusOptionActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  statusOptionTextActive: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
