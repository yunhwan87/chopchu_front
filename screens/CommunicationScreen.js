import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CommunicationLog } from "../components/CommunicationLog";

export const CommunicationScreen = ({ questions }) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <CommunicationLog questions={questions} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 10 },
  inner: { paddingBottom: 120 },
});
