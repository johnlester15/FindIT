import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { ConfirmModal } from "../../src/components/ConfirmModal";
import { Screen } from "../../src/components/Screen";
import { db } from "../../src/config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { pickImageAsync } from "../../src/services/uploadService";

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  async function changeProfilePhoto() {
    if (!user) return;
    const uri = await pickImageAsync();
    if (!uri) return;

    try {
      setUploading(true);
      await updateDoc(doc(db, "users", user.uid), { profileImageUrl: uri });
      showToast("Profile photo updated.", "success");
    } catch (error: any) {
      Alert.alert("Photo failed", error?.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logout();
      setShowLogoutModal(false);
      router.replace("/auth/login");
    } catch (error: any) {
      Alert.alert("Logout failed", error?.message ?? "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="person-outline" size={22} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Account details and session.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.profileTop}>
          <Pressable onPress={changeProfilePhoto} style={styles.avatarBox}>
            {profile?.profileImageUrl ? <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} resizeMode="cover" /> : <Ionicons name="person-outline" size={32} color={COLORS.primary} />}
            <View style={styles.cameraBadge}><Ionicons name="camera" size={12} color={COLORS.white} /></View>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.fullName ?? "User"}</Text>
            <Text style={styles.email}>{profile?.email ?? user?.email}</Text>
            <View style={styles.roleBadge}><Text style={styles.roleText}>{profile?.role ?? "user"}</Text></View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <InfoRow icon="card-outline" label="Student / Employee ID" value={profile?.studentId ?? "—"} />
          <InfoRow icon="checkmark-circle-outline" label="Status" value={profile?.status ?? "active"} />
          <InfoRow icon="key-outline" label="User ID" value={user?.uid ?? "—"} />
        </View>

        <View style={styles.buttonGrid}>
          <AppButton title={uploading ? "Saving..." : "Photo"} icon="camera-outline" onPress={changeProfilePhoto} loading={uploading} variant="secondary" style={styles.gridButton} />
          <AppButton title="Reports" icon="folder-open-outline" onPress={() => router.push("/(tabs)/my-reports")} variant="secondary" style={styles.gridButton} />
        </View>
        <AppButton title="Messages" icon="chatbubbles-outline" onPress={() => router.push("/(tabs)/messages")} variant="secondary" style={{ marginTop: SPACING.sm }} />
        <AppButton title="Log out" icon="log-out-outline" onPress={() => setShowLogoutModal(true)} loading={loggingOut} variant="ghost" style={{ marginTop: SPACING.sm }} />
      </View>

      <ConfirmModal visible={showLogoutModal} title="Log out?" message="You will return to the login screen." confirmText="Log out" loading={loggingOut} onCancel={() => !loggingOut && setShowLogoutModal(false)} onConfirm={handleLogout} />
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={14} color={COLORS.muted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.lg },
  headerIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 13, fontWeight: "400", fontFamily: FONT },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: "stretch", marginBottom: 120 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.lg },
  avatarBox: { width: 76, height: 76, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", overflow: "visible" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  cameraBadge: { position: "absolute", right: -3, bottom: -3, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: COLORS.card },
  name: { color: COLORS.text, fontSize: 18, fontWeight: "600", fontFamily: FONT },
  email: { marginTop: 3, color: COLORS.muted, fontWeight: "400", fontSize: 12, fontFamily: FONT },
  roleBadge: { alignSelf: "flex-start", marginTop: SPACING.sm, paddingHorizontal: SPACING.md, height: 26, borderRadius: 999, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  roleText: { color: COLORS.primary, fontWeight: "500", textTransform: "uppercase", fontSize: 11, fontFamily: FONT },
  infoBox: { width: "100%", borderRadius: RADIUS.md, backgroundColor: COLORS.soft, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.md },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.md, alignItems: "center" },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  infoLabel: { color: COLORS.muted, fontWeight: "400", fontSize: 12, fontFamily: FONT },
  infoValue: { flex: 1, color: COLORS.text, fontWeight: "500", fontSize: 12, textAlign: "right", fontFamily: FONT },
  buttonGrid: { flexDirection: "row", gap: SPACING.sm },
  gridButton: { flex: 1 },
});
