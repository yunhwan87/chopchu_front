import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Home,
  List,
  Map,
  Bell,
} from "lucide-react-native";

// 1. 분리된 스크린 컴포넌트 임포트 (경로 확인 완료)
import { DashboardScreen } from "./screens/DashboardScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { CommunicationScreen } from "./screens/CommunicationScreen";
import { AuthScreen } from "./screens/AuthScreen";

// 중앙 관리형 데이터 (기존 유지)
const MOCK_DATA = {
  projects: [
    {
      id: 1,
      title: "파리 패션위크 촬영",
      members: "홍길동, 김제작",
      totalDays: 3,
      startDate: "2026-04-10",
      endDate: "2026-04-12",
      note: "주요 패션위크 촬영 건",
      risks: 2,
      pendingQuestions: 3,
    },
    {
      id: 2,
      title: "뉴욕 FW 캠페인",
      members: "이촬영, 김제작",
      totalDays: 5,
      startDate: "2026-05-15",
      endDate: "2026-05-19",
      note: "브루클린 야외 로케이션 포함",
      risks: 1,
      pendingQuestions: 1,
    },
    {
      id: 3,
      title: "서울 상반기 화보",
      members: "최조명, 박현장",
      totalDays: 2,
      startDate: "2026-06-01",
      endDate: "2026-06-02",
      note: "스튜디오 및 근교 야외 촬영",
      risks: 0,
      pendingQuestions: 5,
    },
    {
      id: 4,
      title: "도쿄 스트릿 룩북",
      members: "홍길동",
      totalDays: 4,
      startDate: "2026-06-20",
      endDate: "2026-06-23",
      note: "거리 촬영 허가 건 확인 필요",
      risks: 3,
      pendingQuestions: 2,
    },
    {
      id: 5,
      title: "여름 리조트 컬렉션",
      members: "김제작, 최조명, 강모델",
      totalDays: 5,
      startDate: "2026-07-10",
      endDate: "2026-07-14",
      note: "제주도 해변 로케이션",
      risks: 0,
      pendingQuestions: 0,
    },
    {
      id: 6,
      title: "가을/겨울 선공개",
      members: "박현장",
      totalDays: 1,
      startDate: "2026-08-05",
      endDate: "2026-08-05",
      note: "실내 스튜디오",
      risks: 1,
      pendingQuestions: 1,
    }
  ],
  schedule: [
    {
      id: 1,
      time: "09:00",
      location: "에펠탑 광장",
      status: "확정",
      type: "촬영",
      date: "2026-04-10"
    },
    {
      id: 2,
      time: "13:00",
      location: "루브르 박물관 내부",
      status: "섭외 중",
      type: "촬영",
      date: "2026-04-10"
    },
    {
      id: 3,
      time: "15:30",
      location: "센강 유람선",
      status: "초안",
      type: "이동/촬영",
      date: "2026-04-11"
    },
    {
      id: 4,
      time: "18:00",
      location: "개선문 디너 장소",
      status: "확정",
      type: "식사",
      date: "2026-04-11"
    },
    {
      id: 5,
      time: "19:30",
      location: "몽마르뜨 언덕",
      status: "섭외 중",
      type: "촬영",
      date: "2026-04-12"
    },
    {
      id: 6,
      time: "21:00",
      location: "호텔 세트장",
      status: "확정",
      type: "휴식",
      date: "2026-04-12"
    },
    {
      id: 7,
      time: "10:00",
      location: "베르사유 궁전",
      status: "섭외 중",
      type: "예비",
      date: "2026-04-15" // 이 일정은 프로젝트 기간 밖으로 두어 필터링 테스트용으로 씀
    }
  ],
  locations: [
    { id: 1, name: "에펠탑 광장", status: "확정", cost: "€1,200", date: "2026-04-10" },
    { id: 2, name: "루브르 박물관", status: "섭외 중", cost: "미정", date: "2026-04-10" },
    { id: 3, name: "브루클린 다리", status: "요청중", cost: "$500", date: "2026-05-15" },
    { id: 4, name: "강남 A 스튜디오", status: "확정", cost: "₩1,000,000", date: "2026-06-01" },
    { id: 5, name: "제주 중문 해변", status: "확정", cost: "₩300,000", date: "2026-07-10" },
    { id: 6, name: "시부야 교차로", status: "섭외 중", cost: "¥50,000", date: "2026-06-20" },
    { id: 7, name: "센강 유람선", status: "요청중", cost: "미정", date: "2026-04-11" }
  ],
  questions: [
    {
      id: 1,
      askedBy: "김제작",
      question: "드론 촬영 허가증 나왔나요?",
      status: "답변대기",
    },
    {
      id: 2,
      askedBy: "김제작",
      question: "차량 예약 확인 부탁해요.",
      status: "답변완료",
      answer: "예약 완료되었습니다.",
    },
  ],
};


