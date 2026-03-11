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
  Alert,
} from "react-native";
import { MapPin, Plus, X, Send, User, Clock, DollarSign, AlertCircle, FileText, ChevronDown, ChevronUp, Edit2, Trash2, Search } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { toKoreanErrorMessage } from "../src/utils/errorMessages";

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
const STATUS_OPTIONS = ["확정", ...WAITING_STATUSES, "보류", "취소"];
const FILTER_TABS = ["전체", "진행 중", "확정", "취소"];
const CONFLICT_STATUSES = new Set(["요청중", "확정", ...WAITING_STATUSES]);

const normalizeStatus = (status) => {
  if (!status) return "섭외지 답변 대기중";
  if (status === "섭외 중") return "섭외지 답변 대기중";
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

const formatTimeInput = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";

  if (digits.length <= 2) {
    const hour = Number(digits);
    if (!Number.isFinite(hour)) return "";
    return `${String(Math.max(0, Math.min(23, hour))).padStart(2, "0")}:00`;
  }

  const hourPart = digits.slice(0, digits.length - 2);
  const minutePart = digits.slice(-2);
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";

  const clampedHour = Math.max(0, Math.min(23, hour));
  const clampedMinute = Math.max(0, Math.min(59, minute));
  return `${String(clampedHour).padStart(2, "0")}:${String(clampedMinute).padStart(2, "0")}`;
};

const normalizeTimeValue = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return formatTimeInput(trimmed);
};

const isValidTimeRange = (startTime, endTime) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return false;
  return end > start;
};

const getSlotKey = (item) =>
  `${item.date || ""}-${item.startTime || ""}-${item.endTime || ""}`;

