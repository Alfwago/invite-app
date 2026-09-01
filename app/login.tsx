import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE, ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

const WORDMARK = require("@/assets/brand/wordmark.png");

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  async function sendReset() {
    if (!resetEmail.trim()) return;
    setResetBusy(true);
    try {
      await api.requestPasswordResetAnon(resetEmail.trim());
      setResetDone(true);
    } catch {
      setResetDone(true); // endpoint never reveals failure; treat the same
    } finally {
      setResetBusy(false);
    }
  }

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(username, password, remember);
      // RootNavigator redirects on token change.
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        setError("That username and password didn't match.");
      } else if (e instanceof ApiError) {
        setError(e.detail);
      } else {
        setError("Couldn't reach the server. Check your connection.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />
          <Text style={styles.tagline}>Four Decades · One Brotherhood</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username or email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={onSubmit}
          />
          <Pressable
            style={styles.showRow}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? "checkbox" : "square-outline"}
              size={20}
              color={showPassword ? colors.gold : colors.textMuted}
            />
            <Text style={styles.showText}>Show password</Text>
          </Pressable>

          <Pressable
            style={styles.showRow}
            onPress={() => setRemember((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={remember ? "checkbox" : "square-outline"}
              size={20}
              color={remember ? colors.gold : colors.textMuted}
            />
            <Text style={styles.showText}>Keep me signed in</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Sign in"
            onPress={onSubmit}
            loading={busy}
            disabled={!username || !password}
          />

          <Pressable
            onPress={() => {
              setResetOpen((v) => !v);
              setResetDone(false);
            }}
            hitSlop={8}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>
              {resetOpen ? "Never mind" : "Forgot password?"}
            </Text>
          </Pressable>

          {resetOpen ? (
            <View style={styles.resetPanel}>
              {resetDone ? (
                <Text style={styles.resetDone}>
                  If that address has an account, a reset link is on its way. Check your email.
                </Text>
              ) : (
                <>
                  <Text style={styles.resetHint}>
                    Enter your email and we&apos;ll send a reset link.
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    onSubmitEditing={sendReset}
                  />
                  <Button
                    label="Send reset link"
                    variant="secondary"
                    onPress={sendReset}
                    loading={resetBusy}
                    disabled={!resetEmail.trim()}
                  />
                </>
              )}
            </View>
          ) : null}
        </View>

        <Text style={styles.server}>{API_BASE}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.xl, flexGrow: 1 },
  brand: { alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  wordmark: { width: 260, height: 84 },
  tagline: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  showRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  showText: { color: colors.textMuted, fontSize: font.sm },
  error: { color: colors.red, fontWeight: "600" },
  forgotRow: { alignSelf: "center", paddingVertical: spacing.xs },
  forgotText: { color: colors.gold, fontSize: font.sm, fontWeight: "700" },
  resetPanel: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  resetHint: { color: colors.textMuted, fontSize: font.sm },
  resetDone: { color: colors.green, fontSize: font.sm, lineHeight: 20 },
  server: { color: colors.textMuted, fontSize: font.xs, textAlign: "center", marginTop: "auto" },
});
