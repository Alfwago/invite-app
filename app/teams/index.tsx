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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { API_BASE, ApiError } from "@/src/api/client";
import type { SaveTeamsBody, TeamEvent, TeamRosterPlayer } from "@/src/api/types";
import { Dropdown } from "@/src/components/Dropdown";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import {
  usePublishTeams,
  useSaveTeamHistory,
  useTeamEvents,
  useTeamRoster,
} from "@/src/hooks/queries";
import {
  autoBalance,
  normalizeGoalie,
  ppv,
  type BalanceResult,
  type TGPlayer,
} from "@/src/teams/balance";
import { colors, font, radius, spacing } from "@/src/theme";

type Team = "Gold" | "Black";
const K = (id: TeamRosterPlayer["id"]) => String(id);

function ratingOf(p: TeamRosterPlayer) {
  return p.is_goalie
    ? normalizeGoalie(p.rating_goalie)
    : ppv({
        hockey_sense: p.rating_hockey_sense,
        skating: p.rating_skating,
        defense: p.rating_defense,
        offense: p.rating_offense,
        goalie: p.rating_goalie,
      });
}

export default function TeamGeneratorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ event?: string }>();
  const events = useTeamEvents();
  const [eventId, setEventId] = useState<number | null>(
    params.event ? Number(params.event) : null,
  );
  const roster = useTeamRoster(eventId);
  const save = useSaveTeamHistory(eventId ?? 0);
  const publish = usePublishTeams(eventId ?? 0);

  const [presentOnly, setPresentOnly] = useState(false);
  const [locks, setLocks] = useState<Record<string, Team>>({});
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [splits, setSplits] = useState<[string, string][]>([]);
  const [assignment, setAssignment] = useState<Record<string, Team>>({});
  const [goldGoalie, setGoldGoalie] = useState<BalanceResult["goldGoalie"]>(null);
  const [blackGoalie, setBlackGoalie] = useState<BalanceResult["blackGoalie"]>(null);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState<null | { mode: "pair" | "split"; first: string | null }>(null);

  const players = roster.data ?? [];
  const balanced = Object.keys(assignment).length > 0;

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
        locked: locks[K(r.id)] ?? null,
      })),
    [players, locks],
  );

  const runBalance = useCallback(
    (present = presentOnly) => {
      const result = autoBalance({
        players: tgPlayers(),
        pairs,
        splits,
        presentOnly: present,
        shuffle: true,
      });
      const next: Record<string, Team> = {};
      result.gold.forEach((p) => (next[K(p.id)] = "Gold"));
      result.black.forEach((p) => (next[K(p.id)] = "Black"));
      setAssignment(next);
      setGoldGoalie(result.goldGoalie);
      setBlackGoalie(result.blackGoalie);
    },
    [tgPlayers, pairs, splits, presentOnly],
  );

  const keeperIds = useMemo(
    () =>
      new Set(
        [goldGoalie?.playerId, blackGoalie?.playerId]
          .filter((x) => x != null)
          .map((x) => K(x as TeamRosterPlayer["id"])),
      ),
    [goldGoalie, blackGoalie],
  );

  const pool = (presentOnly ? players.filter((p) => p.present) : players).filter(
    (p) => !keeperIds.has(K(p.id)),
  );
  const gold = pool.filter((p) => assignment[K(p.id)] === "Gold");
  const black = pool.filter((p) => assignment[K(p.id)] === "Black");

  const teamRating = (arr: TeamRosterPlayer[], goalie: BalanceResult["goldGoalie"]) =>
    arr.reduce((a, p) => a + ratingOf(p), 0) + Number(goalie?.weight || 0);

  function move(id: TeamRosterPlayer["id"]) {
    const k = K(id);
    const to: Team = assignment[k] === "Gold" ? "Black" : "Gold";
    setAssignment((a) => ({ ...a, [k]: to }));
    setLocks((l) => (l[k] ? { ...l, [k]: to } : l));
  }

  function toggleLock(id: TeamRosterPlayer["id"]) {
    const k = K(id);
    setLocks((l) => {
      const c = { ...l };
      if (c[k]) delete c[k];
      else c[k] = assignment[k] ?? "Gold";
      return c;
    });
  }

  function clearLocks() {
    setLocks({});
  }

  function swapTeams() {
    setAssignment((a) => {
      const f: Record<string, Team> = {};
      for (const k of Object.keys(a)) f[k] = a[k] === "Gold" ? "Black" : "Gold";
      return f;
    });
    setLocks((l) => {
      const f: Record<string, Team> = {};
      for (const k of Object.keys(l)) f[k] = l[k] === "Gold" ? "Black" : "Gold";
      return f;
    });
    swapGoalies();
  }

  function swapGoalies() {
    setGoldGoalie(blackGoalie);
    setBlackGoalie(goldGoalie);
  }

  const partnersFor = (k: string, list: [string, string][]) =>
    list.filter((e) => e[0] === k || e[1] === k).map((e) => (e[0] === k ? e[1] : e[0]));

  function onPickPlayer(id: TeamRosterPlayer["id"]) {
    if (!pick) return;
    const k = K(id);
    if (!pick.first) return setPick({ ...pick, first: k });
    if (pick.first === k) return setPick(null);
    const edge: [string, string] = [pick.first, k];
    const has = (l: [string, string][]) => l.some((e) => sameEdge(e, edge));
    if (pick.mode === "pair") {
      if (has(splits)) {
        Alert.alert(
          "Already split",
          "These two are set to keep apart — remove that split first.",
        );
        return setPick(null);
      }
      if (!has(pairs)) setPairs((p) => [...p, edge]);
    } else {
      if (has(pairs)) {
        Alert.alert(
          "Already paired",
          "These two are set to keep together — remove that pairing first.",
        );
        return setPick(null);
      }
      if (!has(splits)) setSplits((s) => [...s, edge]);
    }
    setPick(null);
  }

  const nameOf = (k: string) => players.find((p) => K(p.id) === k)?.name ?? "(removed)";

  const splitBody = (): SaveTeamsBody => ({
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

  async function onSave() {
    if (!eventId) return;
    try {
      await save.mutateAsync(splitBody());
      setNote("");
      Alert.alert("Saved to History.");
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  function onPush() {
    if (!eventId) return;
    const n = gold.length + black.length;
    Alert.alert(
      "Push to players",
      `Push these teams to ${n} player${n === 1 ? "" : "s"}? They'll get a notification and see it on their home screen.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Push",
          onPress: async () => {
            try {
              const res = await publish.mutateAsync(splitBody());
              Alert.alert(
                "Teams pushed",
                `Notified ${res.notified} of ${res.recipients} players.`,
              );
            } catch (e) {
              Alert.alert("Couldn't push", e instanceof ApiError ? e.detail : "Try again.");
            }
          },
        },
      ],
    );
  }

  async function onExportPdf() {
    const evt = events.data?.find((e) => e.id === eventId);
    const html = teamsPdfHtml({
      poolName: eventLabel(evt),
      poolDescription: evt?.date ? `Event Date: ${evt.date}` : "",
      nightImageUrl: nightArtUrl(evt),
      goldNames: gold.map((p) => p.name),
      blackNames: black.map((p) => p.name),
      goldGoalie: goldGoalie?.name,
      blackGoalie: blackGoalie?.name,
    });
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch {
      Alert.alert("PDF export failed", "Try again.");
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
            message={events.error instanceof ApiError ? events.error.detail : "Couldn't load."}
            onRetry={() => events.refetch()}
          />
        ) : (events.data ?? []).length === 0 ? (
          <Text style={styles.hint}>No active events.</Text>
        ) : (
          <>
            <View style={styles.pickerWrap}>
              <Dropdown
                style={styles.picker}
                placeholder="Choose an event…"
                value={eventId != null ? String(eventId) : null}
                options={(events.data ?? []).map((e) => ({
                  value: String(e.id),
                  label: e.display_name,
                }))}
                onChange={(v) => {
                  setEventId(Number(v));
                  setAssignment({});
                  setLocks({});
                  setPairs([]);
                  setSplits([]);
                }}
              />
              <Button
                label="History"
                variant="secondary"
                onPress={() =>
                  router.push(
                    (eventId != null
                      ? `/teams/history?event=${eventId}`
                      : "/teams/history") as never,
                  )
                }
                style={styles.historyBtn}
              />
            </View>

            {eventId == null ? (
              <Text style={styles.hint}>Pick an event to pull its Yes roster.</Text>
            ) : roster.isLoading ? (
              <Loading label="Loading roster…" />
            ) : roster.isError ? (
              <ErrorState
                message={roster.error instanceof ApiError ? roster.error.detail : "Couldn't load roster."}
                onRetry={() => roster.refetch()}
              />
            ) : (
              <>
                <Text style={styles.count}>
                  {players.length} on roster · {players.filter((p) => p.present).length} present
                </Text>

                <View style={styles.toolGrid}>
                  <BarBtn label="Auto-balance" gold grid onPress={() => runBalance()} />
                  <BarBtn
                    label={`Present only: ${presentOnly ? "On" : "Off"}`}
                    active={presentOnly}
                    grid
                    onPress={() => {
                      const next = !presentOnly;
                      setPresentOnly(next);
                      if (balanced) runBalance(next);
                    }}
                  />
                  <BarBtn label="Refresh" grid onPress={() => roster.refetch()} />
                  {balanced ? (
                    <>
                      <BarBtn label="Swap teams" grid onPress={swapTeams} />
                      <BarBtn label="Swap goalies" grid onPress={swapGoalies} />
                      <BarBtn label="Clear locks" grid onPress={clearLocks} />
                    </>
                  ) : null}
                </View>

                <Card style={styles.psCard}>
                  <Text style={styles.psTitle}>Pair &amp; Split</Text>
                  <Text style={styles.psHint}>
                    Tap Pair or Split, then tap the two players. Auto-balance again to apply.
                  </Text>
                  <View style={styles.bar}>
                    <BarBtn
                      label="🔗 Pair"
                      active={pick?.mode === "pair"}
                      onPress={() => setPick(pick?.mode === "pair" ? null : { mode: "pair", first: null })}
                    />
                    <BarBtn
                      label="✂️ Split"
                      active={pick?.mode === "split"}
                      onPress={() => setPick(pick?.mode === "split" ? null : { mode: "split", first: null })}
                    />
                    {pairs.length + splits.length > 0 ? (
                      <BarBtn
                        label="Clear pairs/splits"
                        onPress={() => {
                          setPairs([]);
                          setSplits([]);
                        }}
                      />
                    ) : null}
                  </View>
                  {pick ? (
                    <Text style={styles.psPrompt}>
                      {pick.first ? `${nameOf(pick.first)} + tap another…` : "Tap the first player…"}
                    </Text>
                  ) : null}
                  {pairs.map((e, i) => (
                    <Chip key={`p${i}`} text={`🔗 ${nameOf(e[0])} ↔ ${nameOf(e[1])}`} onX={() => setPairs((p) => p.filter((x) => x !== e))} />
                  ))}
                  {splits.map((e, i) => (
                    <Chip key={`s${i}`} text={`✂️ ${nameOf(e[0])} ↔ ${nameOf(e[1])}`} tone="split" onX={() => setSplits((s) => s.filter((x) => x !== e))} />
                  ))}
                </Card>

                {balanced ? (
                  <View style={styles.teams}>
                    <TeamCol
                      name="Gold"
                      players={gold}
                      goalie={goldGoalie}
                      total={teamRating(gold, goldGoalie)}
                      locks={locks}
                      pick={pick}
                      pairPartners={(k) => partnersFor(k, pairs)}
                      splitPartners={(k) => partnersFor(k, splits)}
                      onMove={move}
                      onLock={toggleLock}
                      onPick={onPickPlayer}
                    />
                    <TeamCol
                      name="Black"
                      players={black}
                      goalie={blackGoalie}
                      total={teamRating(black, blackGoalie)}
                      locks={locks}
                      pick={pick}
                      pairPartners={(k) => partnersFor(k, pairs)}
                      splitPartners={(k) => partnersFor(k, splits)}
                      onMove={move}
                      onLock={toggleLock}
                      onPick={onPickPlayer}
                    />
                  </View>
                ) : null}

                {balanced ? (
                  <Card>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Note (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={note}
                      onChangeText={setNote}
                    />
                    <View style={styles.saveActions}>
                      <Button
                        label="Push to players"
                        onPress={onPush}
                        loading={publish.isPending}
                        style={styles.wideBtn}
                      />
                      <Button
                        label="Save to history"
                        variant="secondary"
                        onPress={onSave}
                        loading={save.isPending}
                        style={styles.wideBtn}
                      />
                      <Button
                        label="Export PDF"
                        variant="secondary"
                        onPress={onExportPdf}
                        style={styles.wideBtn}
                      />
                    </View>
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

function BarBtn({
  label,
  onPress,
  active,
  gold,
  grid,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  gold?: boolean;
  grid?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.barBtn,
        grid && styles.barBtnGrid,
        gold && styles.barBtnGold,
        active && styles.barBtnActive,
      ]}
    >
      <Text style={[styles.barBtnText, (gold || active) && styles.barBtnTextOn]}>{label}</Text>
    </Pressable>
  );
}

function TeamCol({
  name,
  players,
  goalie,
  total,
  locks,
  pick,
  pairPartners,
  splitPartners,
  onMove,
  onLock,
  onPick,
}: {
  name: Team;
  players: TeamRosterPlayer[];
  goalie: BalanceResult["goldGoalie"];
  total: number;
  locks: Record<string, Team>;
  pick: null | { mode: "pair" | "split"; first: string | null };
  pairPartners: (k: string) => string[];
  splitPartners: (k: string) => string[];
  onMove: (id: TeamRosterPlayer["id"]) => void;
  onLock: (id: TeamRosterPlayer["id"]) => void;
  onPick: (id: TeamRosterPlayer["id"]) => void;
}) {
  const goalieSkaters = players.filter((p) => p.is_goalie);
  const others = players.filter((p) => !p.is_goalie);
  const ordered = [...goalieSkaters, ...others];
  return (
    <View style={[styles.col, name === "Gold" ? styles.colGold : styles.colBlack]}>
      <Text style={[styles.colHead, name === "Gold" && { color: colors.gold }]}>{name} Team</Text>
      <Text style={styles.colTotal}>Team Rating: {total.toFixed(2)}</Text>

      {goalie ? (
        <View style={styles.pRow}>
          <Text style={styles.pName} numberOfLines={1}>
            {goalie.name} <Text style={styles.gBadge}>G</Text>
          </Text>
          <Text style={styles.pRate}>{Number(goalie.weight || 0).toFixed(2)}</Text>
        </View>
      ) : null}

      {ordered.map((p) => {
        const k = String(p.id);
        const locked = !!locks[k];
        const selected = pick?.first === k;
        const paired = pairPartners(k).length > 0;
        const split = splitPartners(k).length > 0;
        return (
          <View key={k} style={[styles.pRow, selected && styles.pRowSel]}>
            <Pressable
              style={styles.pTapArea}
              onPress={() => (pick ? onPick(p.id) : onMove(p.id))}
            >
              <Text style={styles.pName} numberOfLines={1}>
                {p.name}
                {p.is_goalie ? <Text style={styles.gBadge}> G</Text> : null}
                {paired ? " 🔗" : ""}
                {split ? " ✂️" : ""}
              </Text>
            </Pressable>
            <Text style={styles.pRate}>{ratingOf(p).toFixed(2)}</Text>
            <Pressable onPress={() => onLock(p.id)} hitSlop={6}>
              <Ionicons
                name={locked ? "lock-closed" : "lock-open-outline"}
                size={15}
                color={locked ? colors.gold : colors.textMuted}
              />
            </Pressable>
            <Pressable onPress={() => onMove(p.id)} hitSlop={6}>
              <Ionicons name="swap-horizontal" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function Chip({
  text,
  tone,
  onX,
}: {
  text: string;
  tone?: "split";
  onX: () => void;
}) {
  return (
    <View style={[styles.constraint, tone === "split" && styles.constraintSplit]}>
      <Text style={styles.constraintText}>{text}</Text>
      <Pressable onPress={onX} hitSlop={8}>
        <Ionicons name="close" size={15} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function sameEdge(a: [string, string], b: [string, string]) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

function eventLabel(evt?: TeamEvent) {
  if (!evt) return "OBH Teams";
  let when = "";
  try {
    const d = new Date(`${evt.date}T00:00:00`).toLocaleDateString();
    const t = evt.start_time
      ? new Date(`1970-01-01T${evt.start_time}`).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    when = [d, t].filter(Boolean).join(" ");
  } catch {
    when = evt.date;
  }
  return `${evt.display_name}${when ? ` — ${when}` : ""}`;
}

function nightArtUrl(evt?: TeamEvent): string {
  if (!evt?.display_name) return "";
  const first = evt.display_name.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_-]/g, "");
  return first ? `${API_BASE}/static/invitations/${first}.png` : "";
}

/** Matches the website's jsPDF export: centered night art, event title +
 *  date, then a bordered two-column Gold | Black table (goalie first, "(G)"). */
function teamsPdfHtml(d: {
  poolName: string;
  poolDescription: string;
  nightImageUrl: string;
  goldNames: string[];
  blackNames: string[];
  goldGoalie?: string;
  blackGoalie?: string;
}) {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const goldList = [...(d.goldGoalie ? [`(G) ${d.goldGoalie}`] : []), ...d.goldNames];
  const blackList = [...(d.blackGoalie ? [`(G) ${d.blackGoalie}`] : []), ...d.blackNames];
  const rows = Math.max(goldList.length, blackList.length, 1);
  let body = "";
  for (let i = 0; i < rows; i++) {
    body += `<tr><td>${esc(goldList[i] || "")}</td><td>${esc(blackList[i] || "")}</td></tr>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 32pt; }
    body { font-family: Helvetica, Arial, sans-serif; color: #000; }
    .hdr { text-align: center; }
    .hdr img { max-height: 216pt; max-width: 100%; }
    h1 { font-size: 18pt; margin: 12pt 0 0; }
    .desc { font-size: 12pt; margin: 6pt 0 12pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 12pt; }
    th, td { border: 1pt solid #000; text-align: center; padding: 5pt; font-size: 13pt; }
    th { font-size: 14pt; }
    th.gold { color: #ffd54a; }
  </style></head><body>
    ${d.nightImageUrl ? `<div class="hdr"><img src="${esc(d.nightImageUrl)}"></div>` : ""}
    <h1>${esc(d.poolName)}</h1>
    ${d.poolDescription ? `<div class="desc">${esc(d.poolDescription)}</div>` : ""}
    <table>
      <thead><tr><th class="gold">Gold</th><th>Black</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  pickerWrap: { alignSelf: "center", width: "100%", maxWidth: 420, gap: spacing.sm },
  picker: { alignSelf: "stretch" },
  historyBtn: { alignSelf: "center", minWidth: 140 },
  hint: { color: colors.textMuted, fontSize: font.sm, padding: spacing.md, textAlign: "center" },
  count: { color: colors.textMuted, fontSize: font.xs, textAlign: "center" },
  bar: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  saveActions: { gap: spacing.sm, marginTop: spacing.xs },
  wideBtn: { alignSelf: "stretch", minHeight: 52, paddingVertical: spacing.md + 2 },
  toolGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  barBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  barBtnGrid: { flexGrow: 1, flexBasis: "47%", minHeight: 44 },
  barBtnGold: { backgroundColor: colors.gold, borderColor: colors.gold },
  barBtnActive: { backgroundColor: colors.goldDim, borderColor: colors.gold },
  barBtnText: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  barBtnTextOn: { color: colors.goldText },
  psCard: { gap: spacing.sm },
  psTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  psHint: { color: colors.textMuted, fontSize: font.xs },
  psPrompt: { color: colors.gold, fontSize: font.xs, fontWeight: "700" },
  teams: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, gap: 2 },
  colGold: { borderColor: colors.gold },
  colBlack: { borderColor: colors.border },
  colHead: { color: colors.text, fontSize: font.sm, fontWeight: "800" },
  colTotal: { color: colors.textMuted, fontSize: font.xs, marginBottom: 2 },
  pRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pRowSel: { backgroundColor: colors.goldDim },
  pTapArea: { flex: 1 },
  pName: { color: colors.text, fontSize: font.xs },
  gBadge: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: "800",
  },
  pRate: { color: colors.textMuted, fontSize: 10, fontVariant: ["tabular-nums"] },
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
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.sm,
    fontSize: 15,
  },
});
