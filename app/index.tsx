import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { COLORS, SPACING } from "../src/constants/theme";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <Text style={styles.logo}>F</Text>
        </View>
        <Text style={styles.title}>FindIt</Text>
        <Text style={styles.subtitle}>Campus Lost & Found</Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </View>
    );
  }

  return user ? <Redirect href="/(tabs)/home" /> : <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  logo: {
    color: COLORS.white,
    fontSize: 42,
    fontWeight: "600",
  },
  title: {
    marginTop: SPACING.lg,
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: "600",
  },
});
