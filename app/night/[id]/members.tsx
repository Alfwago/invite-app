import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { ApiError } from "@/src/api/client";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { useNightMemberMutations, useNightMembers } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function NightMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nightId = Number(id);
  const query = useNightMembers(nightId);
  const mut = useNightMemberMutations(nightId);

  const [showAdd, setShowAdd] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  const data = query.data;

  function removeMember(playerId: number, name: string) {
    Alert.alert("Remove from skate group?", `${name} will drop off this group's invite list.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          mut.remove.mutate(playerId, {
            onError: (e) => Alert.alert("Couldn't remove", errText(e)),
          }),
      },
    ]);
  }

  function addPicked() {
    if (picked.length === 0) return;
    mut.add.mutate(picked, {
      onSuccess: () => {
        setPicked([]);
        setShowAdd(false);
      },
      onError: (e) => Alert.alert("Couldn't add", errText(e)),
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: data ? data.night.name : "Members" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading members…" />
        ) : query.isError || !data ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load members."}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <Card>
              <Text style={styles.heading}>Members ({data.members.length})</Text>
              {data.members.length === 0 ? (
                <Text style={styles.muted}>Nobody in this skate group yet.</Text>
              ) : (
                data.members.map((m) => (
                  <View key={m.id} style={styles.row}>
                    <Text style={styles.name} numberOfLines={1}>
                      {m.name}
                    </Text>
                    {m.is_goalie ? <Badge text="G" tone="goalie" /> : null}
                    <Pressable onPress={() => removeMember(m.id, m.name)} hitSlop={8}>
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </Card>

            <Button
              label={showAdd ? "Close player list" : "Add players"}
              variant="secondary"
              onPress={() => setShowAdd((s) => !s)}
            />

            {showAdd ? (
              <Card>
                {data.addable.length === 0 ? (
                  <Text style={styles.muted}>Every active player is already on this group.</Text>
                ) : (
                  <>
                    {data.addable.map((a) => {
                      const on = picked.includes(a.id);
                      return (
                        <Pressable
                          key={a.id}
                          style={styles.checkRow}
                          onPress={() =>
                            setPicked((s) =>
                              s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id],
                            )
                          }
                        >
                          <View style={[styles.checkbox, on && styles.checkboxOn]}>
                            {on ? <Text style={styles.checkmark}>✓</Text> : null}
                          </View>
                          <Text style={styles.name} numberOfLines={1}>
                            {a.name}
                            {a.is_goalie ? " (G)" : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <Button
                      label={`Add ${picked.length || ""}`.trim()}
                      onPress={addPicked}
                      loading={mut.add.isPending}
                      disabled={picked.length === 0}
                    />
                  </>
                )}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

function errText(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Something went wrong.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  heading: { color: colors.gold, fontSize: font.md, fontWeight: "800" },
  muted: { color: colors.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { color: colors.text, fontSize: font.sm, flex: 1 },
  remove: { color: colors.red, fontSize: font.xs, fontWeight: "700" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  checkmark: { color: colors.gold, fontWeight: "800", fontSize: 13 },
});
