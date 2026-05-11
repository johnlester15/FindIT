import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { ConfirmModal } from "../../src/components/ConfirmModal";
import { EmptyState } from "../../src/components/EmptyState";
import { ItemCard } from "../../src/components/ItemCard";
import { Screen } from "../../src/components/Screen";
import { db } from "../../src/config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { deleteFoundItem, deleteLostItem } from "../../src/services/lostFoundService";
import { FoundItem, LostItem } from "../../src/types";

type TabType = "lost" | "found";
type DeleteTarget = { id: string; name: string; type: TabType } | null;

export default function MyReportsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("lost");
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const lostQuery = query(collection(db, "lostItems"), where("userId", "==", user.uid));
    const foundQuery = query(collection(db, "foundItems"), where("reportedBy", "==", user.uid));

    const unsubLost = onSnapshot(lostQuery, (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)) as LostItem[];
      setLostItems(data);
      setLoading(false);
    }, () => setLoading(false));

    const unsubFound = onSnapshot(foundQuery, (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)) as FoundItem[];
      setFoundItems(data);
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      unsubLost();
      unsubFound();
    };
  }, [user]);

  const data = useMemo(() => activeTab === "lost" ? lostItems : foundItems, [activeTab, lostItems, foundItems]);

  function editReport(id: string) {
    router.push({ pathname: "/edit/[type]/[id]", params: { type: activeTab, id } });
  }

  function openReport(id: string) {
    router.push({ pathname: "/item/[id]", params: { type: activeTab, id } });
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

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="folder-open-outline" size={22} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My reports</Text>
          <Text style={styles.subtitle}>Edit, delete, and check approval status.</Text>
        </View>
      </View>

      <View style={styles.tabBox}>
        <TabButton label={`Lost ${lostItems.length}`} icon="alert-circle-outline" active={activeTab === "lost"} onPress={() => setActiveTab("lost")} />
        <TabButton label={`Found ${foundItems.length}`} icon="add-circle-outline" active={activeTab === "found"} onPress={() => setActiveTab("found")} />
      </View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.reportBlock}>
            <ItemCard item={item} type={activeTab} onPress={() => openReport(item.id)} />
            <View style={styles.actionRow}>
              <AppButton title="Edit" icon="create-outline" onPress={() => editReport(item.id)} variant="secondary" style={styles.actionButton} />
              <AppButton title="Delete" icon="trash-outline" onPress={() => setDeleteTarget({ id: item.id, name: item.itemName, type: activeTab })} variant="ghost" style={styles.actionButton} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState loading={loading} icon="folder-open-outline" title={`No ${activeTab} reports`} message="Your submitted reports will appear here." />
        }
      />

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
    </Screen>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.activeTab]}>
      <Ionicons name={icon} size={15} color={active ? COLORS.white : COLORS.muted} />
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.lg },
  headerIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 13, fontWeight: "400", fontFamily: FONT },
  tabBox: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  tab: { flex: 1, height: 40, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontWeight: "500", fontSize: 12, fontFamily: FONT },
  activeTabText: { color: COLORS.white },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: SPACING.sm, fontFamily: FONT },
  listContent: { paddingBottom: 120, gap: SPACING.md },
  reportBlock: { gap: SPACING.sm },
  actionRow: { flexDirection: "row", gap: SPACING.sm },
  actionButton: { flex: 1 },
});
