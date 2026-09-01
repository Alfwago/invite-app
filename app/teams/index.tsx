import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { ApiError } from "@/src/api/client";
import type { TeamRosterPlayer } from "@/src/api/types";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate } from "@/src/format";
import {
  useSaveTeamHistory,
  useTeamEvents,
  useTeamRoster,
} from "@/src/hooks/queries";
import { autoBalance, ppv, type BalanceResult, type TGPlayer } from "@/src/teams/balance";
import { colors, font, radius, spacing } from "@/src/theme";

type Team = "Gold" | "Black";
const KEY = (id: TeamRosterPlayer["id"]) => String(id);

export default function TeamGeneratorScreen() {
  const router = useRouter();
  const events = useTeamEvents();
  const [eventId, setEventId] = useState<number | null>(null);
  const roster = useTeamRoster(eventId);
  const save = useSaveTeamHistory(eventId ?? 0);

  const [presentOnly, setPresentOnly] = useState(false);
  const [locks, setLocks] = useState<Record<string, Team>>({});
  const [goaliePrefs, setGoaliePrefs] = useState<Record<string, "Auto" | Team>>({});
  const [inactiveGoalies, setInactiveGoalies] = useState<Set<string>>(new Set());
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [splits, setSplits] = useState<[string, string][]>([]);
  const [assignment, setAssignment] = useState<Record<string, Team>>({});
  const [goldGoalie, setGoldGoalie] = useState<BalanceResult["goldGoalie"]>(null);
  const [blackGoalie, setBlackGoalie] = useState<BalanceResult["blackGoalie"]>(null);
  const [note, setNote] = useState("");
  const [picker, setPicker] = useState<null | { mode: "pair" | "split"; first: string | null }>(null);

  const players = roster.data ?? [];
  const goalies = useMemo(() => players.filter((p) => p.is_goalie), [players]);

  const tgPlayers = useCallback(
    (): TGPlayer[] =>
      players.map((r) => ({
        id: r.id,
        name: r.name,
        is_goalie: r.is_goalie,
        present: r.present,
        ratings: {
          hockey_sense: r.rating_hockey_sense,
          skating: r.rating_skating,
          defense: r.rating_defense,
          offense: r.rating_offense,
          goalie: r.rating_goalie,
        },
        locked: locks[KEY(r.id)] ?? null,
      })),
    [players, locks],
  );

  function balance() {
    const result = autoBalance({
      players: tgPlayers(),
      pairs,
      splits,
      goaliePrefs,
      inactiveGoalieIds: new Set([...inactiveGoalies]),
      presentOnly,
      shuffle: true,
    });
    const next: Record<string, Team> = {};
    result.gold.forEach((p) => (next[KEY(p.id)] = "Gold"));
    result.black.forEach((p) => (next[KEY(p.id)] = "Black"));
    setAssignment(next);
    setGoldGoalie(result.goldGoalie);
    setBlackGoalie(result.blackGoalie);
  }

  const pool = useMemo(
    () => (presentOnly ? players.filter((p) => p.present) : players).filter((p) => !isSkatingGoalie(p, assignment)),
    [players, presentOnly, assignment],
  );
  const gold = pool.filter((p) => assignment[KEY(p.id)] === "Gold");
  const black = pool.filter((p) => assignment[KEY(p.id)] === "Black");
  const balanced = assignment && Object.keys(assignment).length > 0;

  function isSkatingGoalie(p: TeamRosterPlayer, a: Record<string, Team>) {
    // A goalie who's the chosen keeper for a team isn't shown in the skater list.
    return (
      (goldGoalie?.playerId != null && KEY(goldGoalie.playerId) === KEY(p.id)) ||
      (blackGoalie?.playerId != null && KEY(blackGoalie.playerId) === KEY(p.id))
    );
  }

  function move(id: TeamRosterPlayer["id"]) {
    const k = KEY(id);
    setAssignment((a) => ({ ...a, [k]: a[k] === "Gold" ? "Black" : "Gold" }));
    setLocks((l) => (l[k] ? { ...l, [k]: assignment[k] === "Gold" ? "Black" : "Gold" } : l));
  }

  function toggleLock(id: TeamRosterPlayer["id"]) {
    const k = KEY(id);
    setLocks((l) => {
      const copy = { ...l };
      if (copy[k]) delete copy[k];
      else copy[k] = assignment[k] ?? "Gold";
      return copy;
    });
  }

  function swapTeams() {
    setAssignment((a) => {
      const flipped: Record<string, Team> = {};
      for (const k of Object.keys(a)) flipped[k] = a[k] === "Gold" ? "Black" : "Gold";
      return flipped;
    });
    setLocks((l) => {
      const flipped: Record<string, Team> = {};
      for (const k of Object.keys(l)) flipped[k] = l[k] === "Gold" ? "Black" : "Gold";
      return flipped;
    });
    setGoldGoalie(blackGoalie);
    setBlackGoalie(goldGoalie);
  }

  function pickForPairSplit(id: TeamRosterPlayer["id"]) {
    if (!picker) return;
    const k = KEY(id);
    if (!picker.first) {
      setPicker({ ...picker, first: k });
      return;
    }
    if (picker.first === k) {
      setPicker(null);
      return;
    }
    const edge: [string, string] = [picker.first, k];
    if (picker.mode === "pair") {
      setSplits((s) => s.filter((e) => !sameEdge(e, edge)));
      setPairs((p) => (p.some((e) => sameEdge(e, edge)) ? p : [...p, edge]));
    } else {
      setPairs((p) => p.filter((e) => !sameEdge(e, edge)));
      setSplits((s) => (s.some((e) => sameEdge(e, edge)) ? s : [...s, edge]));
    }
    setPicker(null);
  }

  const nameOf = (k: string) => players.find((p) => KEY(p.id) === k)?.name ?? "—";

  async function onSave() {
    if (!eventId) {
      Alert.alert("Pick an event", "Saving a split needs an event to attach it to.");
      return;
    }
    try {
      await save.mutateAsync({
        goldPlayers: gold.map((p) => ({ id: p.id, name: p.name, ppv: ratingOf(p), is_goalie: p.is_goalie })),
        blackPlayers: black.map((p) => ({ id: p.id, name: p.name, ppv: ratingOf(p), is_goalie: p.is_goalie })),
        goldGoalie: goldGoalie
          ? { id: goldGoalie.playerId, name: goldGoalie.name, weight: goldGoalie.weight }
          : {},
        blackGoalie: blackGoalie
          ? { id: blackGoalie.playerId, name: blackGoalie.name, weight: blackGoalie.weight }
          : {},
        note: note.trim() || undefined,
      });
      setNote("");
      Alert.alert("Saved", "This split is in the event's team history.");
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  async function onExportPdf() {
    const evt = events.data?.find((e) => e.id === eventId);
    const html = teamsHtml({
      title: evt ? `${evt.display_name} — ${formatEventDate(evt.date)}` : "OBH Teams",
      gold: gold.map((p) => `${p.name}`),
      black: black.map((p) => `${p.name}`),
      goldGoalie: goldGoalie?.name,
      blackGoalie: blackGoalie?.name,
    });
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
    } catch {
      Alert.alert("Couldn't make the PDF", "Try again.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Team generator" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {events.isLoading ? (
          <Loading label="Loading…" />
        ) : events.isError ? (
          <ErrorState
            message={events.error instanceof ApiError ? events.error.detail : "Couldn't load events."}
            onRetry={() => events.refetch()}
          />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(events.data ?? []).map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setEventId(e.id);
                    setAssignment({});
                    setLocks({});
                  }}
                  style={[styles.chip, eventId === e.id && styles.chipOn]}
                >
                  <Text style={[styles.chipText, eventId === e.id && styles.chipTextOn]} numberOfLines={1}>
                    {e.display_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {eventId == null ? (
              <Text style={styles.hint}>Pick an event to pull its Yes roster.</Text>
            ) : roster.isLoading ? (
              <Loading label="Loading roster…" />
            ) : (
              <>
                <Pressable style={styles.toggleRow} onPress={() => setPresentOnly((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={presentOnly ? "checkbox" : "square-outline"}
                    size={18}
                    color={presentOnly ? colors.gold : colors.textMuted}
                  />
                  <Text style={styles.toggleText}>Present only ({players.filter((p) => p.present).length})</Text>
                </Pressable>

                {goalies.length > 0 ? (
                  <Card>
                    <Text style={styles.cardLabel}>Goalies</Text>
                    {goalies.map((g) => {
                      const k = KEY(g.id);
                      const inactive = inactiveGoalies.has(k);
                      return (
                        <View key={k} style={styles.goalieRow}>
                          <Pressable
                            onPress={() =>
                              setInactiveGoalies((s) => {
                                const n = new Set(s);
                                n.has(k) ? n.delete(k) : n.add(k);
                                return n;
                              })
                            }
                            hitSlop={6}
                          >
                            <Ionicons
                              name={inactive ? "square-outline" : "checkbox"}
                              size={18}
                              color={inactive ? colors.textMuted : colors.gold}
                            />
                          </Pressable>
                          <Text style={[styles.goalieName, inactive && styles.dim]}>{g.name}</Text>
                          <View style={styles.seg}>
                            {(["Auto", "Gold", "Black"] as const).map((opt) => {
                              const on = (goaliePrefs[k] ?? "Auto") === opt;
                              return (
                                <Pressable
                                  key={opt}
                                  onPress={() => setGoaliePrefs((p) => ({ ...p, [k]: opt }))}
                                  style={[styles.segItem, on && styles.segItemOn]}
                                  disabled={inactive}
                                >
                                  <Text style={[styles.segText, on && styles.segTextOn]}>{opt[0]}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                ) : null}

                <View style={styles.actionRow}>
                  <Button label="Auto-balance" onPress={balance} />
                  {balanced ? (
                    <Button label="Swap teams" variant="secondary" onPress={swapTeams} />
                  ) : null}
                </View>

                {balanced ? (
                  <View style={styles.teams}>
                    <TeamColumn
                      name="Gold"
                      players={gold}
                      goalie={goldGoalie?.name}
                      locks={locks}
                      picker={picker}
                      onMove={move}
                      onLock={toggleLock}
                      onPick={pickForPairSplit}
                    />
                    <TeamColumn
                      name="Black"
                      players={black}
                      goalie={blackGoalie?.name}
                      locks={locks}
                      picker={picker}
                      onMove={move}
                      onLock={toggleLock}
                      onPick={pickForPairSplit}
                    />
                  </View>
                ) : null}

                <Card>
                  <Text style={styles.cardLabel}>Keep together / apart</Text>
                  <View style={styles.actionRow}>
                    <Button
                      label={picker?.mode === "pair" ? "Tap two players…" : "+ Keep together"}
                      variant="secondary"
                      onPress={() =>
                        setPicker(picker?.mode === "pair" ? null : { mode: "pair", first: null })
                      }
                    />
                    <Button
                      label={picker?.mode === "split" ? "Tap two players…" : "+ Keep apart"}
                      variant="secondary"
                      onPress={() =>
                        setPicker(picker?.mode === "split" ? null : { mode: "split", first: null })
                      }
                    />
                  </View>
                  {pairs.map((e, i) => (
                    <ConstraintChip
                      key={`p${i}`}
                      label={`${nameOf(e[0])} + ${nameOf(e[1])}`}
                      tone="pair"
                      onRemove={() => setPairs((p) => p.filter((x) => x !== e))}
                    />
                  ))}
                  {splits.map((e, i) => (
                    <ConstraintChip
                      key={`s${i}`}
                      label={`${nameOf(e[0])} ⁄ ${nameOf(e[1])}`}
                      tone="split"
                      onRemove={() => setSplits((s) => s.filter((x) => x !== e))}
                    />
                  ))}
                  {pairs.length + splits.length > 0 ? (
                    <Text style={styles.note}>Auto-balance again to apply.</Text>
                  ) : null}
                </Card>

                {balanced ? (
                  <Card>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Note (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={note}
                      onChangeText={setNote}
                    />
                    <View style={styles.actionRow}>
                      <Button label="Save split" onPress={onSave} loading={save.isPending} />
                      <Button label="Export PDF" variant="secondary" onPress={onExportPdf} />
                    </View>
                    <Pressable
                      style={styles.linkRow}
                      onPress={() => router.push(`/teams/history?event=${eventId}` as never)}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.gold} />
                      <Text style={styles.link}>Saved splits for this event</Text>
                    </Pressable>
                  </Card>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

function ratingOf(p: TeamRosterPlayer) {
  return p.is_goalie
    ? p.rating_goalie
    : ppv({
        hockey_sense: p.rating_hockey_sense,
        skating: p.rating_skating,
        defense: p.rating_defense,
        offense: p.rating_offense,
        goalie: p.rating_goalie,
      });
}

function TeamColumn({
  name,
  players,
  goalie,
  locks,
  picker,
  onMove,
  onLock,
  onPick,
}: {
  name: Team;
  players: TeamRosterPlayer[];
  goalie?: string;
  locks: Record<string, Team>;
  picker: null | { mode: "pair" | "split"; first: string | null };
  onMove: (id: TeamRosterPlayer["id"]) => void;
  onLock: (id: TeamRosterPlayer["id"]) => void;
  onPick: (id: TeamRosterPlayer["id"]) => void;
}) {
  const total = players.reduce((a, p) => a + ratingOf(p), 0);
  return (
    <View style={[styles.col, name === "Gold" ? styles.colGold : styles.colBlack]}>
      <Text style={styles.colHead}>
        {name} · {players.length}
      </Text>
      <Text style={styles.colTotal}>{total.toFixed(1)} PPV</Text>
      {goalie ? <Text style={styles.colGoalie}>🥅 {goalie}</Text> : null}
      {players.map((p) => {
        const k = String(p.id);
        const locked = !!locks[k];
        const selected = picker?.first === k;
        return (
          <Pressable
            key={k}
            style={[styles.playerRow, selected && styles.playerRowSel]}
            onPress={() => (picker ? onPick(p.id) : onMove(p.id))}
          >
            <Text style={styles.playerName} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.playerPpv}>{ratingOf(p).toFixed(1)}</Text>
            <Pressable onPress={() => onLock(p.id)} hitSlop={6}>
              <Ionicons
                name={locked ? "lock-closed" : "lock-open-outline"}
                size={15}
                color={locked ? colors.gold : colors.textMuted}
              />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

function ConstraintChip({
  label,
  tone,
  onRemove,
}: {
  label: string;
  tone: "pair" | "split";
  onRemove: () => void;
}) {
  return (
    <View style={[styles.constraint, tone === "split" && styles.constraintSplit]}>
      <Text style={styles.constraintText}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function sameEdge(a: [string, string], b: [string, string]) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

function teamsHtml(d: {
  title: string;
  gold: string[];
  black: string[];
  goldGoalie?: string;
  blackGoalie?: string;
}) {
  const li = (arr: string[]) => arr.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:32px;color:#111}
    h1{font-size:18px;margin:0 0 4px} h2{font-size:15px;margin:0 0 8px}
    .cols{display:flex;gap:32px;margin-top:16px}
    .col{flex:1;border:1px solid #ccc;border-radius:8px;padding:16px}
    .gold h2{color:#a8850f} ul{margin:8px 0 0 18px;line-height:1.6}
    .goalie{font-weight:700;margin-top:4px}
  </style></head><body>
    <h1>${escapeHtml(d.title)}</h1>
    <div class="cols">
      <div class="col gold"><h2>Gold (${d.gold.length})</h2>
        ${d.goldGoalie ? `<div class="goalie">🥅 ${escapeHtml(d.goldGoalie)}</div>` : ""}
        <ul>${li(d.gold)}</ul></div>
      <div class="col"><h2>Black (${d.black.length})</h2>
        ${d.blackGoalie ? `<div class="goalie">🥅 ${escapeHtml(d.blackGoalie)}</div>` : ""}
        <ul>${li(d.black)}</ul></div>
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  chipRow: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    maxWidth: 200,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },
  chipTextOn: { color: colors.goldText },
  hint: { color: colors.textMuted, fontSize: font.sm, padding: spacing.md },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggleText: { color: colors.text, fontSize: font.sm },
  cardLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  goalieRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  goalieName: { color: colors.text, fontSize: font.sm, flex: 1 },
  dim: { color: colors.textMuted },
  seg: { flexDirection: "row", borderRadius: radius.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  segItem: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.cardRaised },
  segItemOn: { backgroundColor: colors.gold },
  segText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "800" },
  segTextOn: { color: colors.goldText },
  actionRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  teams: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, gap: 3 },
  colGold: { borderColor: colors.gold },
  colBlack: { borderColor: colors.border },
  colHead: { color: colors.text, fontSize: font.sm, fontWeight: "800" },
  colTotal: { color: colors.textMuted, fontSize: font.xs, marginBottom: 2 },
  colGoalie: { color: colors.gold, fontSize: font.xs, fontWeight: "700", marginBottom: 2 },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  playerRowSel: { backgroundColor: colors.goldDim },
  playerName: { color: colors.text, fontSize: font.xs, flex: 1 },
  playerPpv: { color: colors.textMuted, fontSize: 10, fontVariant: ["tabular-nums"] },
  constraint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  constraintSplit: { borderColor: colors.red },
  constraintText: { color: colors.text, fontSize: font.xs, flex: 1 },
  note: { color: colors.textMuted, fontSize: font.xs, fontStyle: "italic" },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.sm,
    fontSize: 15,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingTop: spacing.xs },
  link: { color: colors.gold, fontSize: font.sm, fontWeight: "700" },
});
