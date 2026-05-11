import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { pickImageAsync } from "../services/uploadService";

type ImagePickerBoxProps = {
  imageUri: string | null;
  onChange: (uri: string | null) => void;
  label: string;
};

export function ImagePickerBox({ imageUri, onChange, label }: ImagePickerBoxProps) {
  async function handlePick() {
    const uri = await pickImageAsync();
    if (uri) onChange(uri);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={handlePick} style={({ pressed }) => [styles.box, pressed && styles.pressed]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.iconCircle}>
              <Ionicons name="image-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Add photo</Text>
          </View>
        )}
      </Pressable>
      {imageUri && (
        <Pressable onPress={() => onChange(null)} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={13} color={COLORS.danger} />
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      )}
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
  box: {
    height: 124,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.soft,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  image: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center", padding: SPACING.md },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  title: { marginTop: 8, color: COLORS.text, fontWeight: "500", fontSize: 13, fontFamily: FONT },
  removeButton: { marginTop: SPACING.sm, alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 4 },
  removeText: { color: COLORS.danger, fontWeight: "500", fontSize: 12, fontFamily: FONT },
});
