import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MyProfile } from "../components/MyProfile";

export const ProfileScreen = ({ profile, user, onLogout, onBack, updateProfile, updatePassword }) => {
    return (
        <View style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandTitle}>OnSync</Text>
                    <Text style={styles.headerSubtitle}>
                        {profile?.nickname || user?.user_metadata?.nickname || "미설정"}
                    </Text>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
                        <Text style={styles.headerBtnText}>
                            {(profile?.nickname || user?.user_metadata?.nickname || user?.email || "U")[0]}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Profile Content */}
            <MyProfile
                profile={profile}
                user={user}
                onLogout={onLogout}
                onBack={onBack}
                updateProfile={updateProfile}
                updatePassword={updatePassword}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: "900",
        color: "#4F46E5",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "600",
        marginTop: 2,
    },
    headerButtons: {
        flexDirection: "row",
        gap: 10,
    },
    headerBtn: {
        minWidth: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: "#E2E8F0",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    headerBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748B",
    },
});
