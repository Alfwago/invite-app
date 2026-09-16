import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE, ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import type { SignupDirector } from "@/src/api/types";
import { Button } from "@/src/components/ui";
import { Dropdown } from "@/src/components/Dropdown";
import { colors, font, radius, spacing } from "@/src/theme";

const WORDMARK = require("@/assets/brand/wordmark.png");

const SKILL_OPTIONS = [
  { value: "A", label: "A — Advanced" },
  { value: "B", label: "B — Intermediate" },
  { value: "C", label: "C — Recreational" },
  { value: "D", label: "D — Beginner" },
];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [directors, setDirectors] = useState<SignupDirector[] | null>(null);
  const [directorsError, setDirectorsError] = useState(false);

  const [directorId, setDirectorId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skill, setSkill] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .fetchSignupDirectors()
      .then(setDirectors)
      .catch(() => setDirectorsError(true));
  }, []);

  const directorOptions = (directors ?? []).map((d) => ({ value: String(d.id), label: d.name }));

  const canSubmit =
    !!directorId &&
    !!username &&
    !!password &&
    !!firstName &&
    !!lastName &&
    !!email &&
    !!phone &&
    !!skill;

  async function onSubmit() {
    if (!canSubmit || !directorId || !skill) return;
    setError(null);
    setBusy(true);
    try {
      await api.signup({
        username: username.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
        skill_assessment: skill as "A" | "B" | "C" | "D",
        director_id: Number(directorId),
      });
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail);
      } else {
        setError("Couldn't reach the server. Check your connection.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.flex, styles.doneWrap, { paddingTop: insets.top + spacing.xxl }]}>
        <Ionicons name="mail-outline" size={48} color={colors.gold} />
        <Text style={styles.doneTitle}>Almost there</Text>
        <Text style={styles.doneBody}>
          We emailed you a link to verify your address, and let your approving director know to
          review your account. You&apos;ll be able to sign in once both are done.
        </Text>
        <Button label="Back to sign in" onPress={() => router.replace("/login")} />
      </View>
    );
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
        <View style={styles.brand}>
          <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />
          <Text style={styles.tagline}>Create an account</Text>
        </View>

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
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
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

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              autoComplete="given-name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
              autoComplete="family-name"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Self skill assessment</Text>
          <Dropdown
            options={SKILL_OPTIONS}
            value={skill}
            onChange={setSkill}
            placeholder="Select a skill level"
          />

          <Text style={styles.label}>Approving director</Text>
          {directorsError ? (
            <Text style={styles.error}>
              Couldn&apos;t load the director list. Check your connection and try again.
            </Text>
          ) : (
            <Dropdown
              options={directorOptions}
              value={directorId}
              onChange={setDirectorId}
              placeholder={directors === null ? "Loading…" : "Select a director"}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Create account" onPress={onSubmit} loading={busy} disabled={!canSubmit} />

          <Pressable onPress={() => router.replace("/login")} hitSlop={8} style={styles.backRow}>
            <Text style={styles.backText}>Already have an account? Sign in</Text>
          </Pressable>
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
  wordmark: { width: 220, height: 72 },
  tagline: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  form: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
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
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: "600" },
  showRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  showText: { color: colors.textMuted, fontSize: font.sm },
  error: { color: colors.red, fontWeight: "600" },
  backRow: { alignSelf: "center", paddingVertical: spacing.xs },
  backText: { color: colors.gold, fontSize: font.sm, fontWeight: "700" },
  server: { color: colors.textMuted, fontSize: font.xs, textAlign: "center", marginTop: "auto" },
  doneWrap: { alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  doneTitle: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  doneBody: { color: colors.textMuted, fontSize: font.sm, textAlign: "center", lineHeight: 20 },
});
