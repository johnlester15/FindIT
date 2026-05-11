import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Screen } from "../../src/components/Screen";
import { COLORS, FONT, RADIUS, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { validateEmail, validateName, validatePassword } from "../../src/utils/validation";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const cleanStudentId = studentId.trim();

    if (!validateName(cleanName)) {
      Alert.alert("Missing name", "Please enter your full name.");
      return;
    }
    if (!cleanStudentId) {
      Alert.alert("Missing ID", "Please enter your student or employee ID.");
      return;
    }
    if (!validateEmail(cleanEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await register(cleanName, cleanStudentId, cleanEmail, password);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Registration failed", error?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.authBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="person-add-outline" size={27} color={COLORS.white} />
          </View>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join your campus lost and found community.</Text>

          <View style={styles.card}>
            <AppTextInput label="Full name" placeholder="Juan Dela Cruz" value={fullName} onChangeText={setFullName} />
            <AppTextInput label="Student / Employee ID" placeholder="2024-00123" value={studentId} onChangeText={setStudentId} />
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
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <AppButton title="Create account" icon="checkmark-circle-outline" onPress={handleRegister} loading={loading} />

            <Text style={styles.footerText}>
              Already registered?{" "}
              <Link href="/auth/login" style={styles.link}>
                Log in
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
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    color: COLORS.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "600",
    fontFamily: FONT,
    marginTop: SPACING.xs,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: FONT,
    marginBottom: SPACING.xs,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
