import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { ItemCard } from "../../src/components/ItemCard";
import { Screen } from "../../src/components/Screen";
import { db } from "../../src/config/firebase";
import { CATEGORIES } from "../../src/constants/categories";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { seedCategories } from "../../src/services/lostFoundService";
import { FoundItem, LostItem } from "../../src/types";

type HomeReport = {
  id: string;
  type: "found" | "lost";
  item: FoundItem | LostItem;
};

export default function HomeScreen() {
  const { profile } = useAuth();
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedCategories().catch(() => undefined);

    const foundQuery = query(collection(db, "foundItems"), orderBy("createdAt", "desc"));
    const lostQuery = query(collection(db, "lostItems"), orderBy("createdAt", "desc"));

    const unsubFound = onSnapshot(
      foundQuery,
      (snapshot) => {
        setFoundItems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as FoundItem[]);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubLost = onSnapshot(
      lostQuery,
      (snapshot) => {
        setLostItems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as LostItem[]);
      },
      () => undefined
    );

    return () => {
      unsubFound();
      unsubLost();
    };
  }, []);

  const postedReports = useMemo<HomeReport[]>(() => {
    const reports: HomeReport[] = [
      ...foundItems.filter((item) => item.status === "available" || item.status === "under_review").map((item) => ({ id: item.id, type: "found" as const, item })),
      ...lostItems.filter((item) => item.status === "open" || item.status === "matched" || item.status === "claimed").map((item) => ({ id: item.id, type: "lost" as const, item })),
    ];

    return reports.sort((a, b) => ((b.item.createdAt?.seconds ?? 0) - (a.item.createdAt?.seconds ?? 0)));
  }, [foundItems, lostItems]);

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return postedReports.filter(({ item, type }) => {
      const location = type === "found" ? (item as FoundItem).locationFound : (item as LostItem).locationLost;
      const matchesCategory = categoryId === "all" || item.categoryId === categoryId;
      const matchesSearch =
        !term ||
        item.itemName?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        location?.toLowerCase().includes(term) ||
        item.categoryName?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [postedReports, search, categoryId]);

  const stats = useMemo(() => {
    return {
      posted: postedReports.length,
      review: foundItems.filter((item) => item.status === "pending").length + lostItems.filter((item) => item.status === "pending").length,
      returned: foundItems.filter((item) => item.status === "returned").length + lostItems.filter((item) => item.status === "closed").length,
    };
  }, [postedReports.length, foundItems, lostItems]);

  return (
    <Screen>
      <FlatList
        data={visibleReports}
        keyExtractor={(report) => `${report.type}-${report.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Hello, {profile?.fullName?.split(" ")[0] ?? "there"}</Text>
                <Text style={styles.subtitle}>Approved lost and found posts.</Text>
              </View>
              {profile?.role !== "admin" && (
                <Pressable style={styles.headerIcon} onPress={() => router.push("/(tabs)/my-reports")}>
                  <Ionicons name="folder-open-outline" size={22} color={COLORS.primary} />
                </Pressable>
              )}
            </View>

            <View style={styles.statsRow}>
              <Stat icon="checkmark-circle-outline" label="Posted" value={stats.posted} />
              <Stat icon="time-outline" label="Review" value={stats.review} />
              <Stat icon="return-down-back-outline" label="Closed" value={stats.returned} />
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={17} color={COLORS.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search item or location"
                placeholderTextColor={COLORS.muted}
                style={styles.searchInput}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categories}>
              {[{ id: "all", name: "All" }, ...CATEGORIES].map((item) => {
                const active = categoryId === item.id;
                return (
                  <Pressable key={item.id} onPress={() => setCategoryId(item.id)} style={[styles.categoryChip, active && styles.categoryChipActive]}>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ItemCard
              item={item.item}
              type={item.type}
              onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id, type: item.type } })}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            loading={loading}
            icon="search-outline"
            title="No approved posts"
            message="Reports will appear here after admin approval."
          />
        }
      />
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={15} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.lg },
  greeting: { color: COLORS.text, fontSize: 22, lineHeight: 28, fontWeight: "600", fontFamily: FONT },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 3, fontWeight: "400", fontFamily: FONT },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    justifyContent: "center",
  },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: "600", marginTop: 5, fontFamily: FONT },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONT },
  searchBox: {
    height: 46,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, fontFamily: FONT, outlineStyle: "none" as any },
  categoryScroll: { height: 42, marginBottom: SPACING.md, flexGrow: 0 },
  categories: { flexDirection: "row", gap: SPACING.sm, alignItems: "center", paddingRight: 28, paddingVertical: 2 },
  categoryChip: {
    height: 34,
    minWidth: 48,
    flexShrink: 0,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.muted, fontSize: 12, fontWeight: "400", fontFamily: FONT },
  categoryTextActive: { color: COLORS.white, fontWeight: "500" },
  cardWrap: { marginBottom: SPACING.sm },
});
