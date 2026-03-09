import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LocationManager } from "../components/LocationManager";

export const LocationScreen = ({
  locations,
  setLocations,
  schedule,
  setSchedule,
  currentUserName,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.description}>
          현재 프로젝트의 장소 리스트입니다. 신규 요청 작성 및 조회가
          가능합니다.
        </Text>
      </View>

      <LocationManager
        locations={locations}
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
});
