import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

type EmptyStateProps = {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
};

export function EmptyState({ title, message, icon = "cube-outline", loading }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        {loading ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name={icon} size={21} color={COLORS.primary} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    fontFamily: FONT,
  },
  message: {
    marginTop: 5,
    color: COLORS.muted,
    fontWeight: "400",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: FONT,
  },
});
