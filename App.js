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
  MessageCircle,
} from "lucide-react-native";

// 1. 분리된 스크린 컴포넌트 임포트 (경로 확인 완료)
import { DashboardScreen } from "./screens/DashboardScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { CommunicationScreen } from "./screens/CommunicationScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { ChatMainScreen } from "./screens/ChatMainScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

// 추가: Persistence를 위한 API 임포트
import * as locationApi from './src/api/locations';

// 하드코딩된 MOCK_DATA 제거 완료


import { useAuth } from "./src/hooks/useAuth";
import { useProjects } from "./src/hooks/useProjects";
import { TempProjectSelectorScreen } from "./screens/TempProjectSelectorScreen";
import { useEffect, useMemo } from "react";

function MainContent({ onLogout, currentProject, onBackToProjects, currentUserName, onSelectProject }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [locations, setLocations] = useState([]);

  // API 프로젝트 데이터 가져오기
  const { projects: apiProjects, loading: projectsLoading, fetchProjects, addProject, deleteProject, updateProject } = useProjects();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // API 프로젝트 데이터만 사용 (MOCK 데이터 제거)
  const unifiedProjects = useMemo(() => {
    return apiProjects.map(p => {
      // all_members 데이터를 기반으로 쉼표 구분 문자열 생성
      const membersStr = (p.all_members || [])
        .map(m => m.profiles?.nickname || m.profiles?.email || "Unknown")
        .join(", ");

      return {
        ...p,
        startDate: p.start_date || p.startDate,
        endDate: p.end_date || p.endDate,
        totalDays: p.total_days || p.totalDays,
        members: membersStr, // UI 컴포넌트들에서 참조하는 필드명 유지
      };
    });
  }, [apiProjects]);

  const { logout, profile, user, updateProfile, updatePassword } = useAuth();
  const [schedule, setSchedule] = useState([]); // MOCK_DATA.schedule 대신 빈 배열로 시작

  // 프로젝트 변경 시 확정된 장소 기반으로 일정 자동 로드
  const syncScheduleFromLocations = async () => {
    if (!currentProject?.id) {
      setSchedule([]); // 프로젝트 없으면 빈 배열
      return;
    }

    // 새 프로젝트 데이터를 가져오기 전에 기존 데이터를 비웁니다 (플리커링 방지)
    setSchedule([]);

    try {
      const dbLocs = await locationApi.getLocations(currentProject.id);
      const allLocsAsSchedule = dbLocs.map(l => {
        let uiStatus = "진행 중";
        if (l.status === 'confirmed') uiStatus = "확정";
        else if (l.status === 'hold') uiStatus = "보류";
        else if (l.status === 'canceled') uiStatus = "취소";

        return {
          id: l.id,
          locationId: l.id,
          time: l.shooting_time || "시간 미정",
          location: l.title,
          status: uiStatus,
          type: "촬영",
          date: l.location_date,
          note: l.note
        };
      });

      setSchedule(allLocsAsSchedule);
    } catch (err) {
      console.error("Error loading schedule from locations:", err);
    }
  };

  useEffect(() => {
    syncScheduleFromLocations();
  }, [currentProject?.id]);

  /**
   * 새 일정(확정 장소) 추가
   */
  const addScheduleItem = async (payload) => {
    if (!currentProject?.id) return { success: false, error: '선택된 프로젝트가 없습니다.' };

    try {
      const { locationId, ...data } = payload;

      if (locationId) {
        // 이미 존재하는 장소인 경우 업데이트 (중복 생성 방지)
        await locationApi.updateLocation(locationId, data);
      } else {
        // 새 장소인 경우 생성 (현재 UI에서는 사실상 발생하지 않음)
        await locationApi.createLocation({
          ...data,
          project_id: currentProject.id,
        });
      }

      // 저장 후 목록 갱신
      await syncScheduleFromLocations();
      return { success: true };
    } catch (err) {
      console.error('Error adding/updating schedule item:', err);
      return { success: false, error: err.message };
    }
  };
  const [menuVisible, setMenuVisible] = useState(false);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

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
            schedule={[]}
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
            deleteProject={deleteProject}
            updateProject={updateProject}
            schedule={schedule}
            locations={locations} // 섭외 장소 목록 전달
            expandedProjId={expandedProjId}
            setExpandedProjId={setExpandedProjId}
            addScheduleItem={addScheduleItem}
          />
        );
      case "Location":


        return <LocationScreen project={currentProject} locations={locations} setLocations={setLocations} schedule={schedule} setSchedule={setSchedule} currentUserName={currentUserName} />;
      case "Communication":
        return <CommunicationScreen project={currentProject} />;
      case "Chat":
        return <ChatMainScreen project={currentProject} onSetTabBarVisibility={setIsTabBarVisible} />;
      case "MyProfile":
        return (
          <ProfileScreen
            profile={profile}
            user={user}
            onLogout={onLogout}
            onBack={() => setActiveTab("Dashboard")}
            updateProfile={updateProfile}
            updatePassword={updatePassword}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 (OnSync 고정) - 프로필 화면에서는 숨김 */}
      {activeTab !== "MyProfile" && (
        <View style={styles.header}>
          <Text style={styles.brandTitle}>OnSync</Text>
          <TouchableOpacity
            style={styles.profileCircle}
            onPress={() => setActiveTab("MyProfile")}
          >
            <Text style={styles.profileText}>
              {user?.email === "1@1" ? "김" : (profile?.nickname || user?.user_metadata?.nickname || currentUserName || "U")[0]}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
      {isTabBarVisible && (
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
            label="한 눈에"
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
          <TabItem
            icon={<MessageCircle size={24} />}
            label="채팅"
            active={activeTab === "Chat"}
            onPress={() => setActiveTab("Chat")}
          />
        </View>
      )}
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

  const { user, loading, logout } = useAuth();
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
          onLogout={logout}
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
