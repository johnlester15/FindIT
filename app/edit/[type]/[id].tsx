import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../../src/components/AppButton";
import { AppTextInput } from "../../../src/components/AppTextInput";
import { ConfirmModal } from "../../../src/components/ConfirmModal";
import { EmptyState } from "../../../src/components/EmptyState";
import { ImagePickerBox } from "../../../src/components/ImagePickerBox";
import { Screen } from "../../../src/components/Screen";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { db } from "../../../src/config/firebase";
import { CATEGORIES, getCategoryName } from "../../../src/constants/categories";
import { COLORS, FONT, RADIUS, SPACING } from "../../../src/constants/theme";
import { useAuth } from "../../../src/context/AuthContext";
import { useToast } from "../../../src/context/ToastContext";
import { deleteFoundItem, deleteLostItem, updateFoundItem, updateLostItem } from "../../../src/services/lostFoundService";
import { FoundItem, LostItem } from "../../../src/types";

type ReportType = "lost" | "found";

export default function EditReportScreen() {
  const { type, id } = useLocalSearchParams<{ type: ReportType; id: string }>();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadedItem, setLoadedItem] = useState<LostItem | FoundItem | null>(null);

  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateText, setDateText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const collectionName = type === "found" ? "foundItems" : "lostItems";
  const isFound = type === "found";

  useEffect(() => {
    if (!id || !type) return;

    const unsub = onSnapshot(
      doc(db, collectionName, id),
      (snap) => {
        if (!snap.exists()) {
          setLoadedItem(null);
          setLoading(false);
          return;
        }

        const data = { id: snap.id, ...snap.data() } as LostItem | FoundItem;
        setLoadedItem(data);
        setItemName(data.itemName ?? "");
        setCategoryId(data.categoryId ?? CATEGORIES[0].id);
        setDescription(data.description ?? "");
        setImageUri(data.imageUrl ?? null);

        if (isFound) {
          setLocation((data as FoundItem).locationFound ?? "");
          setDateText((data as FoundItem).dateFound ?? "");
        } else {
          setLocation((data as LostItem).locationLost ?? "");
          setDateText((data as LostItem).dateLost ?? "");
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [id, type, collectionName, isFound]);

  const canManage = useMemo(() => {
    if (!user || !loadedItem) return false;
    if (profile?.role === "admin") return true;
    if (isFound) return (loadedItem as FoundItem).reportedBy === user.uid;
    return (loadedItem as LostItem).userId === user.uid;
  }, [user, profile?.role, loadedItem, isFound]);

  async function handleSave() {
    if (!id || !type || !canManage) return;
    if (!itemName.trim() || !description.trim() || !location.trim() || !dateText.trim()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    try {
      setErrorMessage("");
      setSaving(true);
      const resetToPending = profile?.role !== "admin";
      if (isFound) {
        await updateFoundItem(id, {
          itemName: itemName.trim(),
          categoryId,
          categoryName: getCategoryName(categoryId),
          description: description.trim(),
          locationFound: location.trim(),
          dateFound: dateText.trim(),
          imageUrl: imageUri ?? "",
        }, resetToPending);
      } else {
        await updateLostItem(id, {
          itemName: itemName.trim(),
          categoryId,
          categoryName: getCategoryName(categoryId),
          description: description.trim(),
          locationLost: location.trim(),
          dateLost: dateText.trim(),
          imageUrl: imageUri ?? "",
        }, resetToPending);
      }
      showToast(resetToPending ? "Saved and sent for review." : "Report updated.", "success");
      router.back();
    } catch (error: any) {
      Alert.alert("Update failed", error?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !type || !canManage) return;
    try {
      setErrorMessage("");
      setDeleting(true);
      if (isFound) await deleteFoundItem(id);
      else await deleteLostItem(id);
      setShowDeleteModal(false);
      showToast("Report deleted.", "success");
      router.replace("/(tabs)/my-reports");
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <Screen><EmptyState loading title="Loading" message="Please wait." /></Screen>;
  }

  if (!loadedItem) {
    return <Screen><EmptyState icon="document-outline" title="Report not found" message="It may have been deleted." /></Screen>;
  }

  if (!canManage) {
    return <Screen><EmptyState icon="lock-closed-outline" title="Not allowed" message="Only the owner or admin can edit this report." /></Screen>;
  }

  return (
    <Screen scrollable>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={16} color={COLORS.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Edit {isFound ? "found" : "lost"} report</Text>
            <Text style={styles.subtitle}>User edits return to admin review.</Text>
          </View>
          <StatusBadge status={loadedItem.status} />
        </View>

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <View style={styles.card}>
          <ImagePickerBox imageUri={imageUri} onChange={setImageUri} label="Item photo" />
          <AppTextInput label="Item name" placeholder="Item name" value={itemName} onChangeText={setItemName} />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsWrap}>
            {CATEGORIES.map((category) => {
              const active = category.id === categoryId;
              return (
                <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <AppTextInput label="Description" placeholder="Description" value={description} onChangeText={setDescription} multiline inputStyle={styles.multiline} />
          <AppTextInput label={isFound ? "Found location" : "Lost location"} placeholder="Location" value={location} onChangeText={setLocation} />
          <AppTextInput label={isFound ? "Date found" : "Date lost"} placeholder="Date" value={dateText} onChangeText={setDateText} />

          <AppButton title="Save changes" icon="checkmark-outline" onPress={handleSave} loading={saving} />
          <AppButton title="Delete report" icon="trash-outline" onPress={() => setShowDeleteModal(true)} loading={deleting} variant="ghost" style={{ marginTop: SPACING.sm }} />
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Delete report?"
        message="This permanently deletes the report from Firestore."
        confirmText="Delete"
        danger
        loading={deleting}
        onCancel={() => !deleting && setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: SPACING.md },
  backText: { color: COLORS.text, fontWeight: "500", fontSize: 13, fontFamily: FONT },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 13, lineHeight: 18, fontWeight: "400", fontFamily: FONT },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: SPACING.sm, fontFamily: FONT },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 100 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: "500", marginBottom: 6, fontFamily: FONT },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: SPACING.sm },
  chip: { marginRight: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, height: 32, borderRadius: 999, backgroundColor: COLORS.soft, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.muted, fontWeight: "400", fontSize: 11, fontFamily: FONT },
  chipTextActive: { color: COLORS.white, fontWeight: "500" },
  multiline: { minHeight: 84, textAlignVertical: "top", paddingTop: SPACING.md },
});
