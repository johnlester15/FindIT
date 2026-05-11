import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { FoundItem, LostItem } from "../types";
import { formatDate } from "../utils/validation";
import { StatusBadge } from "./StatusBadge";
import { UserMini } from "./UserMini";

type ItemCardProps = {
  item: FoundItem | LostItem;
  type: "found" | "lost";
  onPress?: () => void;
};

export function ItemCard({ item, type, onPress }: ItemCardProps) {
  const found = item as FoundItem;
  const lost = item as LostItem;
  const location = type === "found" ? found.locationFound : lost.locationLost;
  const dateText = type === "found" ? found.dateFound : lost.dateLost;
  const label = type === "found" ? "Found" : "Lost";
  const ownerId = type === "found" ? found.reportedBy : lost.userId;
  const ownerName = type === "found" ? found.posterName || found.reportedByName : lost.posterName || lost.userName;
  const ownerPhoto = type === "found" ? found.posterPhotoUrl || found.reportedByPhotoUrl : lost.posterPhotoUrl || lost.userPhotoUrl;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageBox}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={21} color={COLORS.muted} />
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.rowTop}>
          <View style={styles.titleBox}>
            <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
            <Text style={styles.category}>{item.categoryName}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.muted} />
          <Text style={styles.meta} numberOfLines={1}>{label}: {location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
          <Text style={styles.meta} numberOfLines={1}>{dateText || formatDate(item.createdAt)}</Text>
        </View>
        <UserMini userId={ownerId} fallbackName={ownerName} fallbackPhoto={ownerPhoto} label="Posted by" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  pressed: { opacity: 0.9 },
  imageBox: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  info: { flex: 1, justifyContent: "center", minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  titleBox: { flex: 1, minWidth: 0 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: "500", fontFamily: FONT },
  category: { marginTop: 2, color: COLORS.primary, fontSize: 11, fontWeight: "500", fontFamily: FONT },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  meta: { flex: 1, color: COLORS.muted, fontSize: 11, fontWeight: "400", fontFamily: FONT },
});
