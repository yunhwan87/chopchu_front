import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MessageSquare, User } from "lucide-react-native";

export const CommunicationLog = ({ questions }) => {
  return (
    <View style={styles.container}>
      {questions.map((q) => (
        <View key={q.id} style={styles.qCard}>
          <View style={styles.qHeader}>
            <View style={styles.userRow}>
              <User size={14} color="#64748B" />
              <Text style={styles.userName}>{q.askedBy}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    q.status === "답변완료" ? "#F0FDF4" : "#FFF7ED",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: q.status === "답변완료" ? "#16A34A" : "#EA580C" },
                ]}
              >
                {q.status}
              </Text>
            </View>
          </View>
          <Text style={styles.questionText}>{q.question}</Text>
          {q.answer && (
            <View style={styles.answerBox}>
              <Text style={styles.answerText}>A: {q.answer}</Text>
            </View>
          )}
        </View>
      ))}
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
});
