import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { StatusBadge } from "../../src/components/StatusBadge";
import { db } from "../../src/config/firebase";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useToast } from "../../src/context/ToastContext";
import { markConversationRead, sendChatMessage } from "../../src/services/lostFoundService";
import { ChatMessage, Conversation } from "../../src/types";
import { formatDate } from "../../src/utils/validation";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "conversations", id), (snap) => {
      setConversation(snap.exists() ? ({ id: snap.id, ...snap.data() } as Conversation) : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    markConversationRead(id, user.uid).catch(() => undefined);
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "messages"), where("conversationId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as ChatMessage[];
      next.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      setMessages(next);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    return unsub;
  }, [id]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  async function handleSend() {
    if (!id || !user || !canSend) return;
    try {
      setSending(true);
      await sendChatMessage(id, user.uid, text);
      setText("");
    } catch (error: any) {
      showToast(error?.message ?? "Message failed.", "error");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Screen><EmptyState loading title="Loading chat" message="Please wait." /></Screen>;
  if (!conversation) return <Screen><EmptyState icon="chatbubble-ellipses-outline" title="Chat not found" message="This conversation may have been deleted." /></Screen>;

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrapper} keyboardVerticalOffset={10}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{conversation.itemName}</Text>
              <StatusBadge status={conversation.reportType} />
            </View>
            <Text style={styles.subtitle}>Coordinate a safe meet-up for the item.</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <MessageBubble item={item} mine={item.senderId === user?.uid} />}
          ListEmptyComponent={<EmptyState icon="chatbubble-outline" title="Start the chat" message="Send a short message about the item and where to meet." />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            multiline
            returnKeyType="send"
          />
          <Pressable onPress={handleSend} disabled={!canSend} style={[styles.sendButton, !canSend && styles.sendDisabled]}>
            <Ionicons name="send" size={16} color={COLORS.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({ item, mine }: { item: ChatMessage; mine: boolean }) {
  return (
    <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}>
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
        <Text style={[styles.bubbleText, mine && styles.mineText]}>{item.text}</Text>
        <Text style={[styles.timeText, mine && styles.mineTime]}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.sm },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  title: { flex: 1, color: COLORS.text, fontSize: 18, fontWeight: "600", fontFamily: FONT },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONT },
  messages: { flexGrow: 1, paddingTop: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm },
  bubbleWrap: { flexDirection: "row" },
  mineWrap: { justifyContent: "flex-end" },
  theirWrap: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  mineBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: RADIUS.sm },
  theirBubble: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: RADIUS.sm },
  bubbleText: { color: COLORS.text, fontSize: 13, lineHeight: 19, fontFamily: FONT },
  mineText: { color: COLORS.white },
  timeText: { color: COLORS.muted, fontSize: 10, marginTop: 4, fontFamily: FONT },
  mineTime: { color: "rgba(255,255,255,0.75)" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  input: { flex: 1, maxHeight: 100, minHeight: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 10, color: COLORS.text, fontSize: 13, fontFamily: FONT },
  sendButton: { width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.45 },
});
