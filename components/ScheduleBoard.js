import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Clock } from "lucide-react-native";

export const ScheduleBoard = ({ schedule, projectStartDate }) => {
  if (!schedule || schedule.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>해당 기간 내 예정된 일정이 없습니다.</Text>
      </View>
    );
  }

  // 날짜별 그룹화
  const grouped = schedule.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  const getDayNumber = (dateStr) => {
    if (!projectStartDate) return null;
    const start = new Date(projectStartDate);
    start.setHours(0, 0, 0, 0);
    const current = new Date(dateStr);
    current.setHours(0, 0, 0, 0);
    const diffTime = current - start;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  return (
    <View style={styles.container}>
      {sortedDates.map((date) => {
        const dayNum = getDayNumber(date);
        const dayItems = grouped[date];

        return (
          <View key={date} style={styles.daySection}>
            {/* 여러 날짜가 표시될 때(전체 필터 등)만 일차 헤더 표시 */}
            {sortedDates.length > 1 && (
              <View style={styles.dayHeader}>
                <View style={styles.dayHeaderLine} />
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>{dayNum}일차</Text>
                  <Text style={styles.dateText}>({date})</Text>
                </View>
                <View style={styles.dayHeaderLine} />
              </View>
            )}

            {dayItems.map((item, index) => {
              const isConfirmed = item.status === "확정";
              const isPending = item.status === "섭외 중";

              return (
                <View key={item.id || index} style={styles.timelineItem}>
                  {/* 왼쪽 시간 표시 제거 (카드의 내용과 중복된다는 요청 반영) */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.dot, isConfirmed && styles.dotConfirmed]} />
                    {index !== dayItems.length - 1 && (
                      <View style={styles.connector} />
                    )}
                  </View>

                  <View style={[styles.card, isConfirmed && styles.cardConfirmed]}>
                    <View style={styles.cardTop}>
                      <Text style={styles.locationName} numberOfLines={2}>
                        {item.location}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        isConfirmed ? styles.statusConfirmed : isPending ? styles.statusPending : styles.statusDefault
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          isConfirmed ? styles.statusTextConfirmed : isPending ? styles.statusTextPending : styles.statusTextDefault
                        ]}>
                          {item.status || "미정"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      <Clock size={14} color="#64748B" />
                      <Text style={styles.timeDetailText}>{item.time || "시간 미정"}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0 },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 14 },

  daySection: { marginBottom: 10 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  dayHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500',
  },

  timelineItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 12,
    width: 20, // 폭 축소
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  dotConfirmed: {
    backgroundColor: "#4F46E5",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#EEF2FF",
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardConfirmed: {
    borderColor: "#E0E7FF",
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  locationName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginRight: 8,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusConfirmed: { backgroundColor: "#D1FAE5" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusDefault: { backgroundColor: "#F1F5F9" },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusTextConfirmed: { color: "#065F46" },
  statusTextPending: { color: "#92400E" },
  statusTextDefault: { color: "#475569" },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeDetailText: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 5,
    fontWeight: "500",
  },
});
