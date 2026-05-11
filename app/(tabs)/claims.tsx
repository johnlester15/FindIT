import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { ConfirmModal } from "../../src/components/ConfirmModal";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { StatusBadge } from "../../src/components/StatusBadge";
import { db } from "../../src/config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { updateClaimStatus } from "../../src/services/lostFoundService";
import { ClaimRequest } from "../../src/types";
import { formatDate } from "../../src/utils/validation";

const FILTERS = ["all", "pending", "approved", "returned", "rejected", "cancelled"];

export default function ClaimsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClaimRequest | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "claimRequests"), where("claimantId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const nextClaims = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)) as ClaimRequest[];
      setClaims(nextClaims);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user]);

  const filteredClaims = useMemo(() => {
    if (activeFilter === "all") return claims;
    return claims.filter((claim) => claim.status === activeFilter);
  }, [claims, activeFilter]);

  async function cancelClaim() {
    if (!user || !cancelTarget) return;
    try {
      setUpdatingId(cancelTarget.id);
      await updateClaimStatus(cancelTarget.id, "cancelled", user.uid, "Cancelled by claimant");
      showToast("Claim cancelled.", "success");
      setCancelTarget(null);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="receipt-outline" size={22} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My claims</Text>
          <Text style={styles.subtitle}>Track claim transaction status.</Text>
        </View>
      </View>

      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => {
          const active = activeFilter === item;
          return (
            <Pressable onPress={() => setActiveFilter(item)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.replace("_", " ")}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={filteredClaims}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.foundItemName}</Text>
                <Text style={styles.location}>{item.foundItemLocation}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.message}>{item.claimMessage}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Created: {formatDate(item.createdAt)}</Text>
              <Text style={styles.meta}>Updated: {formatDate(item.updatedAt)}</Text>
            </View>
            {!!item.adminRemarks && <Text style={styles.remarks}>Admin: {item.adminRemarks}</Text>}
            {(item.status === "pending" || item.status === "under_review") && (
              <AppButton title="Cancel claim" icon="close-outline" variant="ghost" loading={updatingId === item.id} onPress={() => setCancelTarget(item)} style={{ marginTop: SPACING.md }} />
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState loading={loading} icon="receipt-outline" title="No claims" message="Open an approved found item and submit a claim." />}
      />

      <ConfirmModal visible={!!cancelTarget} title="Cancel claim?" message="This will update the claim status to cancelled." confirmText="Cancel claim" danger loading={!!updatingId} onCancel={() => !updatingId && setCancelTarget(null)} onConfirm={cancelClaim} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.md },
  headerIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 13, fontWeight: "400", fontFamily: FONT },
  filters: { gap: SPACING.sm, paddingBottom: SPACING.md },
  filterChip: { height: 32, paddingHorizontal: SPACING.md, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.muted, fontWeight: "400", textTransform: "capitalize", fontSize: 12, fontFamily: FONT },
  filterTextActive: { color: COLORS.white, fontWeight: "500" },
  listContent: { paddingBottom: 120, gap: SPACING.md },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  itemName: { color: COLORS.text, fontSize: 16, fontWeight: "500", fontFamily: FONT },
  location: { marginTop: 3, color: COLORS.muted, fontWeight: "400", fontSize: 12, fontFamily: FONT },
  message: { marginTop: SPACING.md, color: COLORS.text, fontSize: 13, lineHeight: 19, fontFamily: FONT },
  metaRow: { marginTop: SPACING.md, gap: 4 },
  meta: { color: COLORS.muted, fontSize: 11, fontWeight: "400", fontFamily: FONT },
  remarks: { marginTop: SPACING.md, color: COLORS.warning, fontWeight: "400", fontSize: 12, lineHeight: 18, fontFamily: FONT },
});
