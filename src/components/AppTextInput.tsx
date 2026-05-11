import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";

type AppTextInputProps = TextInputProps & {
  label: string;
  inputStyle?: StyleProp<TextStyle>;
};

export function AppTextInput({ label, inputStyle, ...props }: AppTextInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={COLORS.muted} style={[styles.input, inputStyle]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md },
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
    fontFamily: FONT,
  },
  input: {
    minHeight: 44,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
    fontFamily: FONT,
  },
});
