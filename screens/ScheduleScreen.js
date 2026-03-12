import React, { useState, useRef, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Platform, Alert, ActivityIndicator } from "react-native";
import { Edit2, X, Trash2, ChevronDown, Plus, MapPin, AlertCircle, Calendar, Clock, ClipboardList, Search, UserPlus } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScheduleBoard } from "../components/ScheduleBoard";
import { toKoreanErrorMessage } from "../src/utils/errorMessages";
import { searchUsers } from "../src/api/profiles";
import { useAuth } from "../src/hooks/useAuth";


export const ScheduleScreen = ({ projects = [], setProjects, deleteProject, updateProject, schedule = [], locations = [], expandedProjId, setExpandedProjId, addScheduleItem }) => {
  const scrollViewRef = useRef(null);
  const { user } = useAuth();
  const [cardLayouts, setCardLayouts] = useState({});
  const [statusFilter, setStatusFilter] = useState("전체");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dateFilter, setDateFilter] = useState("전체");
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    if (expandedProjId && cardLayouts[expandedProjId] !== undefined) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: cardLayouts[expandedProjId], animated: true });
      }, 50);
    }
  }, [expandedProjId, cardLayouts]);

  useEffect(() => {
    setStatusFilter("전체");
    setDateFilter("전체");
    setSearchKeyword("");
    setSearchVisible(false);
  }, [expandedProjId]);

  const dateOptions = useMemo(() => {
    const proj = projects.find(p => p.id === expandedProjId);
    if (!proj || !proj.startDate) return [{ label: "전체", value: "전체" }];

    const start = new Date(proj.startDate);
    const days = proj.totalDays || 1;

    let options = [{ label: "전체", value: "전체" }];

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
    return options;
  }, [expandedProjId, projects]);

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

  const [addSchedModalVisible, setAddSchedModalVisible] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDate, setSchedDate] = useState(new Date());
  const [schedStartTime, setSchedStartTime] = useState("09:00");
  const [schedEndTime, setSchedEndTime] = useState("11:00");
  const [schedNote, setSchedNote] = useState("");
  const [schedStatus, setSchedStatus] = useState("확정");
  const [showSchedDatePicker, setShowSchedDatePicker] = useState(false);
  const [dayExpanded, setDayExpanded] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [locExpanded, setLocExpanded] = useState(false); // 장소 드롭다운 상태 추가
  const [selectedLocId, setSelectedLocId] = useState(null); // 선택된 장소 ID 추적

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // 멤버 검색 및 선택 상태
  const [memberQuery, setMemberQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searching, setSearching] = useState(false);

  // 프로젝트 수정 폼 상태
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState("start");

  // 사용자 검색 로직 (0.5초 디바운싱)
  useEffect(() => {
    const currentQuery = memberQuery.trim();
    if (currentQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        console.log(`[EditSearch] Requesting API for: "${currentQuery}"`);
        const results = await searchUsers(currentQuery);
        if (currentQuery !== memberQuery.trim()) return;

        // 현재 로그인한 본인 및 이미 선택된 멤버 제외
        const filtered = results.filter(r => {
          const isAlreadySelected = selectedMembers.some(sm => sm.id === r.id);
          const isMe = r.id === user?.id;
          return !isAlreadySelected && !isMe;
        });

        setSearchResults(filtered);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [memberQuery, selectedMembers]);

  const openEditModal = (proj) => {
    setEditingProject(proj);
    setFormTitle(proj.title);
    setFormNote(proj.note || "");

    // 참여 멤버 초기화 (all_members 데이터를 selectedMembers 형식으로 변환)
    if (proj.all_members) {
      const initialMembers = proj.all_members.map(m => ({
        id: m.user_id,
        email: m.profiles?.email,
        nickname: m.profiles?.nickname
      }));
      setSelectedMembers(initialMembers);
    } else {
      setSelectedMembers([]);
    }
    setMemberQuery("");

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

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    // Calculate days
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    let totalDays = 0;
    if (endDay >= startDay) {
      const diffTime = Math.abs(endDay - startDay);
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const updatedData = {
      title: formTitle,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      totalDays,
      note: formNote,
      memberIds: selectedMembers.map(m => m.id), // 수정된 멤버 ID 리스트 추가
    };

    console.log(`[Edit] Attempting to update project ${editingProject?.id}:`, updatedData);

    if (updateProject) {
      const result = await updateProject(editingProject.id, updatedData);
      if (result.success) {
        setEditModalVisible(false);
      } else {
        Alert.alert("수정 실패", toKoreanErrorMessage(result.error, "프로젝트 정보를 수정하는 중 문제가 발생했습니다."));
      }
    } else {
      // Fallback for demo
      const updatedProject = {
        ...editingProject,
        ...updatedData
      };
      setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
      setEditModalVisible(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!schedTitle.trim()) {
      Alert.alert("알림", "일정 제목을 입력해주세요.");
      return;
    }

    const mapStatusToDb = (st) => {
      if (st === "확정") return "confirmed";
      if (st === "취소") return "hold";
      return "requested"; // 진행 중
    };

    const payload = {
      locationId: selectedLocId, // 선택된 기존 장소 ID 포함
      title: schedTitle,
      status: mapStatusToDb(schedStatus),
      shooting_time: `${schedStartTime} ~ ${schedEndTime}`,
      location_date: formatDate(schedDate),
      note: schedNote,
    };

    if (addScheduleItem) {
      const result = await addScheduleItem(payload);
      if (result.success) {
        setAddSchedModalVisible(false);
        // 필드 초기화
        setSchedTitle("");
        setSchedNote("");
        setSchedStartTime("09:00");
        setSchedEndTime("11:00");
        setSchedDate(new Date());
        setSchedStatus("확정");
        setSelectedLocId(null);
      } else {
        Alert.alert("저장 실패", toKoreanErrorMessage(result.error, "일정을 추가하는 중 문제가 발생했습니다."));
      }
    } else {
      // Prop이 없는 경우 fallback (UI 데모용)
      setAddSchedModalVisible(false);
    }
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
                Alert.alert("삭제 실패", toKoreanErrorMessage(result.error, "프로젝트 삭제 중 문제가 발생했어요."));
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
    : [];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>프로젝트 상세 일정</Text>

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
                  // 이미 선택된 상태에서는 접히지 않도록(null이 되지 않도록) 고정합니다.
                  setExpandedProjId(proj.id);
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

                {proj.all_members && proj.all_members.length > 0 ? (
                  <View style={styles.detailSubTextRow}>
                    <Text style={[styles.detailSubText, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                      참여 인원: {proj.all_members.map(m => m.profiles?.nickname || m.profiles?.email || 'Unknown').join(', ')}
                    </Text>
                    <View style={styles.inlineBadge}>
                      <Text style={styles.inlineBadgeText}>
                        총 {proj.all_members.length}명
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
                    <Text style={styles.sectionTitle}>{proj.title} 촬영 일정</Text>
                    <View style={styles.dDayBadge}>
                      <Text style={styles.dDayText}>{getDDay(proj.startDate)}</Text>
                    </View>
                  </View>

                  <View style={styles.filterBar}>
                    <View style={styles.filterDropdowns}>
                      {/* Status Dropdown */}
                      <View style={{ zIndex: 10, flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.dropdownTitle}>진행상태별</Text>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => {
                            setShowStatusDropdown(!showStatusDropdown);
                            setShowDayDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownButtonText}>{statusFilter}</Text>
                          <ChevronDown size={14} color="#64748B" />
                        </TouchableOpacity>
                        {showStatusDropdown && (
                          <View style={[styles.dropdownMenu, { top: 40, left: 66 }]}>
                            {["전체", "진행 중", "확정", "보류", "취소"].map(st => (
                              <TouchableOpacity
                                key={st}
                                style={styles.dropdownItem}
                                onPress={() => { setStatusFilter(st); setShowStatusDropdown(false); }}
                              >
                                <Text style={[styles.dropdownItemText, statusFilter === st && styles.dropdownItemTextActive]}>{st}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Date Dropdown */}
                      <View style={{ zIndex: 9, marginLeft: 10, flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.dropdownTitle}>일자별</Text>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => {
                            setShowDayDropdown(!showDayDropdown);
                            setShowStatusDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownButtonText}>
                            {dateOptions.find(opt => opt.value === dateFilter)?.label || "선택"}
                          </Text>
                          <ChevronDown size={14} color="#64748B" />
                        </TouchableOpacity>
                        {showDayDropdown && (
                          <ScrollView style={[styles.dropdownMenu, { maxHeight: 200, top: 40, left: 50 }]} nestedScrollEnabled={true}>
                            {dateOptions.map(opt => (
                              <TouchableOpacity
                                key={opt.value}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setDateFilter(opt.value);
                                  setShowDayDropdown(false);
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
                      <TouchableOpacity
                        style={styles.searchIconButton}
                        onPress={() => {
                          setSearchVisible(!searchVisible);
                          if (searchVisible) setSearchKeyword("");
                        }}
                      >
                        <Search size={18} color={searchVisible ? "#4F46E5" : "#64748B"} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {searchVisible && (
                    <View style={styles.searchContainer}>
                      <TextInput
                        style={styles.searchInputActive}
                        value={searchKeyword}
                        onChangeText={setSearchKeyword}
                        placeholder="일정 내용 검색"
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                      />
                    </View>
                  )}

                  <ScheduleBoard
                    schedule={schedule.filter(item => {
                      if (!item.date || !proj.startDate || !proj.endDate) return false;

                      const itemDateObj = new Date(item.date);
                      const sDate = new Date(proj.startDate);
                      const eDate = new Date(proj.endDate);
                      const isInRange = itemDateObj >= sDate && itemDateObj <= eDate;
                      if (!isInRange) return false;

                      if (statusFilter !== "전체" && item.status !== statusFilter) return false;
                      if (dateFilter !== "전체" && item.date !== dateFilter) return false;

                      if (searchKeyword.trim()) {
                        const kw = searchKeyword.toLowerCase();
                        return (item.location || "").toLowerCase().includes(kw) || (item.note || "").toLowerCase().includes(kw);
                      }

                      return true;
                    }).sort((a, b) => new Date(a.date + 'T' + a.time.split(' ~ ')[0]) - new Date(b.date + 'T' + b.time.split(' ~ ')[0]))}
                    projectStartDate={proj.startDate}
                  />
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {!expandedProjId
                ? "홈 탭에서 프로젝트를 먼저 선택해주세요."
                : "선택한 프로젝트를 찾을 수 없거나 삭제되었습니다."}
            </Text>
            {!expandedProjId && (
              <TouchableOpacity
                style={styles.goHomeBtn}
                onPress={() => {
                  // 부모 컴포넌트(App.js)의 setActiveTab에 접근할 수 없으므로 
                  // 이 부분은 App.js에서 주입받거나 구조적 개선이 필요할 수 있으나,
                  // 우선은 텍스트 안내로 충분합니다.
                }}
              >
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>

      {/* 우측 하단 추가 버튼 (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (!expandedProjId) {
            Alert.alert("알림", "일정을 추가하려면 먼저 프로젝트를 선택해주세요.");
            return;
          }
          setAddSchedModalVisible(true);
        }}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

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

              <Text style={styles.label}>참여 인원 검색</Text>
              <View style={styles.searchWrapper}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchField}
                  placeholder="이름 또는 이메일 검색"
                  placeholderTextColor="#94A3B8"
                  value={memberQuery}
                  onChangeText={setMemberQuery}
                />
                {searching && <ActivityIndicator size="small" color="#4F46E5" style={{ marginLeft: 8 }} />}
              </View>

              {/* 검색 결과 리스트 */}
              {searching ? (
                <View style={styles.searchingStatus}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text style={styles.searchingText}>사용자 찾는 중...</Text>
                </View>
              ) : memberQuery.length >= 2 ? (
                searchResults.length > 0 ? (
                  <View style={styles.searchResultsContainer}>
                    {searchResults.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.searchItem}
                        onPress={() => {
                          setSelectedMembers([...selectedMembers, u]);
                          setMemberQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <View style={styles.avatarMini}>
                          <Text style={styles.avatarTextMini}>{u.nickname?.[0] || "U"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchItemName}>{u.nickname || "Unknown"}</Text>
                          <Text style={styles.searchItemEmail}>{u.email}</Text>
                        </View>
                        <UserPlus size={18} color="#4F46E5" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptySearchContainer}>
                    <Text style={styles.emptySearchText}>검색 결과가 없습니다.</Text>
                  </View>
                )
              ) : null}

              {/* 선택된 멤버 태그Cloud */}
              {selectedMembers.length > 0 && (
                <View style={styles.tagCloud}>
                  {selectedMembers.map((m) => {
                    // 프로젝트 생성자(owner)는 삭제 버튼 표시 안 함 (옵션)
                    const isOwner = editingProject?.created_by === m.id;
                    return (
                      <View key={m.id} style={[styles.memberTag, isOwner && { backgroundColor: '#94A3B8' }]}>
                        <Text style={styles.memberTagText}>
                          {m.nickname || m.email}{isOwner ? ' (Owner)' : ''}
                        </Text>
                        {!isOwner && (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedMembers(selectedMembers.filter((sm) => sm.id !== m.id))
                            }
                          >
                            <X size={14} color="#FFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

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

      {/* 새 일정 추가 모달 (중앙 팝업 방식) */}
      <Modal visible={addSchedModalVisible} animationType="fade" transparent={true}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 일정 추가</Text>
              <TouchableOpacity onPress={() => setAddSchedModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={[styles.premiumDetailCard, { padding: 16 }]}>
                {/* 1. 소속 프로젝트 정보 (Readonly) */}
                <View style={styles.premiumRow}>
                  <View style={styles.premiumLabelGroup}>
                    <AlertCircle size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>소속 프로젝트</Text>
                  </View>
                  <Text style={[styles.premiumValue, { color: "#64748B", flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                    {projects.find(p => p.id === expandedProjId)?.title || "선택된 프로젝트 없음"}
                  </Text>
                </View>

                <View style={styles.premiumSeparator} />

                {/* 2. 일차 선택 (Day Dropdown) */}
                <View style={[styles.premiumRow, { zIndex: 120 }]}>
                  <View style={styles.premiumLabelGroup}>
                    <Calendar size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>일차 선택</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      style={[styles.dropdownButton, { minWidth: 100, height: 32, paddingVertical: 0 }]}
                      onPress={() => {
                        setDayExpanded(!dayExpanded);
                        setLocExpanded(false);
                        setStatusExpanded(false);
                      }}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {(() => {
                          const p = projects.find(proj => proj.id === expandedProjId);
                          if (!p?.startDate) return "1일차";
                          const diff = Math.floor((schedDate - new Date(p.startDate)) / (1000 * 60 * 60 * 24));
                          return `${diff + 1}일차`;
                        })()}
                      </Text>
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    {dayExpanded && (
                      <View style={[styles.dropdownMenu, { top: 35, right: 0, minWidth: 100, maxHeight: 150 }]}>
                        <ScrollView nestedScrollEnabled={true}>
                          {Array.from({ length: projects.find(p => p.id === expandedProjId)?.totalDays || 1 }, (_, i) => (
                            <TouchableOpacity
                              key={i}
                              style={styles.dropdownItem}
                              onPress={() => {
                                const p = projects.find(proj => proj.id === expandedProjId);
                                if (p?.startDate) {
                                  const newDate = new Date(p.startDate);
                                  newDate.setDate(newDate.getDate() + i);
                                  setSchedDate(newDate);
                                  // 일차가 바뀌면 선택된 장소 초기화
                                  setSchedTitle("");
                                  setSchedStartTime("");
                                  setSchedEndTime("");
                                  setSchedStatus("확정");
                                }
                                setDayExpanded(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{i + 1}일차</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.premiumSeparator} />

                {/* 3. 장소 선택 (Dropdown) - 선택된 일차에 해당하는 장소만 표시 */}
                <View style={[styles.premiumRow, { zIndex: 110 }]}>
                  <View style={styles.premiumLabelGroup}>
                    <MapPin size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>장소 선택</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      style={[styles.dropdownButton, { minWidth: 150, height: 32, paddingVertical: 0 }]}
                      onPress={() => {
                        setLocExpanded(!locExpanded);
                        setDayExpanded(false);
                        setStatusExpanded(false);
                      }}
                    >
                      <Text style={[styles.dropdownButtonText, { flex: 1 }]} numberOfLines={1}>
                        {schedTitle || "장소를 선택하세요"}
                      </Text>
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    {locExpanded && (
                      <View style={[styles.dropdownMenu, { top: 35, right: 0, minWidth: 200, maxHeight: 200 }]}>
                        <ScrollView nestedScrollEnabled={true}>
                          {locations
                            .filter(l => (l.project_id === expandedProjId || !l.project_id))
                            .filter(l => (l.location_date || l.date) === formatDate(schedDate)) // 선택된 날짜와 일치하는 장소만 필터링
                            .map(loc => (
                              <TouchableOpacity
                                key={loc.id}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setSchedTitle(loc.name || loc.title || "");
                                  setSelectedLocId(loc.id); // 장소 ID 저장
                                  if (loc.shooting_time || loc.startTime) {
                                    const timeStr = loc.shooting_time || `${loc.startTime} ~ ${loc.endTime}`;
                                    if (timeStr.includes("~")) {
                                      const [start, end] = timeStr.split("~").map(s => s.trim());
                                      setSchedStartTime(start);
                                      setSchedEndTime(end);
                                    } else {
                                      setSchedStartTime(loc.startTime || "09:00");
                                      setSchedEndTime(loc.endTime || "11:00");
                                    }
                                  }
                                  setSchedStatus(loc.status === 'confirmed' ? "확정" : "진행 중");
                                  setSchedNote(loc.note || loc.memo || "");
                                  setLocExpanded(false);
                                }}
                              >
                                <View>
                                  <Text style={styles.dropdownItemText}>{loc.name || loc.title}</Text>
                                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>{loc.shooting_time || `${loc.startTime}~${loc.endTime}` || "시간 미정"}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          {locations
                            .filter(l => (l.project_id === expandedProjId || !l.project_id))
                            .filter(l => (l.location_date || l.date) === formatDate(schedDate)).length === 0 && (
                              <View style={{ padding: 12, alignItems: 'center' }}>
                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>해당 일차에 등록된 장소가 없습니다.</Text>
                              </View>
                            )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.premiumSeparator} />

                {/* 4. 날짜 (Readonly - 일차와 연동됨) */}
                <View style={styles.premiumRow}>
                  <View style={styles.premiumLabelGroup}>
                    <Calendar size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>날짜</Text>
                  </View>
                  <Text style={[styles.premiumValue, { color: '#64748B' }]}>{formatDate(schedDate)}</Text>
                </View>

                <View style={styles.premiumSeparator} />

                {/* 5. 진행 시간 (Readonly) */}
                <View style={styles.premiumRow}>
                  <View style={styles.premiumLabelGroup}>
                    <Clock size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>진행 시간</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.premiumValue, { color: '#64748B' }]}>
                      {schedStartTime || "미정"} ~ {schedEndTime || "미정"}
                    </Text>
                  </View>
                </View>

                <View style={styles.premiumSeparator} />

                {/* 6. 섭외 상태 (Readonly) */}
                <View style={styles.premiumRow}>
                  <View style={styles.premiumLabelGroup}>
                    <AlertCircle size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>섭외 상태</Text>
                  </View>
                  <View style={[styles.statusBadge, schedStatus === "확정" ? styles.statusConfirmed : styles.statusPending]}>
                    <Text style={[styles.statusBadgeText, schedStatus === "확정" ? styles.statusTextConfirmed : styles.statusTextPending]}>
                      {schedStatus}
                    </Text>
                  </View>
                </View>

                <View style={styles.premiumSeparator} />

                {/* 7. 메모 사항 */}
                <View style={{ paddingVertical: 12 }}>
                  <View style={[styles.premiumLabelGroup, { marginBottom: 8 }]}>
                    <ClipboardList size={16} color="#6366F1" style={styles.premiumIcon} />
                    <Text style={styles.premiumLabel}>메모 사항</Text>
                  </View>
                  <View style={styles.premiumMemoContainer}>
                    <TextInput
                      style={styles.premiumMemoInput}
                      value={schedNote}
                      onChangeText={setSchedNote}
                      placeholder="세부 내용을 입력하세요..."
                      multiline={true}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddSchedModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 1, marginTop: 0, marginBottom: 0 }]}
                onPress={handleAddSchedule}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
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
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    paddingVertical: 4,
    minWidth: 80,
    justifyContent: "space-between",
  },
  dropdownButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0, // 컨테이너 기준으로 오른쪽에 위치
    width: 120, // 메뉴 너비 고정 (내용이 잘리지 않도록 버튼보다 약간 넓게)
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 100,
    maxHeight: 250,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EEF2FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  filterRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputActive: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#4F46E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E293B",
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
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popupContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 16,
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
  premiumDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  premiumLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumIcon: { marginRight: 8 },
  premiumLabel: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  premiumValue: { fontSize: 15, color: "#1E293B", fontWeight: "700" },
  premiumSeparator: { height: 1, backgroundColor: "#F1F5F9" },
  premiumMemoContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    minHeight: 100,
  },
  premiumMemoInput: { fontSize: 14, color: "#475569", lineHeight: 22, textAlignVertical: 'top' },
  timeInputSmall: {
    width: 60,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    textAlign: 'center',
    paddingVertical: 2,
    fontSize: 14,
  },
  // 신규 멤버 관리 스타일
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
  },
  searchField: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  searchingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  searchingText: {
    marginLeft: 8,
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultsContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTextMini: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  searchItemEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  emptySearchContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptySearchText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  memberTagText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
