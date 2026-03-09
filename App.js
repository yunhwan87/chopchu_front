import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  MessageSquare,
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
    }
  ],
  schedule: [
    {
      id: 1,
      time: "09:00",
      location: "에펠탑 광장",
      status: "확정",
      type: "촬영",
    },
    {
      id: 2,
      time: "13:00",
      location: "루브르 박물관 내부",
      status: "섭외 중",
      type: "촬영",
    },
  ],
  locations: [
    { id: 1, name: "에펠탑 광장", status: "확정", cost: "€1,200" },
    { id: 2, name: "루브르 박물관", status: "섭외 중", cost: "미정" },
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

function MainContent({ currentUserName }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [locations, setLocations] = useState(MOCK_DATA.locations);
  const [projects, setProjects] = useState(MOCK_DATA.projects);

  // 2. 탭에 따라 렌더링할 화면 연결 (기존 로직을 스크린 컴포넌트로 교체)
  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <DashboardScreen
            projects={projects}
            setProjects={setProjects}
            schedule={MOCK_DATA.schedule}
          />
        );
      case "Schedule":
        return <ScheduleScreen projects={projects} schedule={MOCK_DATA.schedule} />;
      case "Location":
        return (
          <LocationScreen
            locations={locations}
            setLocations={setLocations}
            currentUserName={currentUserName}
          />
        );
      case "Communication":
        return <CommunicationScreen questions={MOCK_DATA.questions} />;
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
            {activeTab === "Dashboard"
              ? "프로젝트 대시보드"
              : activeTab === "Schedule"
                ? "전체 촬영 일정"
                : activeTab === "Location"
                  ? "장소 섭외 현황"
                  : "팀 커뮤니케이션"}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileCircle}>
          <Text style={styles.profileText}>{`(${currentUserName || "김제작"})`}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* 하단 탭 네비게이션 */}
      <View
        style={[
          styles.bottomTab,
          { height: 70 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <TabItem
          icon={<LayoutDashboard size={24} />}
          label="대시보드"
          active={activeTab === "Dashboard"}
          onPress={() => setActiveTab("Dashboard")}
        />
        <TabItem
          icon={<Calendar size={24} />}
          label="전체일정"
          active={activeTab === "Schedule"}
          onPress={() => setActiveTab("Schedule")}
        />
        <TabItem
          icon={<MapPin size={24} />}
          label="섭외관리"
          active={activeTab === "Location"}
          onPress={() => setActiveTab("Location")}
        />
        <TabItem
          icon={<MessageSquare size={24} />}
          label="커뮤니케이션"
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("김제작");

  return (
    <SafeAreaProvider>
      {isLoggedIn ? (
        <MainContent currentUserName={currentUserName} />
      ) : (
        <AuthScreen
          onLogin={(userName) => {
            setCurrentUserName(userName || "김제작");
            setIsLoggedIn(true);
          }}
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
});
