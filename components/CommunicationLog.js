import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { User, ChevronRight } from "lucide-react-native";
import { RequestDetailModal } from "./RequestDetailModal";

// 상태별 색상 및 한글 라벨 매핑
const STATUS_MAP = {
  pending: { label: "요청 확인 대기 중", bg: "#FFF7ED", text: "#EA580C" },
  in_progress: { label: "해결 중", bg: "#EFF6FF", text: "#3B82F6" },
  need_info: { label: "추가확인", bg: "#FEF2F2", text: "#EF4444" },
  resolved: { label: "해결완료", bg: "#F0FDF4", text: "#16A34A" },
};

export const CommunicationLog = ({ requests, currentUserId, type, onRefresh, isDashboard }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const getDDay = (createdAt) => {
    const created = new Date(createdAt);
    created.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today - created;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    return `D+${diffDays}`;
  };


  return (
    <View style={styles.container}>
      {requests.map((q) => {
        const statusInfo = STATUS_MAP[q.status] || STATUS_MAP.pending;
        // 타입(보낸/받은)에 따라 상대방 프로필 표시
        const otherUser = type === 'sent' ? q.receiver : q.sender;
        const targetLabel = type === 'sent' ? 'To' : 'From';

        return (
          <TouchableOpacity key={q.id} style={styles.qCard} onPress={() => setSelectedRequest(q)}>
            <View style={styles.qHeader}>
              <View style={styles.userRow}>
                <User size={14} color="#64748B" />
                <Text style={styles.userName}>
                  {targetLabel}: {otherUser?.nickname || otherUser?.email || "알 수 없음"}
                </Text>
                {isDashboard && (
                  <Text style={styles.dashboardDateInline}>
                    | {new Date(q.created_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={styles.headerRight}>
                <View style={[styles.dDayBadge, { backgroundColor: q.status === 'resolved' ? '#F1F5F9' : '#FEE2E2' }]}>
                  <Text style={[styles.dDayText, { color: q.status === 'resolved' ? '#64748B' : '#EF4444' }]}>
                    {getDDay(q.created_at)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusText, { color: statusInfo.text }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
            </View>




            <Text style={styles.questionText} numberOfLines={2}>
              {q.title}
            </Text>

            {!isDashboard && (
              <View style={styles.footerRow}>
                <Text style={styles.dateText}>
                  {new Date(q.created_at).toLocaleDateString()}
                </Text>
                <View style={styles.detailBtn}>
                  <Text style={styles.detailText}>상세보기</Text>
                  <ChevronRight size={14} color="#94A3B8" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <RequestDetailModal
        visible={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        type={type}
        onRefresh={onRefresh}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  qCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  qHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  userName: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  dDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dDayText: {
    fontSize: 11,
    fontWeight: "900",
  },
  questionText: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "600",
    lineHeight: 22,
  },
  answerBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
  },
  answerText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  dashboardDateInline: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dateText: { fontSize: 12, color: "#94A3B8" },
  detailBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
});
