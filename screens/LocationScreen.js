import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocations } from "../src/hooks/useLocations";
import {
  Plus,
  MapPin,
  Clock,
  DollarSign,
  ChevronRight,
} from "lucide-react-native";
import { LocationForm } from "../components/LocationForm";
import { LocationManager } from "../components/LocationManager";
export const LocationScreen = ({
  project,
  locations2,
  setLocations,
  schedule,
  setSchedule,
  currentUserName,
}) => {
  const { locations, loading, fetchLocations } = useLocations(project?.id);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (project?.id) {
      fetchLocations();
    }
  }, [project?.id, fetchLocations]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "confirmed":
        return styles.statusConfirmed;
      case "hold":
        return styles.statusHold;
      default:
        return styles.statusRequested;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "confirmed":
        return "확정";
      case "hold":
        return "보류";
      default:
        return "요청 중";
    }
  };

  const getCardStatusLabel = (status) => {
    switch (status) {
      case "coordinator_pending":
        return "코디 답변대기";
      case "crew_pending":
        return "제작진 답변대기";
      default:
        return "장소 답변대기";
    }
  };

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <ChevronRight color="#94A3B8" size={20} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Clock size={16} color="#64748B" />
          <Text style={styles.infoText}>
            {item.location_date || "날짜 미정"} |{" "}
            {item.shooting_time || "시간 미정"}
          </Text>
        </View>
        <View style={[styles.infoRow, { marginTop: 8 }]}>
          <MapPin size={16} color="#64748B" />
          <Text style={styles.infoText}>
            {getCardStatusLabel(item.card_status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.costContainer}>
          <DollarSign size={16} color="#4F46E5" />
          <Text style={styles.costText}>
            {item.cost?.toLocaleString() || 0}원
            {item.deposit_status && (
              <Text style={styles.depositNote}>
                {" "}
                (선금 {item.deposit_amount?.toLocaleString()}원)
              </Text>
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.description}>
          현재 프로젝트의 장소 리스트입니다. 누구나 작성 및 조회가 가능합니다.
        </Text>
      </View>

      {loading && locations.length === 0 ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 장소가 없습니다.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus color="#FFF" size={32} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <LocationForm
          projectId={project?.id}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            setModalVisible(false);
            fetchLocations();
          }}
        />
      </Modal>

      <LocationManager
        locations={locations2}
        setLocations={setLocations}
        schedule={schedule}
        setSchedule={setSchedule}
        currentUserName={currentUserName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#64748B",
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusRequested: { backgroundColor: "#EEF2FF" },
  statusConfirmed: { backgroundColor: "#ECFDF5" },
  statusHold: { backgroundColor: "#FFF7ED" },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  costText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 4,
  },
  depositNote: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
