import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

export function AdminGlobalMenu({ visible, hasUnreadMessages }: { visible: boolean; hasUnreadMessages?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (!visible) return null;

  function go(pathnameValue: string, params?: Record<string, string>) {
    setOpen(false);
    if (params) {
      router.push({ pathname: pathnameValue as any, params });
      return;
    }
    router.push(pathnameValue as any);
  }

  const activeHome = pathname.includes("/home") || pathname === "/";
  const activeAdmin = pathname.includes("/admin");
  const activeMessages = pathname.includes("/messages") || pathname.includes("/chat");
  const activeProfile = pathname.includes("/profile");

  return (
    <View pointerEvents="box-none" style={styles.overlayRoot}>
      <View pointerEvents="box-none" style={styles.topBarWrap}>
        <Pressable style={styles.floatingButton} onPress={() => setOpen(true)}>
          <Ionicons name="menu-outline" size={22} color={COLORS.text} />
          {hasUnreadMessages && <View style={styles.dot} />}
        </Pressable>
      </View>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.drawer} onPress={(event) => event.stopPropagation()}>
            <View style={styles.drawerHeader}>
              <View style={styles.brandIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerTitle}>Admin menu</Text>
                <Text style={styles.drawerSubtitle}>Manage posts and users</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close-outline" size={20} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Dashboard</Text>
            <DrawerItem label="Home" icon="home-outline" active={activeHome} onPress={() => go("/(tabs)/home")} />
            <DrawerItem label="Review posts" icon="time-outline" active={activeAdmin} onPress={() => go("/(tabs)/admin", { mode: "review" })} />
            <DrawerItem label="Claims" icon="receipt-outline" active={activeAdmin} onPress={() => go("/(tabs)/admin", { mode: "claims" })} />
            <DrawerItem label="Reports" icon="folder-open-outline" active={activeAdmin} onPress={() => go("/(tabs)/admin", { mode: "reports" })} />

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Communication</Text>
            <DrawerItem label="Messages" icon="chatbubbles-outline" active={activeMessages} badge={hasUnreadMessages ? "New" : undefined} onPress={() => go("/(tabs)/messages")} />
            <DrawerItem label="Profile" icon="person-outline" active={activeProfile} onPress={() => go("/(tabs)/profile")} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DrawerItem({ label, icon, active, badge, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; badge?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.drawerItem, active && styles.drawerItemActive]}>
      <Ionicons name={icon} size={18} color={active ? COLORS.primary : COLORS.muted} />
      <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{label}</Text>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  topBarWrap: {
    position: "absolute",
    top: Platform.OS === "web" ? 14 : 10,
    left: 0,
    right: 0,
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    alignItems: "flex-end",
  },
  floatingButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.32)",
    alignItems: "flex-end",
  },
  drawer: {
    width: 270,
    maxWidth: "84%",
    height: "100%",
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitle: { color: COLORS.text, fontSize: 18, fontWeight: "600", fontFamily: FONT },
  drawerSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONT },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  sectionLabel: { marginTop: SPACING.sm, marginBottom: 2, color: COLORS.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase", fontFamily: FONT },
  drawerItem: { minHeight: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  drawerItemActive: { backgroundColor: COLORS.primaryLight, borderColor: "#BFDBFE" },
  drawerItemText: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: "500", fontFamily: FONT },
  drawerItemTextActive: { color: COLORS.primary, fontWeight: "600" },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  badge: { height: 22, borderRadius: 999, backgroundColor: COLORS.danger, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "600", fontFamily: FONT },
});
