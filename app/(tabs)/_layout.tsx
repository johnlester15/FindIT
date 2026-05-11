import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { AdminGlobalMenu } from "../../src/components/AdminGlobalMenu";
import { db } from "../../src/config/firebase";
import { COLORS, FONT } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { Conversation } from "../../src/types";

function TabIconWithDot({ name, color, size, showDot }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number; showDot?: boolean }) {
  return (
    <View style={{ width: 30, height: 26, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} color={color} size={size} />
      {showDot && (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 3,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: COLORS.danger,
            borderWidth: 1.5,
            borderColor: COLORS.white,
          }}
        />
      )}
    </View>
  );
}

const baseTabStyle = {
  position: "absolute" as const,
  backgroundColor: COLORS.white,
  borderTopColor: COLORS.border,
  height: 62,
  paddingTop: 6,
  paddingBottom: 8,
  ...(Platform.OS === "web" ? { maxWidth: 430, width: "100%" as const, alignSelf: "center" as const } : {}),
};

export default function TabLayout() {
  const { user, profile, loading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasUnreadMessages(false);
      return;
    }

    const q = query(collection(db, "conversations"), where("participantIds", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as Conversation[];
      setHasUnreadMessages(conversations.some((conversation) => conversation.unreadBy?.includes(user.uid)));
    });

    return unsub;
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: isAdmin ? { display: "none" } : baseTabStyle,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500", fontFamily: FONT },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }) => <TabIconWithDot name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="report-lost" options={{ title: "Lost", tabBarIcon: ({ color, size }) => <TabIconWithDot name="alert-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="report-found" options={{ title: "Found", tabBarIcon: ({ color, size }) => <TabIconWithDot name="add-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="my-reports" options={{ title: "Reports", tabBarIcon: ({ color, size }) => <TabIconWithDot name="folder-open-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="claims" options={{ title: "Claims", tabBarIcon: ({ color, size }) => <TabIconWithDot name="receipt-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="messages" options={{ title: "Chat", tabBarIcon: ({ color, size }) => <TabIconWithDot name="chatbubbles-outline" color={color} size={size} showDot={hasUnreadMessages} /> }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color, size }) => <TabIconWithDot name="shield-checkmark-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <TabIconWithDot name="person-outline" color={color} size={size} /> }} />
    </Tabs>
      <AdminGlobalMenu visible={isAdmin} hasUnreadMessages={hasUnreadMessages} />
    </View>
  );
}
