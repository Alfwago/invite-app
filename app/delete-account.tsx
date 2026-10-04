import { useState } from "react";
import { Alert, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { API_BASE, ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { useAuth } from "@/src/auth/AuthContext";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { Button, Card } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

/**
 * Delete the signed-in account (App Store / Google Play requirement). The
 * server anonymizes it — see invite-server invitations/account_deletion.py —
 * then this signs out locally. Directors get a 403 with who to contact.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "Your login, profile and everything you've posted will be deleted. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ],
    );
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api.deleteAccount(password);
    } catch (e) {
      setBusy(false);
      Alert.alert("Couldn't delete your account", e instanceof ApiError ? e.detail : "Try again later.");
      return;
    }
    await signOut();
    Alert.alert("Account deleted", "Your account has been deleted. Thanks for skating with OBH.");
    router.replace("/login");
  }

  return (
    <KeyboardAwareScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.heading}>Delete your account</Text>
        <Text style={styles.body}>
          <Text style={styles.strong}>Deleted: </Text>
          your login, name, username, email, phone number, ratings, everything you've posted
          (messages, photos, direct messages, reactions) and your upcoming skates.
        </Text>
        <Text style={styles.body}>
          <Text style={styles.strong}>Kept, but no longer linked to you: </Text>
          past skates you attended, shown as "Former player" so rosters and totals stay correct.
        </Text>
        <Text
          style={styles.link}
          onPress={() => Linking.openURL(`${API_BASE}/privacy/#delete`).catch(() => {})}
        >
          Privacy Policy
        </Text>
      </Card>

      <Card>
        <Text style={styles.label}>Enter your password to confirm</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
        />
        <Button
          label="Delete my account"
          variant="danger"
          onPress={confirmDelete}
          loading={busy}
          disabled={!password}
        />
      </Card>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  heading: { color: colors.text, fontSize: font.md, fontWeight: "700" },
  body: { color: colors.textMuted, fontSize: font.sm, lineHeight: 19 },
  strong: { color: colors.text, fontWeight: "700" },
  link: { color: colors.gold, fontSize: font.sm, fontWeight: "600" },
  label: { color: colors.textMuted, fontSize: font.sm },
  input: {
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: font.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
