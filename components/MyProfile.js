import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Camera, Plus, Check, X } from "lucide-react-native";
import { TextInput, Alert } from "react-native";

export const MyProfile = ({ profile, user, onLogout, onBack, updateProfile, updatePassword }) => {
  const [editingField, setEditingField] = React.useState(null); // 'password', 'nickname', 'phone'
  const [editValue, setEditValue] = React.useState("");

  if (!profile && !user) return null;

  const handleStartEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(field === 'password' ? "" : currentValue);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editValue && editingField !== 'password') {
      Alert.alert("알림", "내용을 입력해주세요.");
      return;
    }

    let success = false;
    let errorMsg = "";

    try {
      if (editingField === 'password') {
        if (editValue.length < 6) {
          Alert.alert("알림", "비밀번호는 6자리 이상이어야 합니다.");
          return;
        }
        const res = await updatePassword(editValue);
        success = res.success;
        errorMsg = res.error;
      } else {
        const updates = { [editingField]: editValue };
        const res = await updateProfile(updates);
        success = res.success;
        errorMsg = res.error;
      }

      if (success) {
        Alert.alert("성공", "정보가 수정되었습니다.");
        setEditingField(null);
        setEditValue("");
      } else {
        Alert.alert("오류", errorMsg || "수정에 실패했습니다.");
      }
    } catch (err) {
      Alert.alert("오류", "예기치 못한 오류가 발생했습니다.");
    }
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.cancelTopBtn}
        onPress={onBack}
        activeOpacity={0.6}
      >
        <Text style={styles.cancelTopText}>저장 취소</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageSection}>
          <View style={styles.imagePlaceholder}>
            <Image
              source={require('../assets/profile_hamster.jpg')}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.cameraBtn}>
              <Camera size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoContainer}>
          {/* Channel / Role */}
          <View style={styles.infoCard}>
            <Text style={styles.label}>채널</Text>
            <Text style={styles.value}>{profile?.role || "Producer"}</Text>
          </View>

          {/* ID (Email) - No Edit Button as requested */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.label}>아이디(이메일 주소)</Text>
            </View>
            <Text style={styles.value}>{user?.email || profile?.email}</Text>
          </View>

          {/* Password */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.label}>비밀번호</Text>
              {editingField === 'password' ? (
                <View style={styles.editControls}>
                  <TouchableOpacity onPress={handleSaveEdit}>
                    <Check size={20} color="#4F46E5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEdit}>
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => handleStartEdit('password', "")}>
                  <Text style={styles.editBtn}>수정</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingField === 'password' ? (
              <TextInput
                style={styles.input}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="새 비밀번호 입력"
                secureTextEntry
                autoFocus
              />
            ) : (
              <Text style={styles.value}>********</Text>
            )}
          </View>

          {/* Nickname */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.label}>닉네임</Text>
              {editingField === 'nickname' ? (
                <View style={styles.editControls}>
                  <TouchableOpacity onPress={handleSaveEdit}>
                    <Check size={20} color="#4F46E5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEdit}>
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => handleStartEdit('nickname', profile?.nickname || user?.user_metadata?.nickname || "")}>
                  <Text style={styles.editBtn}>수정</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingField === 'nickname' ? (
              <TextInput
                style={styles.input}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="닉네임 입력"
                autoFocus
              />
            ) : (
              <Text style={styles.value}>
                {profile?.nickname || user?.user_metadata?.nickname || "미설정"}
              </Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.label}>휴대폰 번호</Text>
              {editingField === 'phone' ? (
                <View style={styles.editControls}>
                  <TouchableOpacity onPress={handleSaveEdit}>
                    <Check size={20} color="#4F46E5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEdit}>
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => handleStartEdit('phone', profile?.phone || "010-1234-5678")}>
                  <Text style={styles.editBtn}>수정</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingField === 'phone' ? (
              <TextInput
                style={styles.input}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="휴대폰 번호 입력"
                keyboardType="phone-pad"
                autoFocus
              />
            ) : (
              <Text style={styles.value}>{profile?.phone || "010-1234-5678"}</Text>
            )}
          </View>

          {/* Logout Text - Below Phone Number */}
          <TouchableOpacity style={styles.logoutTextContainer} onPress={onLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  imageSection: {
    alignItems: "center",
    marginVertical: 30,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  defaultAvatar: {
    flex: 1,
    borderRadius: 75,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 75,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoContainer: {
    gap: 15,
  },
  infoCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  editBtn: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "700",
  },
  editControls: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  input: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4F46E5",
    borderBottomWidth: 1,
    borderBottomColor: "#4F46E5",
    paddingVertical: 4,
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoutTextContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  cancelTopBtn: {
    position: 'absolute',
    top: 15,
    right: 25,
    zIndex: 999,
    padding: 10, // 클릭 영역 확장
  },
  cancelTopText: {
    fontSize: 15,
    color: "#4F46E5", // 더 잘 보이도록 브랜드 컬러 적용
    fontWeight: "700",
  },
});
