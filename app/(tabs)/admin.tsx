import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { ConfirmModal } from "../../src/components/ConfirmModal";
import { EmptyState } from "../../src/components/EmptyState";
import { ItemCard } from "../../src/components/ItemCard";
import { Screen } from "../../src/components/Screen";
import { StatusBadge } from "../../src/components/StatusBadge";
import { db } from "../../src/config/firebase";
import { CATEGORIES } from "../../src/constants/categories";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { deleteFoundItem, deleteLostItem, updateClaimStatus, updateReportReviewStatus } from "../../src/services/lostFoundService";
import { ClaimRequest, ClaimStatus, FoundItem, LostItem } from "../../src/types";
import { formatDate } from "../../src/utils/validation";

type AdminMode = "review" | "claims" | "reports";
type ReportType = "found" | "lost";
type ReviewReport = { id: string; type: ReportType; item: FoundItem | LostItem };
type DeleteTarget = { id: string; name: string; type: ReportType } | null;

const CLAIM_FILTERS = ["all", "pending", "approved", "returned", "rejected", "cancelled"];
const REPORT_FILTERS = ["all", "pending", "posted", "rejected", "returned"];
const CATEGORY_FILTERS = [{ id: "all", name: "All" }, ...CATEGORIES];

export default function AdminScreen() {
  const { user, profile } = useAuth();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: AdminMode }>();
  const { showToast } = useToast();
  const [mode, setMode] = useState<AdminMode>((modeParam as AdminMode) || "review");
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [activeClaimFilter, setActiveClaimFilter] = useState("pending");
  const [activeReportFilter, setActiveReportFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (modeParam === "review" || modeParam === "claims" || modeParam === "reports") {
      setMode(modeParam);
    }
  }, [modeParam]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    setLoading(true);

    const claimQuery = query(collection(db, "claimRequests"), orderBy("createdAt", "desc"));
    const foundQuery = query(collection(db, "foundItems"), orderBy("createdAt", "desc"));
    const lostQuery = query(collection(db, "lostItems"), orderBy("createdAt", "desc"));

    const unsubClaims = onSnapshot(claimQuery, (snapshot) => {
      setClaims(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as ClaimRequest[]);
      setLoading(false);
    }, () => setLoading(false));

    const unsubFound = onSnapshot(foundQuery, (snapshot) => {
      setFoundItems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as FoundItem[]);
    });

    const unsubLost = onSnapshot(lostQuery, (snapshot) => {
      setLostItems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as LostItem[]);
    });

    return () => {
      unsubClaims();
      unsubFound();
      unsubLost();
    };
  }, [profile?.role]);

  const pendingReportsRaw = useMemo<ReviewReport[]>(() => [
    ...lostItems.filter((item) => item.status === "pending").map((item) => ({ id: item.id, type: "lost" as const, item })),
    ...foundItems.filter((item) => item.status === "pending").map((item) => ({ id: item.id, type: "found" as const, item })),
  ].sort((a, b) => ((b.item.createdAt?.seconds ?? 0) - (a.item.createdAt?.seconds ?? 0))), [lostItems, foundItems]);

  const allReports = useMemo<ReviewReport[]>(() => [
    ...lostItems.map((item) => ({ id: item.id, type: "lost" as const, item })),
    ...foundItems.map((item) => ({ id: item.id, type: "found" as const, item })),
  ].sort((a, b) => ((b.item.createdAt?.seconds ?? 0) - (a.item.createdAt?.seconds ?? 0))), [lostItems, foundItems]);

  const filteredPendingReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pendingReportsRaw.filter(({ item, type }) => {
      const location = type === "found" ? (item as FoundItem).locationFound : (item as LostItem).locationLost;
      const matchesCategory = activeCategoryId === "all" || item.categoryId === activeCategoryId;
      const matchesSearch = !term || item.itemName?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term) || location?.toLowerCase().includes(term) || item.categoryName?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [pendingReportsRaw, activeCategoryId, search]);

  const filteredClaims = useMemo(() => {
    const term = search.trim().toLowerCase();
    return claims.filter((claim) => {
      const matchesFilter = activeClaimFilter === "all" || claim.status === activeClaimFilter;
      const matchesSearch = !term || claim.foundItemName?.toLowerCase().includes(term) || claim.claimantName?.toLowerCase().includes(term) || claim.claimantEmail?.toLowerCase().includes(term) || claim.foundItemLocation?.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [claims, activeClaimFilter, search]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allReports.filter(({ item, type }) => {
      const status = item.status;
      const matchesFilter = activeReportFilter === "all" ||
        (activeReportFilter === "posted" && (status === "open" || status === "available")) ||
        status === activeReportFilter;
      const matchesCategory = activeCategoryId === "all" || item.categoryId === activeCategoryId;
      const location = type === "found" ? (item as FoundItem).locationFound : (item as LostItem).locationLost;
      const matchesSearch = !term || item.itemName?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term) || location?.toLowerCase().includes(term) || item.categoryName?.toLowerCase().includes(term);
      return matchesFilter && matchesCategory && matchesSearch;
    });
  }, [allReports, activeReportFilter, activeCategoryId, search]);

  const reviewCount = pendingReportsRaw.length;
  const claimCount = claims.filter((claim) => claim.status === "pending" || claim.status === "under_review").length;
  const postedCount = lostItems.filter((item) => item.status === "open").length + foundItems.filter((item) => item.status === "available").length;

  async function setClaimStatus(claim: ClaimRequest, status: ClaimStatus, remarks: string) {
    if (!user) return;
    try {
      setUpdatingId(`claim-${claim.id}`);
      await updateClaimStatus(claim.id, status, user.uid, remarks);
      showToast(`Claim marked as ${status.replace("_", " ")}.`, "success");
    } catch (error: any) {
      Alert.alert("Update failed", error?.message ?? "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function reviewReport(report: ReviewReport, decision: "approve" | "reject") {
    if (!user) return;
    try {
      setUpdatingId(`${report.type}-${report.id}`);
      await updateReportReviewStatus(report.type, report.id, decision, user.uid, decision === "reject" ? "Rejected by admin." : "Approved by admin.");
      showToast(decision === "approve" ? "Report approved and posted." : "Report rejected.", decision === "approve" ? "success" : "info");
    } catch (error: any) {
      Alert.alert("Review failed", error?.message ?? "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  function openReport(type: ReportType, id: string) {
    router.push({ pathname: "/item/[id]", params: { type, id } });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setErrorMessage("");
      setDeleting(true);
      if (deleteTarget.type === "found") await deleteFoundItem(deleteTarget.id);
      else await deleteLostItem(deleteTarget.id);
      showToast("Report deleted.", "success");
      setDeleteTarget(null);
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (profile?.role !== "admin") {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Admin only" message="Change your Firestore user role to admin, then log out and log in again." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin</Text>
          <Text style={styles.subtitle}>{mode === "review" ? "Review pending posts." : mode === "claims" ? "Manage item claims." : "View approved and archived posts."}</Text>
        </View>

      </View>

      <View style={styles.statsRow}>
        <Stat icon="time-outline" label="To review" value={reviewCount} />
        <Stat icon="receipt-outline" label="Claims" value={claimCount} />
        <Stat icon="checkmark-circle-outline" label="Posted" value={postedCount} />
      </View>

      <View style={styles.activeModeRow}>
        <View style={styles.activeModePill}>
          <Ionicons name={mode === "review" ? "time-outline" : mode === "claims" ? "receipt-outline" : "folder-open-outline"} size={14} color={COLORS.primary} />
          <Text style={styles.activeModeText}>{mode === "review" ? "Review posts" : mode === "claims" ? "Claims" : "Reports"}</Text>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.changeModeButton}>
          <Text style={styles.changeModeText}>Change</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={15} color={COLORS.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor={COLORS.muted} style={styles.searchInput} />
      </View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {mode === "claims" && <FilterRow data={CLAIM_FILTERS} active={activeClaimFilter} onChange={setActiveClaimFilter} />}
      {mode === "reports" && <FilterRow data={REPORT_FILTERS} active={activeReportFilter} onChange={setActiveReportFilter} />}
      {mode !== "claims" && <CategoryFilterRow active={activeCategoryId} onChange={setActiveCategoryId} />}

      {mode === "review" ? (
        <FlatList
          data={filteredPendingReports}
          keyExtractor={(report) => `${report.type}-${report.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ReviewCard
              report={item}
              loading={updatingId === `${item.type}-${item.id}`}
              onApprove={() => reviewReport(item, "approve")}
              onReject={() => reviewReport(item, "reject")}
              onOpen={() => openReport(item.type, item.id)}
            />
          )}
          ListEmptyComponent={<EmptyState loading={loading} icon="shield-checkmark-outline" title="No posts to review" message="New lost and found reports will appear here first." />}
        />
      ) : mode === "claims" ? (
        <FlatList
          data={filteredClaims}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ClaimCard item={item} loading={updatingId === `claim-${item.id}`} onApprove={() => setClaimStatus(item, "approved", "Claim approved.")} onReject={() => setClaimStatus(item, "rejected", "Claim rejected.")} onReturned={() => setClaimStatus(item, "returned", "Item returned to owner.")} />
          )}
          ListEmptyComponent={<EmptyState loading={loading} icon="receipt-outline" title="No claims" message="Claim transactions appear here in real time." />}
        />
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(report) => `${report.type}-${report.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.reportBlock}>
              <ItemCard item={item.item} type={item.type} onPress={() => openReport(item.type, item.id)} />
              <View style={styles.reportActions}>
                <AppButton title="View" icon="eye-outline" onPress={() => openReport(item.type, item.id)} variant="secondary" style={styles.actionButton} />
                <AppButton title="Delete" icon="trash-outline" onPress={() => setDeleteTarget({ id: item.id, name: item.item.itemName, type: item.type })} variant="ghost" style={styles.actionButton} />
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState loading={loading} icon="folder-open-outline" title="No reports" message="Reports appear here in real time." />}
        />
      )}

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete report?"
        message={`This will permanently delete ${deleteTarget?.name ?? "this report"}.`}
        confirmText="Delete"
        danger
        loading={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <AdminMenu
        visible={menuOpen}
        activeMode={mode}
        reviewCount={reviewCount}
        claimCount={claimCount}
        onClose={() => setMenuOpen(false)}
        onSelect={(nextMode) => {
          setMode(nextMode);
          setMenuOpen(false);
        }}
      />
    </Screen>
  );
}

function ReviewCard({ report, loading, onApprove, onReject, onOpen }: { report: ReviewReport; loading: boolean; onApprove: () => void; onReject: () => void; onOpen: () => void }) {
  const owner = report.type === "found" ? "Found report" : "Lost report";
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <Text style={styles.reviewType}>{owner}</Text>
        <StatusBadge status={report.item.status} />
      </View>
      <ItemCard item={report.item} type={report.type} onPress={onOpen} />
      <View style={styles.reportActions}>
        <AppButton title="Approve" icon="checkmark-outline" onPress={onApprove} loading={loading} style={styles.actionButton} />
        <AppButton title="Reject" icon="close-outline" onPress={onReject} loading={loading} variant="ghost" style={styles.actionButton} />
      </View>
    </View>
  );
}

function ClaimCard({ item, loading, onApprove, onReject, onReturned }: { item: ClaimRequest; loading: boolean; onApprove: () => void; onReject: () => void; onReturned: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.foundItemName}</Text>
          <Text style={styles.location}>{item.foundItemLocation}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.detailBox}>
        <Text style={styles.detailLabel}>Claimant</Text>
        <Text style={styles.detailValue}>{item.claimantName}</Text>
        <Text style={styles.detailMuted}>{item.claimantEmail}</Text>
      </View>
      <Text style={styles.message}>{item.claimMessage}</Text>
      <Text style={styles.meta}>Created: {formatDate(item.createdAt)}</Text>
      <View style={styles.actions}>
        {(item.status === "pending" || item.status === "under_review") && (
          <>
            <AppButton title="Approve" icon="checkmark-outline" onPress={onApprove} loading={loading} style={styles.actionButton} />
            <AppButton title="Reject" icon="close-outline" variant="ghost" onPress={onReject} loading={loading} style={styles.actionButton} />
          </>
        )}
        {item.status === "approved" && <AppButton title="Mark returned" icon="return-down-back-outline" onPress={onReturned} loading={loading} />}
      </View>
    </View>
  );
}

function FilterRow({ data, active, onChange }: { data: string[]; active: string; onChange: (value: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filters}
    >
      {data.map((item) => (
        <Pressable key={item} onPress={() => onChange(item)} style={[styles.filterChip, active === item && styles.filterChipActive]}>
          <Text style={[styles.filterText, active === item && styles.filterTextActive]}>{item.replace("_", " ")}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function CategoryFilterRow({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.categoryFilters}
    >
      {CATEGORY_FILTERS.map((item) => (
        <Pressable key={item.id} onPress={() => onChange(item.id)} style={[styles.categoryChip, active === item.id && styles.categoryChipActive]}>
          <Text style={[styles.categoryText, active === item.id && styles.categoryTextActive]}>{item.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function AdminMenu({ visible, activeMode, reviewCount, claimCount, onClose, onSelect }: { visible: boolean; activeMode: AdminMode; reviewCount: number; claimCount: number; onClose: () => void; onSelect: (mode: AdminMode) => void }) {
  function go(path: string) {
    onClose();
    router.push(path as any);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Pressable style={styles.drawer} onPress={(event) => event.stopPropagation()}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerTitle}>Admin menu</Text>
              <Text style={styles.drawerSubtitle}>Choose a section</Text>
            </View>
            <Pressable onPress={onClose} style={styles.drawerClose}><Ionicons name="close-outline" size={20} color={COLORS.text} /></Pressable>
          </View>

          <Text style={styles.drawerSection}>Management</Text>
          <DrawerItem label="Review posts" icon="time-outline" badge={reviewCount} active={activeMode === "review"} onPress={() => onSelect("review")} />
          <DrawerItem label="Claims" icon="receipt-outline" badge={claimCount} active={activeMode === "claims"} onPress={() => onSelect("claims")} />
          <DrawerItem label="Reports" icon="folder-open-outline" active={activeMode === "reports"} onPress={() => onSelect("reports")} />

          <View style={styles.drawerDivider} />
          <Text style={styles.drawerSection}>Navigation</Text>
          <DrawerItem label="Home" icon="home-outline" active={false} onPress={() => go('/(tabs)/home')} />
          <DrawerItem label="Messages" icon="chatbubbles-outline" active={false} onPress={() => go('/(tabs)/messages')} />
          <DrawerItem label="Profile" icon="person-outline" active={false} onPress={() => go('/(tabs)/profile')} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DrawerItem({ label, icon, active, badge, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.drawerItem, active && styles.drawerItemActive]}>
      <Ionicons name={icon} size={17} color={active ? COLORS.primary : COLORS.muted} />
      <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{label}</Text>
      {typeof badge === "number" && badge > 0 && <View style={styles.drawerBadge}><Text style={styles.drawerBadgeText}>{badge}</Text></View>}
    </Pressable>
  );
}

function ModeButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Ionicons name={icon} size={14} color={active ? COLORS.white : COLORS.muted} />
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={15} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.lg },
  headerIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 13, fontWeight: "400", fontFamily: FONT },
  menuButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 3 },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: "600", fontFamily: FONT },
  statLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "400", fontFamily: FONT },
  activeModeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md },
  activeModePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.primaryLight, borderRadius: 999, paddingHorizontal: SPACING.md, height: 32 },
  activeModeText: { color: COLORS.primary, fontWeight: "600", fontSize: 12, fontFamily: FONT },
  changeModeButton: { height: 32, paddingHorizontal: SPACING.md, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  changeModeText: { color: COLORS.text, fontWeight: "500", fontSize: 12, fontFamily: FONT },
  modeRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  modeButton: { flex: 1, height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  modeButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeText: { color: COLORS.muted, fontWeight: "500", fontSize: 12, fontFamily: FONT },
  modeTextActive: { color: COLORS.white },
  searchBox: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 42 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: "400", fontFamily: FONT },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: SPACING.sm, fontFamily: FONT },
  filterScroll: { height: 42, marginTop: SPACING.md, flexGrow: 0 },
  filters: { flexDirection: "row", gap: SPACING.sm, paddingRight: SPACING.md, alignItems: "center", paddingVertical: 2 },
  categoryFilters: { flexDirection: "row", gap: SPACING.sm, paddingRight: SPACING.md, alignItems: "center", paddingVertical: 2 },
  categoryChip: { height: 32, minWidth: 48, flexShrink: 0, paddingHorizontal: SPACING.md, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.muted, fontWeight: "500", fontSize: 12, fontFamily: FONT },
  categoryTextActive: { color: COLORS.white },
  filterChip: { height: 32, minWidth: 48, flexShrink: 0, paddingHorizontal: SPACING.md, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.muted, fontWeight: "400", fontSize: 12, textTransform: "capitalize", fontFamily: FONT },
  filterTextActive: { color: COLORS.white, fontWeight: "500" },
  listContent: { paddingBottom: 28, gap: SPACING.md, paddingTop: SPACING.md },
  reviewCard: { gap: SPACING.sm },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewType: { color: COLORS.muted, fontSize: 12, fontWeight: "500", fontFamily: FONT },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  itemName: { color: COLORS.text, fontSize: 16, fontWeight: "500", fontFamily: FONT },
  location: { marginTop: 3, color: COLORS.muted, fontWeight: "400", fontSize: 12, fontFamily: FONT },
  detailBox: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.soft },
  detailLabel: { color: COLORS.muted, fontSize: 11, fontFamily: FONT },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: "500", marginTop: 2, fontFamily: FONT },
  detailMuted: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONT },
  message: { marginTop: SPACING.md, color: COLORS.text, fontSize: 13, lineHeight: 19, fontFamily: FONT },
  meta: { marginTop: SPACING.sm, color: COLORS.muted, fontSize: 11, fontFamily: FONT },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  reportBlock: { gap: SPACING.sm },
  reportActions: { flexDirection: "row", gap: SPACING.sm },
  actionButton: { flex: 1 },
  menuOverlay: { flex: 1, backgroundColor: "rgba(17,24,39,0.30)", alignItems: "flex-end" },
  drawer: { width: 260, maxWidth: "82%", height: "100%", backgroundColor: COLORS.background, padding: SPACING.lg, gap: SPACING.sm, borderLeftWidth: 1, borderLeftColor: COLORS.border },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm },
  drawerTitle: { color: COLORS.text, fontSize: 18, fontWeight: "600", fontFamily: FONT },
  drawerSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONT },
  drawerSection: { color: COLORS.muted, fontSize: 11, fontWeight: "600", marginTop: SPACING.sm, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: FONT },
  drawerDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  drawerClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 46, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  drawerItemActive: { backgroundColor: COLORS.primaryLight, borderColor: "#BFDBFE" },
  drawerItemText: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: "500", fontFamily: FONT },
  drawerItemTextActive: { color: COLORS.primary, fontWeight: "600" },
  drawerBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center" },
  drawerBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: "600", fontFamily: FONT },
});
