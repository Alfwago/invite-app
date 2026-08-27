import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { colors, spacing } from "@/src/theme";

/** Always-visible logout, used in the Profile tab header. */
export function LogoutButton() {
  const { signOut } = useAuth();

  function confirm() {
    Alert.alert("Log out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <Pressable onPress={confirm} hitSlop={10} style={styles.btn}>
      <Text style={styles.text}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { color: colors.gold, fontWeight: "700", fontSize: 15 },
});
