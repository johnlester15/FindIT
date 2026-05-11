import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Screen } from "../../src/components/Screen";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { validateEmail, validatePassword } from "../../src/utils/validation";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const cleanEmail = email.trim();
    if (!validateEmail(cleanEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert("Invalid password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await login(cleanEmail, password);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Login failed", error?.message ?? "Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.authBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="search-outline" size={28} color={COLORS.white} />
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue using FindIt.</Text>

          <View style={styles.card}>
            <AppTextInput
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppTextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <AppButton title="Log in" icon="log-in-outline" onPress={handleLogin} loading={loading} />

            <Text style={styles.footerText}>
              No account yet?{" "}
              <Link href="/auth/register" style={styles.link}>
                Create one
              </Link>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  authBox: {
    width: "100%",
    alignItems: "center",
    gap: SPACING.md,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    fontFamily: FONT,
    marginTop: SPACING.sm,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: FONT,
    marginBottom: SPACING.sm,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  footerText: {
    marginTop: SPACING.lg,
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "500",
    fontFamily: FONT,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "600",
    fontFamily: FONT,
  },
});
