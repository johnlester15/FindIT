import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label?: string }> = {
  pending: { bg: COLORS.warningLight, fg: COLORS.warning, label: "For review" },
  available: { bg: COLORS.successLight, fg: COLORS.success, label: "Posted" },
  open: { bg: COLORS.successLight, fg: COLORS.success, label: "Posted" },
  matched: { bg: COLORS.purpleLight, fg: COLORS.purple },
  claimed: { bg: COLORS.warningLight, fg: COLORS.warning },
  closed: { bg: COLORS.successLight, fg: COLORS.success },
  under_review: { bg: COLORS.purpleLight, fg: COLORS.purple, label: "Claim review" },
  approved: { bg: COLORS.primaryLight, fg: COLORS.primary },
  returned: { bg: COLORS.successLight, fg: COLORS.success },
  rejected: { bg: COLORS.dangerLight, fg: COLORS.danger },
  cancelled: { bg: COLORS.dangerLight, fg: COLORS.danger },
  archived: { bg: COLORS.border, fg: COLORS.muted },
  found: { bg: COLORS.primaryLight, fg: COLORS.primary },
  lost: { bg: COLORS.warningLight, fg: COLORS.warning },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: COLORS.border, fg: COLORS.muted };
  const label = style.label ?? status.replace("_", " ");
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}> 
      <Text style={[styles.text, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    height: 23,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    fontFamily: FONT,
  },
});
