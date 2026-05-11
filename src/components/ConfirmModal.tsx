import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger,
  loading,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <Pressable onPress={onCancel} disabled={loading} style={[styles.button, styles.cancel]}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={loading} style={[styles.button, danger ? styles.danger : styles.confirm]}>
              <Text style={styles.confirmText}>{loading ? "Please wait..." : confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  card: {
    width: "100%",
    maxWidth: 330,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: FONT,
  },
  message: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: SPACING.sm,
    fontFamily: FONT,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  button: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirm: { backgroundColor: COLORS.primary },
  danger: { backgroundColor: COLORS.danger },
  cancelText: { color: COLORS.text, fontSize: 13, fontWeight: "600", fontFamily: FONT },
  confirmText: { color: COLORS.white, fontSize: 13, fontWeight: "600", fontFamily: FONT },
});
