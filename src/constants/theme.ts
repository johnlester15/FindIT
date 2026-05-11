import { Platform } from "react-native";

export const FONT = Platform.select({
  web: "Inter, Poppins, Roboto, Arial, sans-serif",
  ios: "System",
  android: "Roboto",
  default: "System",
});

export const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  success: "#16A34A",
  successLight: "#ECFDF3",
  warning: "#D97706",
  warningLight: "#FFF7ED",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#667085",
  border: "#E5E7EB",
  soft: "#F1F5F9",
  white: "#FFFFFF",
  black: "#000000",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};
