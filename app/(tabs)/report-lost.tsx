import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AppTextInput } from "../../src/components/AppTextInput";
import { ImagePickerBox } from "../../src/components/ImagePickerBox";
import { Screen } from "../../src/components/Screen";
import { CATEGORIES, getCategoryName } from "../../src/constants/categories";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { createLostItem } from "../../src/services/lostFoundService";

export default function ReportLostScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [description, setDescription] = useState("");
  const [locationLost, setLocationLost] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    if (!itemName.trim() || !description.trim() || !locationLost.trim() || !dateLost.trim()) {
      Alert.alert("Complete the form", "Please fill in all required details before submitting.");
      return;
    }

    try {
      setLoading(true);
      await createLostItem(user.uid, {
        itemName: itemName.trim(),
        categoryId,
        categoryName: getCategoryName(categoryId),
        description: description.trim(),
        locationLost: locationLost.trim(),
        dateLost: dateLost.trim(),
        imageUrl: imageUri ?? "",
      });

      setItemName("");
      setDescription("");
      setLocationLost("");
      setDateLost("");
      setImageUri(null);

      showToast("Lost report submitted for review.", "success");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Could not submit", error?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scrollable>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View style={styles.iconBox}><Ionicons name="alert-circle-outline" size={22} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Report lost item</Text>
            <Text style={styles.subtitle}>Posts are reviewed by admin before going public.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <ImagePickerBox imageUri={imageUri} onChange={setImageUri} label="Item photo" />
          <AppTextInput label="Item name" placeholder="Item name" value={itemName} onChangeText={setItemName} />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsWrap}>
            {CATEGORIES.map((category) => {
              const active = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <AppTextInput
            label="Description"
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            inputStyle={styles.multiline}
          />
          <AppTextInput label="Lost location" placeholder="Location" value={locationLost} onChangeText={setLocationLost} />
          <AppTextInput label="Date lost" placeholder="Date" value={dateLost} onChangeText={setDateLost} />
          <AppButton title="Submit for review" icon="send-outline" onPress={handleSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 13, lineHeight: 18, fontWeight: "400", fontFamily: FONT },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 120,
  },
  label: { color: COLORS.text, fontSize: 12, fontWeight: "500", fontFamily: FONT, marginBottom: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: SPACING.sm },
  chip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.muted, fontWeight: "400", fontSize: 11, fontFamily: FONT },
  chipTextActive: { color: COLORS.white, fontWeight: "500" },
  multiline: { minHeight: 82, textAlignVertical: "top", paddingTop: SPACING.md },
});
