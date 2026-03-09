import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Plus } from "lucide-react-native";
import { CommunicationLog } from "../components/CommunicationLog";
import { NewRequestModal } from "../components/NewRequestModal";
import { useAuth } from "../src/hooks/useAuth";
import { useRequests } from "../src/hooks/useRequests";

export const CommunicationScreen = ({ project }) => { // project 객체를 prop으로 받음
  const { user } = useAuth();
  const { requests, loading, loadRequests } = useRequests();
  const [activeTab, setActiveTab] = useState("received"); // 'received' | 'sent'
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchCurrentData = () => {
    if (project && user) {
      loadRequests(project.id, user.id, activeTab);
    }
  };

  useEffect(() => {
    fetchCurrentData();
  }, [project, user, activeTab, loadRequests]);

  return (
    <View style={styles.container}>
      {/* 탭 헤더 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "received" && styles.activeTab]}
          onPress={() => setActiveTab("received")}
        >
          <Text style={[styles.tabText, activeTab === "received" && styles.activeTabText]}>내가 받은 요청</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "sent" && styles.activeTab]}
          onPress={() => setActiveTab("sent")}
        >
          <Text style={[styles.tabText, activeTab === "sent" && styles.activeTabText]}>내가 보낸 요청</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "resolved" && styles.activeTab]}
          onPress={() => setActiveTab("resolved")}
        >
          <Text style={[styles.tabText, activeTab === "resolved" && styles.activeTabText]}>해결된 요청</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>해당하는 요청이 없습니다.</Text>
            </View>
          ) : (
            <CommunicationLog
              requests={requests}
              currentUserId={user?.id}
              type={activeTab}
              onRefresh={fetchCurrentData}
              project={project}
            />
          )}
        </View>
      </ScrollView>

      {/* 새 요청 작성 플로팅 버튼 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewModal(true)}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* 새 요청 모달 */}
      <NewRequestModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        project={project}
        onCreated={() => {
          // 작성 성공 시 '내가 보낸 요청' 탭으로 이동 후 새로고침
          setActiveTab("sent");
          setTimeout(() => fetchCurrentData(), 500);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  activeTab: {
    borderBottomColor: "#4F46E5",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  activeTabText: {
    color: "#4F46E5",
  },
  inner: { paddingBottom: 120 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#64748B", fontSize: 14 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 120, // 바텀 탭 네비게이션 더 위로 올려서 겹치지 않게
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
  }
});

