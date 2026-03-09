import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { LocationManager } from "../components/LocationManager";

export const LocationScreen = ({ locations, setLocations, currentUserName }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerText}>
        <Text style={styles.description}>
          현재 프로젝트의 장소 섭외 리스트입니다.
        </Text>
      </View>
      <LocationManager
        locations={locations}
        setLocations={setLocations}
        currentUserName={currentUserName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    // 추가: 카드들이 세로로 꽉 차지 않도록 상단 정렬 유도
    justifyContent: "flex-start",
  },
  headerText: { paddingHorizontal: 20, marginBottom: 15 },
  description: { fontSize: 14, color: "#64748B" },
});
