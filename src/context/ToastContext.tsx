import { Ionicons } from "@expo/vector-icons";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

type ToastType = "success" | "error" | "info";

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_META: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: "checkmark-circle-outline", color: COLORS.success, bg: COLORS.successLight },
  error: { icon: "alert-circle-outline", color: COLORS.danger, bg: COLORS.dangerLight },
  info: { icon: "information-circle-outline", color: COLORS.primary, bg: COLORS.primaryLight },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 18, duration: 160, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [opacity, translateY]);

  const showToast = useCallback((nextMessage: string, nextType: ToastType = "success") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    setType(nextType);
    setVisible(true);
    opacity.setValue(0);
    translateY.setValue(18);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    timeoutRef.current = setTimeout(hideToast, 2200);
  }, [hideToast, opacity, translateY]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const meta = TOAST_META[type];

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>{children}</View>
      {visible && (
        <Animated.View pointerEvents="none" style={[styles.toastOuter, { opacity, transform: [{ translateY }] }]}>
          <View style={styles.toast}>
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <Text style={styles.message} numberOfLines={2}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toastOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 76,
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    zIndex: 999,
  },
  toast: {
    width: "100%",
    maxWidth: 390,
    minHeight: 46,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: FONT,
  },
});
