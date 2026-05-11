import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { db } from "../config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { UserProfile } from "../types";

type UserMiniProps = {
  userId?: string;
  label?: string;
  fallbackName?: string;
  fallbackPhoto?: string;
  size?: "sm" | "md";
};

export function UserMini({ userId, label = "Posted by", fallbackName, fallbackPhoto, size = "sm" }: UserMiniProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(
      doc(db, "users", userId),
      (snap) => setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null),
      () => setProfile(null)
    );
    return unsub;
  }, [userId]);

  const name = profile?.fullName || fallbackName || "Unknown user";
  const photo = profile?.profileImageUrl || fallbackPhoto || "";
  const isMedium = size === "md";

  return (
    <View style={[styles.wrap, isMedium && styles.wrapMd]}>
      <View style={[styles.avatar, isMedium && styles.avatarMd]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Ionicons name="person-outline" size={isMedium ? 18 : 13} color={COLORS.primary} />
        )}
      </View>
      <View style={styles.textBox}>
        <Text style={[styles.label, isMedium && styles.labelMd]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.name, isMedium && styles.nameMd]} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
    minWidth: 0,
  },
  wrapMd: {
    backgroundColor: COLORS.soft,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: 0,
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarMd: {
    width: 38,
    height: 38,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  textBox: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "400",
    fontFamily: FONT,
  },
  labelMd: {
    fontSize: 11,
  },
  name: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "500",
    fontFamily: FONT,
  },
  nameMd: {
    fontSize: 13,
  },
});