import { useAuth } from "./src/hooks/useAuth";
import { useProjects } from "./src/hooks/useProjects";
import { TempProjectSelectorScreen } from "./screens/TempProjectSelectorScreen";
import { useEffect, useMemo } from "react";

function MainContent({ onLogout, currentProject, onBackToProjects, currentUserName, onSelectProject }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [locations, setLocations] = useState(MOCK_DATA.locations);

  // API 프로젝트 데이터 가져오기
  const { projects: apiProjects, loading: projectsLoading, fetchProjects, addProject } = useProjects();
  const [projects, setProjects] = useState(MOCK_DATA.projects);

  useEffect(() => {
    fetchProjects();
  }, []);

  // API 프로젝트 데이터만 사용 (MOCK 데이터 제거)
  const unifiedProjects = useMemo(() => {
    return apiProjects.map(p => ({
      ...p,
      startDate: p.start_date || p.startDate,
      endDate: p.end_date || p.endDate,
      totalDays: p.total_days || p.totalDays,
    }));
  }, [apiProjects]);

  const { logout } = useAuth();
  const [schedule, setSchedule] = useState(MOCK_DATA.schedule);
  const [menuVisible, setMenuVisible] = useState(false);

  // 메인 탭(ScheduleScreen)에서 열려있을 프로젝트 ID 상태
  const [expandedProjId, setExpandedProjId] = useState(null);

  // 2. 탭에 따라 렌더링할 화면 연결 (기존 로직을 스크린 컴포넌트로 교체)
  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <DashboardScreen
            projects={unifiedProjects}
            setProjects={setProjects}
            addProject={addProject}
            projectsLoading={projectsLoading}
            schedule={MOCK_DATA.schedule}
            currentProject={currentProject}
            setActiveTab={setActiveTab}
            setExpandedProjId={setExpandedProjId}
            onSelectProject={onSelectProject}
          />
        );
      case "Schedule":
        return (
          <ScheduleScreen
            projects={unifiedProjects}
            setProjects={setProjects}
            schedule={schedule}
            expandedProjId={expandedProjId}
            setExpandedProjId={setExpandedProjId}
          />
        );
      case "Location":


        return <LocationScreen project={currentProject} locations={locations} setLocations={setLocations} schedule={schedule} setSchedule={setSchedule} currentUserName={currentUserName} />;
      case "Communication":
        return <CommunicationScreen project={currentProject} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 (OnSync 고정) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>OnSync</Text>
          <Text style={styles.headerSubtitle}>
            {currentProject ? currentProject.title : "프로젝트 대시보드"}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={styles.profileCircle}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.profileText}>{currentUserName || "사용자"}</Text>
          </TouchableOpacity>
        </View>
      </View>


      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* 프로필 메뉴 모달 */}
      <Modal visible={menuVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                logout(); // useAuth의 logout 호출
              }}
            >
              <Text style={styles.menuItemText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 하단 탭 네비게이션 */}
      <View
        style={[
          styles.bottomTab,
          { height: 70 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <TabItem
          icon={<Home size={24} />}
          label="홈"
          active={activeTab === "Dashboard"}
          onPress={() => setActiveTab("Dashboard")}
        />
        <TabItem
          icon={<List size={24} />}
          label="메인"
          active={activeTab === "Schedule"}
          onPress={() => setActiveTab("Schedule")}
        />
        <TabItem
          icon={<Map size={24} />}
          label="섭외"
          active={activeTab === "Location"}
          onPress={() => setActiveTab("Location")}
        />
        <TabItem
          icon={<Bell size={24} />}
          label="요청"
          active={activeTab === "Communication"}
          onPress={() => setActiveTab("Communication")}
        />
      </View>
    </View>
  );
}

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    {React.cloneElement(icon, { color: active ? "#4F46E5" : "#9CA3AF" })}
    <Text style={[styles.tabLabel, { color: active ? "#4F46E5" : "#9CA3AF" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function App() {

  const { user, loading } = useAuth();
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>

      {!user ? (
        <AuthScreen
          onLogin={(userName) => {
            setCurrentUserName(userName || "김제작");
          }}
        />
      ) : (
        <MainContent
          currentProject={currentProject}
          currentUserName={user?.email || "사용자"}
          onBackToProjects={() => setCurrentProject(null)}
          onSelectProject={setCurrentProject}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#4F46E5",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  profileCircle: {
    minWidth: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  profileText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  bottomTab: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
  },
  tabItem: { alignItems: "center" },
  tabLabel: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginTop: 70, // 헤더 높이 근처
    marginRight: 20,
    width: 120,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  menuItemText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
