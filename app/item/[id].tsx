import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AppTextInput } from "../../src/components/AppTextInput";
import { ConfirmModal } from "../../src/components/ConfirmModal";
import { EmptyState } from "../../src/components/EmptyState";
import { ImagePickerBox } from "../../src/components/ImagePickerBox";
import { Screen } from "../../src/components/Screen";
import { StatusBadge } from "../../src/components/StatusBadge";
import { UserMini } from "../../src/components/UserMini";
import { db } from "../../src/config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { createClaimRequest, createOrGetConversation, deleteFoundItem, deleteLostItem, updateReportReviewStatus } from "../../src/services/lostFoundService";
import { FoundItem, LostItem, ReportType } from "../../src/types";
import { formatDate } from "../../src/utils/validation";

export default function ItemDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: ReportType }>();
  const reportType: ReportType = type === "lost" ? "lost" : "found";
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [item, setItem] = useState<FoundItem | LostItem | null>(null);
  const [myLostItems, setMyLostItems] = useState<LostItem[]>([]);
  const [selectedLostItemId, setSelectedLostItemId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const collectionName = reportType === "found" ? "foundItems" : "lostItems";
    const unsub = onSnapshot(doc(db, collectionName, id), (docSnap) => {
      setItem(docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as FoundItem | LostItem) : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id, reportType]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "lostItems"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const nextItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as LostItem[];
      setMyLostItems(nextItems.filter((lost) => lost.status === "open" || lost.status === "matched"));
    });
    return unsub;
  }, [user]);

  const meta = useMemo(() => {
    if (!item) return null;
    if (reportType === "found") {
      const found = item as FoundItem;
      return {
        ownerId: found.reportedBy,
        locationLabel: "Found at",
        dateLabel: "Date found",
        location: found.locationFound,
        date: found.dateFound || formatDate(found.createdAt),
        title: "Found item",
      };
    }
    const lost = item as LostItem;
    return {
      ownerId: lost.userId,
      locationLabel: "Lost at",
      dateLabel: "Date lost",
      location: lost.locationLost,
      date: lost.dateLost || formatDate(lost.createdAt),
      title: "Lost item",
    };
  }, [item, reportType]);

  async function handleDelete() {
    if (!item) return;
    try {
      setErrorMessage("");
      setSubmitting(true);
      if (reportType === "found") await deleteFoundItem(item.id);
      else await deleteLostItem(item.id);
      setShowDeleteModal(false);
      showToast("Report deleted.", "success");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Delete failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitClaim() {
    if (!user || !item || reportType !== "found") return;
    const found = item as FoundItem;
    if (found.status !== "available") {
      Alert.alert("Not available", "Only approved and available found items can be claimed.");
      return;
    }
    if (!claimMessage.trim()) {
      Alert.alert("Missing proof message", "Please explain why this item is yours.");
      return;
    }

    try {
      setSubmitting(true);
      await createClaimRequest({
        claimantId: user.uid,
        foundItemId: found.id,
        lostItemId: selectedLostItemId,
        claimMessage: claimMessage.trim(),
        proofImageUrl: proofImageUri ?? "",
      });

      showToast("Claim submitted. The post stays visible until returned.", "success");
      router.replace("/(tabs)/claims");
    } catch (error: any) {
      Alert.alert("Could not claim", error?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startChat() {
    if (!user || !item || !meta) return;
    try {
      setSubmitting(true);
      const conversationId = await createOrGetConversation({
        reportType,
        reportId: item.id,
        itemName: item.itemName,
        ownerId: meta.ownerId,
        requesterId: user.uid,
      });
      showToast("Chat opened.", "info");
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
    } catch (error: any) {
      Alert.alert("Chat unavailable", error?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sharePost() {
    if (!item || !meta) return;
    try {
      await Share.share({
        title: `FindIt ${meta.title}`,
        message: `${meta.title}: ${item.itemName}\nCategory: ${item.categoryName}\n${meta.locationLabel}: ${meta.location}\nDescription: ${item.description}`,
      });
    } catch {
      showToast("Sharing is not available on this device.", "info");
    }
  }

  async function review(decision: "approve" | "reject") {
    if (!user || !item) return;
    try {
      setSubmitting(true);
      await updateReportReviewStatus(reportType, item.id, decision, user.uid, decision === "reject" ? "Rejected by admin." : "Approved by admin.");
      showToast(decision === "approve" ? "Post approved." : "Post rejected.", decision === "approve" ? "success" : "info");
    } catch (error: any) {
      Alert.alert("Review failed", error?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Screen><EmptyState loading title="Loading item" message="Please wait." /></Screen>;
  if (!item || !meta) return <Screen><EmptyState icon="alert-circle-outline" title="Item not found" message="This item may have been deleted." /></Screen>;

  const isOwner = meta.ownerId === user?.uid;
  const isAdmin = profile?.role === "admin";
  const canOwnerManage = isOwner;
  const canMessage = !!user && !isOwner;
  const canClaim = reportType === "found" && (item as FoundItem).status === "available" && !isOwner && !isAdmin;
  const canReview = isAdmin && item.status === "pending";
  const ownerName = reportType === "found" ? (item as FoundItem).posterName || (item as FoundItem).reportedByName : (item as LostItem).posterName || (item as LostItem).userName;
  const ownerPhoto = reportType === "found" ? (item as FoundItem).posterPhotoUrl || (item as FoundItem).reportedByPhotoUrl : (item as LostItem).posterPhotoUrl || (item as LostItem).userPhotoUrl;

  return (
    <Screen scrollable>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={16} color={COLORS.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <View style={styles.imageBox}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" /> : <Ionicons name="image-outline" size={38} color={COLORS.muted} />}
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{meta.title}</Text>
              <Text style={styles.title}>{item.itemName}</Text>
              <Text style={styles.category}>{item.categoryName}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <UserMini
            userId={meta.ownerId}
            fallbackName={ownerName}
            fallbackPhoto={ownerPhoto}
            label={reportType === "found" ? "Posted by" : "Reported by"}
            size="md"
          />

          <Info icon="location-outline" label={meta.locationLabel} value={meta.location} />
          <Info icon="calendar-outline" label={meta.dateLabel} value={meta.date} />
          <Info icon="document-text-outline" label="Description" value={item.description} multiline />

          <View style={styles.quickActions}>
            <AppButton title="Share" icon="share-social-outline" onPress={sharePost} variant="secondary" style={styles.actionButton} />
            {canMessage && <AppButton title="Message" icon="chatbubble-ellipses-outline" onPress={startChat} loading={submitting} style={styles.actionButton} />}
          </View>

          {canReview && (
            <View style={styles.ownerActions}>
              <AppButton title="Approve" icon="checkmark-outline" onPress={() => review("approve")} loading={submitting} style={styles.actionButton} />
              <AppButton title="Reject" icon="close-outline" onPress={() => review("reject")} loading={submitting} variant="ghost" style={styles.actionButton} />
            </View>
          )}

          {canOwnerManage && (
            <View style={styles.ownerActions}>
              <AppButton title="Edit" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: "/edit/[type]/[id]", params: { type: reportType, id: item.id } })} style={styles.actionButton} />
              <AppButton title="Delete" icon="trash-outline" variant="ghost" onPress={() => setShowDeleteModal(true)} style={styles.actionButton} />
            </View>
          )}
        </View>

        {canClaim ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Claim this item</Text>
            <Text style={styles.sectionSubtitle}>Admin will review your proof. The post will stay public until it is returned.</Text>

            {myLostItems.length > 0 && (
              <>
                <Text style={styles.label}>Link lost report</Text>
                <View style={styles.lostList}>
                  <Pressable onPress={() => setSelectedLostItemId(null)} style={[styles.lostChip, selectedLostItemId === null && styles.lostChipActive]}>
                    <Text style={[styles.lostChipText, selectedLostItemId === null && styles.lostChipTextActive]}>None</Text>
                  </Pressable>
                  {myLostItems.map((lost) => {
                    const active = selectedLostItemId === lost.id;
                    return (
                      <Pressable key={lost.id} onPress={() => setSelectedLostItemId(lost.id)} style={[styles.lostChip, active && styles.lostChipActive]}>
                        <Text style={[styles.lostChipText, active && styles.lostChipTextActive]} numberOfLines={1}>{lost.itemName}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <ImagePickerBox imageUri={proofImageUri} onChange={setProofImageUri} label="Proof photo" />
            <AppTextInput label="Proof message" placeholder="Describe details only the owner would know..." value={claimMessage} onChangeText={setClaimMessage} multiline inputStyle={styles.multiline} />
            <AppButton title="Submit claim" icon="send-outline" onPress={submitClaim} loading={submitting} />
          </View>
        ) : (
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.noteText}>
              {isOwner ? "This is your report." : reportType === "lost" ? "Message the poster if you found this item." : isAdmin ? "Admins can review posts and claim requests only." : "Claim is unavailable right now."}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <ConfirmModal visible={showDeleteModal} title="Delete report?" message="This permanently deletes this report." confirmText="Delete" danger loading={submitting} onCancel={() => !submitting && setShowDeleteModal(false)} onConfirm={handleDelete} />
    </Screen>
  );
}

function Info({ icon, label, value, multiline }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; multiline?: boolean }) {
  return (
    <View style={styles.infoBlock}>
      <View style={styles.infoLabelRow}>
        <Ionicons name={icon} size={14} color={COLORS.muted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, multiline && styles.infoMultiline]}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: SPACING.md },
  backText: { color: COLORS.text, fontWeight: "500", fontFamily: FONT, fontSize: 13 },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: SPACING.sm, fontFamily: FONT },
  imageBox: { height: 190, borderRadius: RADIUS.xl, backgroundColor: COLORS.soft, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: SPACING.md },
  image: { width: "100%", height: "100%" },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md, marginBottom: SPACING.md },
  kicker: { color: COLORS.muted, fontSize: 12, fontWeight: "400", marginBottom: 2, fontFamily: FONT },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "600", fontFamily: FONT },
  category: { color: COLORS.primary, fontSize: 12, fontWeight: "500", marginTop: 3, fontFamily: FONT },
  infoBlock: { paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  infoLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "400", fontFamily: FONT },
  infoValue: { color: COLORS.text, fontSize: 13, fontWeight: "400", fontFamily: FONT },
  infoMultiline: { lineHeight: 20 },
  quickActions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  ownerActions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  actionButton: { flex: 1 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600", fontFamily: FONT },
  sectionSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: SPACING.md, fontFamily: FONT },
  label: { color: COLORS.text, fontSize: 12, fontWeight: "500", marginBottom: 6, fontFamily: FONT },
  lostList: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.md },
  lostChip: { maxWidth: "100%", height: 32, paddingHorizontal: SPACING.md, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.soft, alignItems: "center", justifyContent: "center" },
  lostChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  lostChipText: { color: COLORS.muted, fontSize: 12, fontWeight: "400", fontFamily: FONT },
  lostChipTextActive: { color: COLORS.white, fontWeight: "500" },
  multiline: { minHeight: 84, textAlignVertical: "top", paddingTop: SPACING.md },
  noteCard: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  noteText: { flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 18, fontFamily: FONT },
});
