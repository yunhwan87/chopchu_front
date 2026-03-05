import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Folder, Calendar } from "lucide-react-native";
import { ScheduleBoard } from "../components/ScheduleBoard";

export const ScheduleScreen = ({ projects = [], schedule = [] }) => {
  const [selectedProject, setSelectedProject] = useState(projects[0] || null);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>전체 일정 관리</Text>

      {/* Project Horizontal Card List */}
      <View style={styles.projectListContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {projects.map((proj) => {
            const isSelected = selectedProject?.id === proj.id;
            return (
              <TouchableOpacity
                key={proj.id}
                onPress={() => setSelectedProject(proj)}
                style={[
                  styles.projectCard,
                  isSelected && styles.projectCardSelected,
                ]}
              >
                <View style={styles.iconRow}>
                  <Folder size={18} color={isSelected ? "#FFF" : "#6366F1"} />
                </View>
                <Text style={[styles.projTitle, isSelected && { color: "#FFF" }]} numberOfLines={1}>
                  {proj.title}
                </Text>
                <Text style={[styles.projDates, isSelected && { color: "#E0E7FF" }]}>
                  {proj.startDate} ~ {proj.endDate}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Project Details and Schedule */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
        {selectedProject ? (
          <>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedProject.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>총 {selectedProject.totalDays}일</Text>
                </View>
              </View>

              {selectedProject.members ? (
                <Text style={styles.detailSubText}>
                  참여 인원: {selectedProject.members}
                </Text>
              ) : null}

              {selectedProject.note ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{selectedProject.note}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>촬영 일정 보드</Text>
            </View>
            <ScheduleBoard schedule={schedule} />
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>선택된 프로젝트가 없습니다.</Text>
          </View>
        )}
      </ScrollView>
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

  scrollInner: { paddingBottom: 100, paddingHorizontal: 20 },
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
  sectionHeader: { marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  emptyWrap: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },
});