const toDateOnly = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

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
  project,
  locations,
  setLocations,
  currentUserName = "",
  schedule,
  setSchedule,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [editingLoc, setEditingLoc] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("전체");
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState("전체");
  const [dateExpanded, setDateExpanded] = useState(false);

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
  const [formStatus, setFormStatus] = useState("섭외지 답변 대기중");

  const [newRequest, setNewRequest] = useState("");
  const [newRequestAuthor, setNewRequestAuthor] = useState(currentUserName);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAuthorDrafts, setReplyAuthorDrafts] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());
  const [timeError, setTimeError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(editingLoc);

  useEffect(() => {
    setNewRequestAuthor((prev) => prev || currentUserName || "");
  }, [currentUserName]);

  const dateOptions = useMemo(() => {
    if (!project?.startDate) return [{ label: "전체", value: "전체" }];

    const start = new Date(project.startDate);
    const days = project.totalDays || 1;

    let options = [];
    if (days > 1) {
      options.push({ label: "전체", value: "전체" });
    }

    let current = new Date(start);
    for (let i = 0; i < days; i++) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');

      options.push({
        label: `${i + 1}일차 (${mm}/${dd})`,
        value: `${yyyy}-${mm}-${dd}`
      });
      current.setDate(current.getDate() + 1);
    }

    // Automatically set default dateFilter to the exact date if it's a 1-day project and currently set to '전체'
    if (days === 1 && dateFilter === "전체") {
      setTimeout(() => setDateFilter(options[0].value), 0);
    }

    return options;
  }, [project]);

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
    const keyword = searchVisible ? searchKeyword.trim().toLowerCase() : "";
    return locations
      .filter((loc) => {
        if (!keyword) return true;
        const name = String(loc.name || "").toLowerCase();
        const manager = String(loc.manager || "").toLowerCase();
        return name.includes(keyword) || manager.includes(keyword);
      })
      .filter((loc) => {
        const normalized = normalizeStatus(loc.status);
        if (statusFilter === "전체") return true;
        if (statusFilter === "진행 중") {
          return normalized === "요청중" || isWaitingStatus(normalized) || normalized === "보류";
        }
        if (statusFilter === "취소") {
          return normalized === "취소";
        }
        return normalized === statusFilter;
      })
      .filter((loc) => {
        if (dateFilter === "전체") return true;
        return loc.date === dateFilter;
      });
  }, [locations, searchKeyword, searchVisible, statusFilter, dateFilter]);

  const getDefaultFormDate = () => {
    if (dateFilter && dateFilter !== "전체") return dateFilter;

    const projectStart = String(project?.startDate || "").trim();
    if (projectStart) return projectStart;

    return toDateOnly(new Date());
  };

  const toValidDateObj = (dateString) => {
    const parsed = new Date(`${dateString}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const resetForm = () => {
    const defaultDate = getDefaultFormDate();
    setEditingLoc(null);
    setFormDate(defaultDate);
    setFormName("");
    setFormManager("");
    setFormStartTime("");
    setFormEndTime("");
    setFormCost("");
    setFormDepositPaid(false);
    setFormRisk("");
    setFormMemo("");
    setFormRequests([]);
    setFormStatus("섭외지 답변 대기중");
    setNewRequest("");
    setNewRequestAuthor(currentUserName);
    setReplyDrafts({});
    setReplyAuthorDrafts({});
    setDateObj(toValidDateObj(defaultDate));
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

  const openDetailModal = (loc) => {
    setSelectedLoc(loc);
    setDetailVisible(true);
  };

  const closeDetailModal = () => {
    setDetailVisible(false);
    setDetailExpanded(false);
    setSelectedLoc(null);
  };

  const openEditFromDetail = () => {
    if (!selectedLoc) return;
    setDetailVisible(false);
    openEditModal(selectedLoc);
  };

  const handleDeleteFromDetail = () => {
    if (!selectedLoc) return;

    Alert.alert(
      "장소 삭제",
      `'${selectedLoc.name || "선택한 장소"}'를 삭제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSaving(true);
              if (onDeleteLocation) {
                await onDeleteLocation(selectedLoc.id);
              } else {
                setLocations(
                  locations.filter((item) => item.id !== selectedLoc.id),
                );
              }

              setSchedule(
                schedule.filter(
                  (item) =>
                    item.locationId !== selectedLoc.id &&
                    item.location !== selectedLoc.name,
                ),
              );
              closeDetailModal();
            } catch (error) {
              Alert.alert(
                "삭제 실패",
                toKoreanErrorMessage(error, "장소 삭제에 실패했어요."),
              );
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
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

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (!formDate) {
      Alert.alert("알림", "날짜를 선택해 주세요.");
      return;
    }

    const normalizedStartTime = normalizeTimeValue(formStartTime);
    const normalizedEndTime = normalizeTimeValue(formEndTime);
    const hasAnyTime = Boolean(normalizedStartTime || normalizedEndTime);
    if (
      hasAnyTime &&
      !isValidTimeRange(normalizedStartTime, normalizedEndTime)
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
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        cost: costValue,
        depositPaid: formDepositPaid,
        risk: formRisk.trim(),
        memo: formMemo.trim(),
        requests: normalizedRequests,
        status: formStatus,
      };

      try {
        setIsSaving(true);

        if (onUpdateLocation) {
          await onUpdateLocation(editingLoc.id, {
            ...editingLoc,
            ...payload,
          });
        } else {
          setLocations(
            locations.map((item) =>
              item.id === editingLoc.id ? { ...item, ...payload } : item,
            ),
          );
        }

        // 장소 확정 시 일정에 추가 (이미 있지 않은 경우)
        if (formStatus === "확정") {
          const exists = schedule.find(
            (s) => s.locationId === editingLoc.id || s.location === formName,
          );
          if (!exists) {
            const scheduleTime = normalizedStartTime && normalizedEndTime
              ? `${normalizedStartTime} ~ ${normalizedEndTime}`
              : "미정";

            setSchedule([
              ...schedule,
              {
                id: Date.now(),
                locationId: editingLoc.id,
                time: scheduleTime,
                location: formName,
                status: "확정",
                type: "촬영",
                date: formDate,
              },
            ]);
          }
        }
        setModalVisible(false);
      } catch (error) {
        Alert.alert("저장 실패", toKoreanErrorMessage(error, "장소 수정에 실패했어요."));
      } finally {
        setIsSaving(false);
      }
    } else {
      const newLoc = {
        id: Date.now(),
        date: formDate,
        name: formName.trim(),
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        requests: normalizedRequests,
        status: "섭외지 답변 대기중",
      };

      try {
        setIsSaving(true);
        const createdLoc = onCreateLocation
          ? await onCreateLocation(newLoc)
          : newLoc;

        if (!onCreateLocation) {
          setLocations([createdLoc, ...locations]);
        }

        // 장소 확정 시 일정에 자동 추가
        if (formStatus === "확정") {
          const scheduleTime = normalizedStartTime && normalizedEndTime
            ? `${normalizedStartTime} ~ ${normalizedEndTime}`
            : "미정";

          setSchedule([
            ...schedule,
            {
              id: Date.now(),
              locationId: createdLoc.id,
              time: scheduleTime,
              location: formName,
              status: "확정",
              type: "촬영",
              date: formDate,
            },
          ]);
        }
        setModalVisible(false);
      } catch (error) {
        Alert.alert("저장 실패", toKoreanErrorMessage(error, "장소 생성에 실패했어요."));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const addRequest = () => {
    if (newRequest.trim()) {
      setFormRequests([
        ...formRequests,
        { id: Date.now(), text: newRequest, checked: false },
      ]);
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

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <View style={styles.filterDropdowns}>
          {/* Status Dropdown */}
          <View style={{ zIndex: 10, flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.dropdownTitle}>진행상태별</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setStatusExpanded(!statusExpanded);
                setDateExpanded(false);
              }}
            >
              <Text style={styles.dropdownButtonText}>{statusFilter}</Text>
              <ChevronDown size={16} color="#475569" />
            </TouchableOpacity>
            {statusExpanded && (
              <View style={[styles.dropdownMenu, { top: 44, left: 66 }]}>
                {FILTER_TABS.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setStatusFilter(status);
                      setStatusExpanded(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      statusFilter === status && styles.dropdownItemTextActive
                    ]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Date Dropdown */}
          <View style={{ zIndex: 9, marginLeft: 16, flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.dropdownTitle}>일자별</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setDateExpanded(!dateExpanded);
                setStatusExpanded(false);
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {dateOptions.find(opt => opt.value === dateFilter)?.label || "선택"}
              </Text>
              <ChevronDown size={16} color="#475569" />
            </TouchableOpacity>
            {dateExpanded && (
              <ScrollView style={[styles.dropdownMenu, { maxHeight: 200, top: 44, left: 50 }]} nestedScrollEnabled={true}>
                {dateOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDateFilter(opt.value);
                      setDateExpanded(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      dateFilter === opt.value && styles.dropdownItemTextActive
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
        <View style={styles.filterRight}>
          {/* Search Icon */}
          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={() => {
              setSearchVisible(!searchVisible);
              setStatusExpanded(false);
              setDateExpanded(false);
              if (searchVisible) setSearchKeyword(""); // Clear on hide
            }}
          >
            <Search size={20} color={searchVisible ? "#4F46E5" : "#64748B"} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Search Input Section */}
      {
        searchVisible && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInputActive}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="섭외지 관련 내용 검색"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
          </View>
        )
      }

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
              onPress={() => openDetailModal(loc)}
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
      {/* 새 장소 섭외 작성 플로팅 버튼 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddModal}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={detailVisible} transparent={true} animationType="fade">
        <View style={styles.detailOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>장소 정보</Text>
              <TouchableOpacity onPress={closeDetailModal}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedLoc ? (
              (() => {
                const requestCount = normalizeRequestThreads(
                  selectedLoc.requests || [],
                ).length;
                const dateTimeText = `${selectedLoc.date || "-"}${selectedLoc.startTime && selectedLoc.endTime
                  ? `\n${selectedLoc.startTime} ~ ${selectedLoc.endTime}`
                  : ""
                  }`;
                const costText =
                  selectedLoc.cost !== null && selectedLoc.cost !== undefined
                    ? `₩ ${Number(selectedLoc.cost || 0).toLocaleString("ko-KR")}${selectedLoc.depositPaid ? " · 선금 Y" : " · 선금 N"
                    }`
                    : "-";

                const statusStyle = getStatusBadgeStyle(normalizeStatus(selectedLoc.status));

                return (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                    {/* 기본 정보 카드 */}
                    <View style={styles.premiumDetailCard}>
                      {/* 장소명 항목 */}
                      <View style={styles.premiumRow}>
                        <View style={styles.premiumLabelGroup}>
                          <MapPin size={16} color="#6366F1" style={styles.premiumIcon} />
                          <Text style={styles.premiumLabel}>장소명</Text>
                        </View>
                        <Text style={styles.premiumValue}>
                          {selectedLoc.name || "-"}
                        </Text>
                      </View>

                      <View style={styles.premiumSeparator} />

                      {/* 상태 항목 - 배지 스타일 */}
                      <View style={styles.premiumRow}>
                        <View style={styles.premiumLabelGroup}>
                          <AlertCircle size={16} color="#6366F1" style={styles.premiumIcon} />
                          <Text style={styles.premiumLabel}>상태</Text>
                        </View>
                        <View style={[styles.statusMiniBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusMiniBadgeText, { color: statusStyle.text }]}>
                            {normalizeStatus(selectedLoc.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumSeparator} />

                      {/* 촬영일시 항목 */}
                      <View style={styles.premiumRow}>
                        <View style={styles.premiumLabelGroup}>
                          <Clock size={16} color="#6366F1" style={styles.premiumIcon} />
                          <Text style={styles.premiumLabel}>촬영일시</Text>
                        </View>
                        <Text style={styles.premiumValue}>
                          {dateTimeText}
                        </Text>
                      </View>

                      <View style={styles.premiumSeparator} />

                      {/* 담당자 항목 */}
                      <View style={styles.premiumRow}>
                        <View style={styles.premiumLabelGroup}>
                          <User size={16} color="#6366F1" style={styles.premiumIcon} />
                          <Text style={styles.premiumLabel}>담당자</Text>
                        </View>
                        <Text style={styles.premiumValue} numberOfLines={1}>
                          {selectedLoc.manager || "-"}
                        </Text>
                      </View>
                    </View>

                    {/* 세부 정보 토글 버튼 */}
                    <TouchableOpacity
                      style={styles.premiumExpandToggle}
                      onPress={() => setDetailExpanded(!detailExpanded)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.premiumExpandText}>
                        {detailExpanded ? "상세 정보 숨기기" : "상세 정보 더보기"}
                      </Text>
                      {detailExpanded ? (
                        <ChevronUp size={16} color="#6366F1" />
                      ) : (
                        <ChevronDown size={16} color="#6366F1" />
                      )}
                    </TouchableOpacity>

                    {/* 확장 섹션 */}
                    {detailExpanded && (
                      <View style={styles.premiumExpandSection}>
                        {selectedLoc.cost !== null && selectedLoc.cost !== undefined && (
                          <>
                            <View style={styles.premiumRow}>
                              <View style={styles.premiumLabelGroup}>
                                <DollarSign size={16} color="#64748B" style={styles.premiumIcon} />
                                <Text style={styles.premiumLabel}>비용/선금</Text>
                              </View>
                              <Text style={styles.premiumValue}>{costText}</Text>
                            </View>
                            {(requestCount > 0 || selectedLoc.risk || selectedLoc.memo) && <View style={styles.premiumSeparator} />}
                          </>
                        )}

                        {requestCount > 0 && (
                          <>
                            <View style={styles.premiumRow}>
                              <View style={styles.premiumLabelGroup}>
                                <Send size={16} color="#64748B" style={styles.premiumIcon} />
                                <Text style={styles.premiumLabel}>요청사항</Text>
                              </View>
                              <Text style={styles.premiumValue}>{requestCount}건</Text>
                            </View>
                            {(selectedLoc.risk || selectedLoc.memo) && <View style={styles.premiumSeparator} />}
                          </>
                        )}

                        {selectedLoc.risk && (
                          <>
                            <View style={styles.premiumRow}>
                              <View style={styles.premiumLabelGroup}>
                                <AlertCircle size={16} color="#E11D48" style={styles.premiumIcon} />
                                <Text style={[styles.premiumLabel, { color: "#E11D48" }]}>리스크</Text>
                              </View>
                              <Text style={[styles.premiumValue, { color: "#E11D48" }]}>
                                {selectedLoc.risk}
                              </Text>
                            </View>
                            {selectedLoc.memo && <View style={styles.premiumSeparator} />}
                          </>
                        )}

                        {selectedLoc.memo && (
                          <View style={{ paddingVertical: 12 }}>
                            <View style={[styles.premiumLabelGroup, { marginBottom: 8 }]}>
                              <FileText size={16} color="#64748B" style={styles.premiumIcon} />
                              <Text style={styles.premiumLabel}>메모</Text>
                            </View>
                            <View style={styles.premiumMemoContainer}>
                              <Text style={styles.premiumMemoText}>{selectedLoc.memo}</Text>
                            </View>
                          </View>
                        )}

                        {/* 모든 정보가 없을 경우 안내 문구 (선택사항) */}
                        {!(selectedLoc.cost !== null && selectedLoc.cost !== undefined) && requestCount === 0 && !selectedLoc.risk && !selectedLoc.memo && (
                          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#94A3B8', fontSize: 13 }}>등록된 상세 정보가 없습니다.</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                );
              })()
            ) : null}

            <View style={styles.detailFooterRow}>
              <TouchableOpacity
                style={[styles.premiumEditButton, styles.detailActionButton]}
                onPress={openEditFromDetail}
                disabled={isSaving || !selectedLoc}
              >
                <Edit2 size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={styles.premiumEditButtonText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.premiumDeleteButton, styles.detailActionButton]}
                onPress={handleDeleteFromDetail}
                disabled={isSaving || !selectedLoc}
              >
                <Trash2 size={16} color="#E11D48" style={{ marginRight: 6 }} />
                <Text style={styles.premiumDeleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                    onChangeText={(value) =>
                      setFormStartTime(String(value || "").replace(/\D/g, "").slice(0, 4))
                    }
                    onBlur={() =>
                      setFormStartTime((prev) => normalizeTimeValue(prev))
                    }
                    placeholder="09:00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>종료 시간</Text>
                  <TextInput
                    style={styles.input}
                    value={formEndTime}
                    onChangeText={(value) =>
                      setFormEndTime(String(value || "").replace(/\D/g, "").slice(0, 4))
                    }
                    onBlur={() => setFormEndTime((prev) => normalizeTimeValue(prev))}
                    placeholder="11:00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
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
                  style={styles.requestComposerInput}
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
                  <Send size={16} color="#FFF" />
                </TouchableOpacity>
              </View>

              {formRequests.map((thread) => (
                <View key={thread.id} style={styles.miniThreadCard}>
                  <View style={styles.threadHeader}>
                    <View style={styles.miniThreadTitleRow}>
                      <User size={14} color="#64748B" />
                      <Text style={styles.threadAuthor}>{thread.author}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeRequestThread(thread.id)}
                      style={styles.threadDeleteBtn}
                    >
                      <X size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  {[
                    {
                      id: `root-${thread.id}`,
                      author: thread.author,
                      text: thread.text,
                      isRoot: true,
                    },
                    ...(thread.replies || []).map((reply) => ({
                      id: reply.id,
                      author: reply.author,
                      text: reply.text,
                      isRoot: false,
                    })),
                  ].map((message) => {
                    const mine =
                      String(message.author || "").trim() ===
                      String(currentUserName || "").trim() &&
                      Boolean(currentUserName);
                    return (
                      <View
                        key={message.id}
                        style={[
                          styles.miniMessageRow,
                          mine
                            ? styles.miniMessageRowMine
                            : styles.miniMessageRowOther,
                        ]}
                      >
                        {!mine ? (
                          <View style={styles.miniAvatar}>
                            <User size={12} color="#64748B" />
                          </View>
                        ) : null}
                        <View
                          style={[
                            styles.miniMessageBubble,
                            mine
                              ? styles.miniBubbleMine
                              : styles.miniBubbleOther,
                          ]}
                        >
                          {!mine ? (
                            <Text style={styles.miniSenderText}>
                              {message.author || "댓글"}
                            </Text>
                          ) : null}
                          <Text
                            style={[
                              styles.miniMessageText,
                              mine
                                ? styles.miniMessageTextMine
                                : styles.miniMessageTextOther,
                            ]}
                          >
                            {message.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.replyComposerRow}>
                    <TextInput
                      style={styles.replyComposerInput}
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
                      <Send size={15} color="#FFF" />
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

            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? "저장 중..." : "저장"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    zIndex: 10,
  },
  filterDropdowns: {
    flexDirection: "row",
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
    marginRight: 6,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 80,
    justifyContent: "space-between",
  },
  dropdownMenu: {
    position: "absolute",
    top: 64,
    left: 0,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#475569",
  },
  dropdownItemTextActive: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  filterRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  countText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  countNumber: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputActive: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#4F46E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1E293B",
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 120, // 바텀 탭 네비게이션과 겹치지 않게 조절
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  detailModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  requestComposerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 0,
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
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  miniThreadCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  miniThreadTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniMessageRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-end",
  },
  miniMessageRowMine: {
    justifyContent: "flex-end",
  },
  miniMessageRowOther: {
    justifyContent: "flex-start",
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  miniMessageBubble: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: "82%",
  },
  miniBubbleMine: {
    backgroundColor: "#4F46E5",
    borderBottomRightRadius: 4,
  },
  miniBubbleOther: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomLeftRadius: 4,
  },
  miniSenderText: {
    fontSize: 10,
    color: "#94A3B8",
    marginBottom: 2,
    fontWeight: "700",
  },
  miniMessageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  miniMessageTextMine: {
    color: "#FFF",
  },
  miniMessageTextOther: {
    color: "#1E293B",
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
    marginTop: 2,
  },
  replyComposerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 0,
    color: "#1E293B",
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
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  replySubmitText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  // 프리미엄 상세 모달 스타일
  premiumDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
  },
  premiumLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumIcon: {
    marginRight: 8,
  },
  premiumLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  premiumValue: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  premiumSeparator: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  statusMiniBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusMiniBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  premiumExpandToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  premiumExpandText: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "700",
    marginRight: 6,
  },
  premiumExpandSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  premiumMemoContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  premiumMemoText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  premiumEditButton: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumEditButtonText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
  premiumDeleteButton: {
    flexDirection: "row",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumDeleteButtonText: {
    color: "#E11D48",
    fontSize: 15,
    fontWeight: "700",
  },
  readonlyBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  readonlyText: {
    color: "#1E293B",
    fontSize: 14,
    lineHeight: 20,
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
  detailFooterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 0,
    paddingBottom: 4,
  },
  detailActionButton: {
    flex: 1,
    marginTop: 0,
  },
});
