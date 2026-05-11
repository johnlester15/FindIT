import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { StatusBadge } from "../../src/components/StatusBadge";
import { db } from "../../src/config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { Conversation } from "../../src/types";
import { formatDate } from "../../src/utils/validation";

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participantIds", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as Conversation[]);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const sorted = useMemo(() => {
    return [...conversations].sort((a, b) => (b.updatedAt?.seconds ?? b.lastMessageAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? a.lastMessageAt?.seconds ?? 0));
  }, [conversations]);

  return (
    <Screen>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerIcon}><Ionicons name="chatbubbles-outline" size={22} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Messages</Text>
              <Text style={styles.subtitle}>Talk to the person who posted the item.</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ConversationCard
            item={item}
            isUnread={!!user && item.unreadBy?.includes(user.uid)}
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={<EmptyState loading={loading} icon="chatbubble-ellipses-outline" title="No messages" message="Open a post and tap Message to start a chat." />}
      />
    </Screen>
  );
}

function ConversationCard({ item, isUnread, onPress }: { item: Conversation; isUnread: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, isUnread && styles.unreadCard, pressed && styles.pressed]}>
      <View style={styles.iconBox}>
        <Ionicons name={item.reportType === "found" ? "cube-outline" : "alert-circle-outline"} size={21} color={COLORS.primary} />
        {isUnread && <View style={styles.redDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.itemName, isUnread && styles.unreadName]} numberOfLines={1}>{item.itemName}</Text>
          <StatusBadge status={item.reportType} />
        </View>
        <Text style={[styles.message, isUnread && styles.unreadMessage]} numberOfLines={1}>{item.lastMessage || "No messages yet"}</Text>
        <Text style={styles.date}>{formatDate(item.updatedAt || item.lastMessageAt)}</Text>
      </View>
      {isUnread ? <View style={styles.newPill}><Text style={styles.newText}>New</Text></View> : <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 112, gap: SPACING.md },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.md },
  headerIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "600", fontFamily: FONT },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: FONT },
  card: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  unreadCard: { borderColor: COLORS.primary, backgroundColor: "#F9FBFF" },
  pressed: { opacity: 0.9 },
  iconBox: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  redDot: { position: "absolute", top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.danger, borderWidth: 1.5, borderColor: COLORS.white },
  rowTop: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  itemName: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: "500", fontFamily: FONT },
  unreadName: { fontWeight: "600" },
  message: { color: COLORS.muted, fontSize: 12, marginTop: 4, fontFamily: FONT },
  unreadMessage: { color: COLORS.text, fontWeight: "500" },
  date: { color: COLORS.muted, fontSize: 11, marginTop: 5, fontFamily: FONT },
  newPill: { backgroundColor: COLORS.dangerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  newText: { color: COLORS.danger, fontSize: 10, fontWeight: "600", fontFamily: FONT },
});
