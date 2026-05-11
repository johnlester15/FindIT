import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ title, onPress, loading, disabled, variant = "primary", icon, style }: AppButtonProps) {
  const isDisabled = disabled || loading;
  const lightVariant = variant === "secondary" || variant === "ghost";
  const textColor = variant === "danger" || variant === "primary" ? COLORS.white : COLORS.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={lightVariant ? COLORS.primary : COLORS.white} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={15} color={textColor} /> : null}
          <Text style={[styles.text, lightVariant && styles.secondaryText]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 42,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    gap: 6,
  },
  primary: { backgroundColor: COLORS.primary },
  secondary: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  danger: { backgroundColor: COLORS.danger },
  ghost: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88 },
  text: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "500",
    fontFamily: FONT,
  },
  secondaryText: { color: COLORS.primary },
});
