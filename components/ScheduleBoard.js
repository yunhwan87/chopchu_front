import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Clock, CheckCircle2 } from "lucide-react-native";

export const ScheduleBoard = ({ schedule }) => {
  return (
    <View style={styles.container}>
      {schedule.map((item, index) => (
        <View key={item.id} style={styles.timelineItem}>
          <View style={styles.timelineLeft}>
            <Text style={styles.timelineTime}>{item.time}</Text>
            {index !== schedule.length - 1 && (
              <View style={styles.timelineLine} />
            )}
          </View>
          <View
            style={[
              styles.timelineCard,
              item.status === "확정"
                ? styles.borderConfirmed
                : item.status === "섭외 중"
                  ? styles.borderContacting
                  : styles.borderDraft,
            ]}
          >
            <View>
              <Text style={styles.timelineLocation}>{item.location}</Text>
              <View style={styles.statusRow}>
                <Clock size={12} color="#64748B" />
                <Text style={styles.statusLabel}>
                  {item.status} · {item.type}
                </Text>
              </View>
            </View>
            <CheckCircle2
              size={22}
              color={item.status === "확정" ? "#10B981" : "#D1D5DB"}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  timelineItem: { flexDirection: "row", minHeight: 90 },
  timelineLeft: { alignItems: "center", marginRight: 15, width: 50 },
  timelineTime: { fontSize: 15, fontWeight: "800", color: "#475569" },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  borderConfirmed: { borderLeftWidth: 5, borderLeftColor: "#10B981" },
  borderContacting: { borderLeftWidth: 5, borderLeftColor: "#F59E0B" },
  borderDraft: { borderLeftWidth: 5, borderLeftColor: "#9CA3AF" },
  timelineLocation: { fontSize: 17, fontWeight: "700", color: "#1E293B" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  statusLabel: { fontSize: 13, color: "#64748B" },
});
