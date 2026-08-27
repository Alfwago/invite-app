import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, ApiError } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(username, password);
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
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>OBH Skate Invites</Text>
        <Text style={styles.subtitle}>Sign in with your invite-site account.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
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
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={onSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Sign in"
            onPress={onSubmit}
            loading={busy}
            disabled={!username || !password}
          />
        </View>

        <Text style={styles.server}>{API_BASE}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.md, flexGrow: 1 },
  title: { color: colors.gold, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.lg },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.red, fontWeight: "600" },
  server: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: "auto" },
});
