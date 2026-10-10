import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE, ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import type {
  TeamEvent,
  TeamLineup,
  TeamLineupAction,
  TeamLineupGoalie,
  TeamLineupPlayer,
} from "@/src/api/types";
import { Dropdown } from "@/src/components/Dropdown";
import { useToast } from "@/src/components/Toast";
import { Button, Card, ErrorState, Loading, Tap } from "@/src/components/ui";
import { tapHaptic } from "@/src/haptics";
import { useBusy } from "@/src/hooks/useBusy";
import {
  keys,
  useResetJerseys,
  useTeamEvents,
  useTeamLineup,
  useTeamLineupVersion,
} from "@/src/hooks/queries";
import {
  CONFLICT_TEXT,
  OFFLINE_TEXT,
  conflictLineup,
  hasEdge,
  lineupMoves,
  nameOf,
  optimisticMove,
  partnersOf,
  syncNote,
  teamRows,
  type Team,
} from "@/src/teams/lineup";
import { balanceMessage } from "@/src/teams/moves";
import { colors, font, radius, spacing } from "@/src/theme";

// The Team Generator shows the event's ONE lineup, which lives on the server
// (0.34+) and is the same one the website shows: every edit is sent there
// with the version this screen last saw, and while the screen is focused
// and the app is in the foreground it polls the version every 5 s, so a
// change made on the website (or another phone, or a new RSVP) shows up
// here with an "Updated by …" toast. A stale edit comes back 409 with the
// current teams ("Teams changed on another device — reloaded."). Nothing is
// balanced on the phone: if the server can't be reached, the screen says so.

type Opts = {
  /** Toast after success; gets the lineup before and after. */
  message?: string | ((before: TeamLineup, after: TeamLineup) => string);
  /** Show this lineup right away (a hand move), roll back on failure. */
  optimistic?: TeamLineup;
  /** Rows to flash instead of the computed moves. */
  flashIds?: string[];
};

export default function TeamGeneratorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ event?: string }>();
  const qc = useQueryClient();
  const events = useTeamEvents();
  const [eventId, setEventId] = useState<number | null>(
    params.event ? Number(params.event) : null,
  );
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const lineupQ = useTeamLineup(eventId);
  const lineup = lineupQ.data ?? null;
  const versionQ = useTeamLineupVersion(eventId, focused && !!lineup);
  const resetJerseysMutation = useResetJerseys(eventId ?? 0);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState<null | { mode: "pair" | "split"; first: string | null }>(null);
  const toast = useToast();
  const busy = useBusy();
  // Edits in flight: a poll result is ignored meanwhile (the edit's own
  // response is newer).
  const pending = useRef(0);

  // Rows that just changed team get a brief gold highlight (~1 s).
  const [flash, setFlash] = useState<Set<string>>(() => new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRows = useCallback((ids: string[]) => {
    if (!ids.length) return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(new Set(ids));
    flashTimer.current = setTimeout(() => setFlash(new Set()), 1000);
  }, []);
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const setLineup = useCallback(
    (next: TeamLineup) => {
      if (eventId != null) qc.setQueryData(keys.teamLineup(eventId), next);
    },
    [qc, eventId],
  );

  // Someone else changed the teams (the website, another phone, a new RSVP):
  // reload and say who.
  const polledVersion = versionQ.data?.version;
  useEffect(() => {
    if (polledVersion == null || !lineup || polledVersion === lineup.version || pending.current) return;
    const before = lineup;
    lineupQ.refetch().then((r) => {
      if (!r.data || r.data.version === before.version || pending.current) return;
      flashRows(lineupMoves(before, r.data));
      toast.show(syncNote(r.data), "info");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polledVersion]);

  async function act(action: TeamLineupAction, opts: Opts = {}) {
    if (eventId == null || !lineup) return;
    const before = lineup;
    if (opts.optimistic) setLineup(opts.optimistic);
    pending.current += 1;
    try {
      const next = await api.postTeamLineupAction(eventId, before.version, action);
      setLineup(next);
      flashRows(opts.flashIds ?? lineupMoves(before, next));
      if (opts.message) {
        toast.show(typeof opts.message === "function" ? opts.message(before, next) : opts.message);
      }
    } catch (e) {
      const current = conflictLineup(e);
      if (current) {
        setLineup(current);
        toast.show(CONFLICT_TEXT, "info");
      } else {
        setLineup(before);
        if (e instanceof ApiError && e.status === 400) Alert.alert("Not changed", e.detail);
        else Alert.alert("Teams not changed", `${OFFLINE_TEXT} Check your connection and try again.`);
      }
    } finally {
      pending.current -= 1;
    }
  }

  const run = (key: string, action: TeamLineupAction, opts?: Opts) => busy.run(key, () => act(action, opts));
  const balanced = (before: TeamLineup, after: TeamLineup) =>
    balanceMessage(true, lineupMoves(before, after).length);

  function onMove(id: string) {
    if (!lineup) return;
    const optimistic = optimisticMove(lineup, id);
    flashRows([id]);
    void act({ action: "move", player: id }, { optimistic, flashIds: [id] });
  }

  function onToggleLock(p: TeamLineupPlayer) {
    void act(
      { action: "set_lock", player: p.id, locked: !p.locked },
      { message: p.locked ? `Unlocked ${p.name}` : `Locked ${p.name} to ${p.team}` },
    );
  }

  function onPickPlayer(id: string) {
    if (!pick || !lineup) return;
    if (!pick.first) return setPick({ ...pick, first: id });
    if (pick.first === id) return setPick(null);
    const [a, b] = [pick.first, id];
    setPick(null);
    const label = `${nameOf(lineup, a)} ${pick.mode === "pair" ? "+" : "/"} ${nameOf(lineup, b)}`;
    if (pick.mode === "pair") {
      if (hasEdge(lineup.splits, a, b)) {
        return Alert.alert("Already split", "These two are set to keep apart — remove that split first.");
      }
      if (hasEdge(lineup.pairs, a, b)) return toast.show("Already paired", "info");
      void run("pair", { action: "pair_add", a, b }, { message: (x, y) => `Paired ${label} · ${balanced(x, y)}` });
    } else {
      if (hasEdge(lineup.pairs, a, b)) {
        return Alert.alert("Already paired", "These two are set to keep together — remove that pairing first.");
      }
      if (hasEdge(lineup.splits, a, b)) return toast.show("Already split", "info");
      void run("pair", { action: "split_add", a, b }, { message: (x, y) => `Split ${label} · ${balanced(x, y)}` });
    }
  }

  function onUnlock() {
    Alert.alert(
      "Unlock teams?",
      "Auto-balance and pair/split changes will be able to move players again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: () => void run("lock", { action: "unlock_teams" }, { message: "Teams unlocked" }),
        },
      ],
    );
  }

  async function onSave() {
    if (eventId == null || !lineup) return;
    await busy.run("save", async () => {
      try {
        await api.saveTeamLineup(eventId, lineup.version, note.trim());
        qc.invalidateQueries({ queryKey: keys.teamHistory(eventId) });
        setNote("");
        toast.show("Saved to history");
      } catch (e) {
        const current = conflictLineup(e);
        if (current) {
          setLineup(current);
          Alert.alert(CONFLICT_TEXT, "Nothing was saved — check the teams and save again.");
        } else {
          Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : `${OFFLINE_TEXT} Try again.`);
        }
      }
    });
  }

  function onPush() {
    if (eventId == null || !lineup) return;
    const n = lineup.gold.length + lineup.black.length;
    Alert.alert(
      "Push to players",
      `Push these teams to ${n} player${n === 1 ? "" : "s"}? They'll get a notification and see it on their home screen.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Push",
          onPress: () =>
            busy.run("push", async () => {
              try {
                const res = await api.publishTeamLineup(eventId, lineup.version, note.trim());
                setLineup(res.lineup);
                qc.invalidateQueries({ queryKey: keys.teamHistory(eventId) });
                qc.invalidateQueries({ queryKey: keys.event(eventId) }); // team_assignment
                qc.invalidateQueries({ queryKey: keys.home });
                Alert.alert("Teams pushed", `Notified ${res.notified} of ${res.recipients} players.`);
              } catch (e) {
                const current = conflictLineup(e);
                if (current) {
                  setLineup(current);
                  Alert.alert(CONFLICT_TEXT, "Nothing was pushed — check the teams and push again.");
                } else {
                  Alert.alert("Couldn't push", e instanceof ApiError ? e.detail : `${OFFLINE_TEXT} Try again.`);
                }
              }
            }),
        },
      ],
    );
  }

  function onResetJerseys() {
    if (eventId == null) return;
    Alert.alert(
      "Reset jerseys?",
      "Players who already saw their Gold/Black assignment will stop seeing it — the card just " +
        "disappears next time they open the app or refresh. No notification is sent. This doesn't " +
        "touch your teams or pairs/splits in the generator; you can push again anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await resetJerseysMutation.mutateAsync();
              Alert.alert(
                res.cleared ? "Jerseys reset" : "Nothing to reset",
                res.cleared
                  ? "Players no longer see a team assignment for this event."
                  : "Nothing was published for this event.",
              );
            } catch (e) {
              Alert.alert("Couldn't reset jerseys", e instanceof ApiError ? e.detail : "Try again.");
            }
          },
        },
      ],
    );
  }

  async function onExportPdf() {
    if (!lineup) return;
    const evt = events.data?.find((e) => e.id === eventId);
    const html = teamsPdfHtml({
      poolName: eventLabel(evt),
      poolDescription: evt?.date ? `Event Date: ${evt.date}` : "",
      nightImageUrl: nightArtUrl(evt),
      goldNames: teamRows(lineup, "Gold").map((p) => p.name),
      blackNames: teamRows(lineup, "Black").map((p) => p.name),
      goldGoalie: lineup.gold_goalie?.name,
      blackGoalie: lineup.black_goalie?.name,
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

  const lockedCount = lineup ? lineup.players.filter((p) => p.locked).length : 0;
  const loadError =
    lineupQ.error instanceof ApiError && lineupQ.error.status === 404
      ? "This server doesn't have shared teams yet — it needs the 0.34 update. Teams aren't balanced on the phone."
      : lineupQ.error instanceof ApiError && lineupQ.error.status === 403
        ? lineupQ.error.detail
        : "Couldn't load the teams from the server. Check your connection and try again.";

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
          <Text style={styles.hint}>No active events you can balance.</Text>
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
                  setPick(null);
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
              <Text style={styles.hint}>Pick an event to see its teams.</Text>
            ) : lineupQ.isLoading ? (
              <Loading label="Loading teams…" />
            ) : !lineup ? (
              <ErrorState message={loadError} onRetry={() => lineupQ.refetch()} />
            ) : (
              <>
                <Text style={styles.count}>
                  {lineup.roster_count} on roster · {lineup.present_count} present
                </Text>
                {lineup.locked ? (
                  <Text style={styles.lockStatus}>
                    🔒 Teams locked{lineup.locked_by ? ` by ${lineup.locked_by}` : ""}
                  </Text>
                ) : null}
                <Text style={styles.syncNote}>
                  Shared with the website — changes show on both.
                </Text>

                {/* Fixed layout: Auto-balance on its own full-width row, then
                    Present only + Refresh, then Lock / Swap… / Clear locks —
                    nothing moves under the finger between taps. */}
                <View style={styles.toolGrid}>
                  <BarBtn
                    label="Auto-balance"
                    gold
                    grid
                    wide
                    busy={busy.isBusy("balance")}
                    onPress={() => void run("balance", { action: "balance" }, { message: balanced })}
                  />
                  <BarBtn
                    label={`Present only: ${lineup.present_only ? "On" : "Off"}`}
                    active={lineup.present_only}
                    grid
                    busy={busy.isBusy("present")}
                    onPress={() =>
                      void run(
                        "present",
                        { action: "present_only", on: !lineup.present_only },
                        { message: (x, y) => `Present only ${y.present_only ? "on" : "off"} · ${balanced(x, y)}` },
                      )
                    }
                  />
                  <BarBtn
                    label="Refresh"
                    grid
                    busy={busy.isBusy("refresh")}
                    onPress={() =>
                      void run(
                        "refresh",
                        { action: "refresh" },
                        {
                          message: (x, y) =>
                            y.locked
                              ? "Refreshed: teams are locked — roster changes added"
                              : `Refreshed · ${balanced(x, y)}`,
                        },
                      )
                    }
                  />
                  <BarBtn
                    label={lineup.locked ? "🔓 Unlock Teams" : "🔒 Lock Teams"}
                    active={lineup.locked}
                    grid
                    busy={busy.isBusy("lock")}
                    onPress={
                      lineup.locked
                        ? onUnlock
                        : () => void run("lock", { action: "lock_teams" }, { message: "Teams locked" })
                    }
                  />
                  <BarBtn
                    label="Swap teams"
                    grid
                    onPress={() => void act({ action: "swap_teams" }, { message: "Teams swapped" })}
                  />
                  <BarBtn
                    label="Swap goalies"
                    grid
                    onPress={() =>
                      !lineup.gold_goalie && !lineup.black_goalie
                        ? toast.show("No goalies to swap", "info")
                        : void act({ action: "swap_goalies" }, { message: "Goalies swapped" })
                    }
                  />
                  <BarBtn
                    label="Clear locks"
                    grid
                    onPress={() =>
                      void act(
                        { action: "clear_locks" },
                        {
                          message: lockedCount
                            ? `Cleared ${lockedCount} lock${lockedCount === 1 ? "" : "s"}`
                            : "No locks to clear",
                        },
                      )
                    }
                  />
                </View>

                <Card style={styles.psCard}>
                  <Text style={styles.psTitle}>Pair &amp; Split</Text>
                  <Text style={styles.psHint}>
                    Tap Pair or Split, then tap the two players. The teams re-balance right away.
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
                    {lineup.pairs.length + lineup.splits.length > 0 ? (
                      <BarBtn
                        label="Clear pairs/splits"
                        busy={busy.isBusy("pair")}
                        onPress={() =>
                          void run(
                            "pair",
                            { action: "clear_pairs_splits" },
                            { message: (x, y) => `Pairs and splits cleared · ${balanced(x, y)}` },
                          )
                        }
                      />
                    ) : null}
                  </View>
                  {pick ? (
                    <Text style={styles.psPrompt}>
                      {pick.first ? `${nameOf(lineup, pick.first)} + tap another…` : "Tap the first player…"}
                    </Text>
                  ) : null}
                  {lineup.pairs.map(([a, b]) => (
                    <Chip
                      key={`p${a}-${b}`}
                      text={`🔗 ${nameOf(lineup, a)} ↔ ${nameOf(lineup, b)}`}
                      onX={() =>
                        void run(
                          "pair",
                          { action: "pair_remove", a, b },
                          { message: (x, y) => `Pair removed · ${balanced(x, y)}` },
                        )
                      }
                    />
                  ))}
                  {lineup.splits.map(([a, b]) => (
                    <Chip
                      key={`s${a}-${b}`}
                      text={`✂️ ${nameOf(lineup, a)} ↔ ${nameOf(lineup, b)}`}
                      tone="split"
                      onX={() =>
                        void run(
                          "pair",
                          { action: "split_remove", a, b },
                          { message: (x, y) => `Split removed · ${balanced(x, y)}` },
                        )
                      }
                    />
                  ))}
                </Card>

                <View style={styles.teams}>
                  {(["Gold", "Black"] as Team[]).map((team) => (
                    <TeamCol
                      key={team}
                      name={team}
                      players={teamRows(lineup, team)}
                      goalie={team === "Gold" ? lineup.gold_goalie : lineup.black_goalie}
                      total={team === "Gold" ? lineup.gold_total : lineup.black_total}
                      pick={pick}
                      flash={flash}
                      pairPartners={(k) => partnersOf(lineup.pairs, k)}
                      splitPartners={(k) => partnersOf(lineup.splits, k)}
                      onMove={onMove}
                      onLock={onToggleLock}
                      onPick={onPickPlayer}
                    />
                  ))}
                </View>

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
                      loading={busy.isBusy("push")}
                      style={styles.wideBtn}
                    />
                    {lineup.published_at ? (
                      <Button
                        label="Reset jerseys"
                        variant="secondary"
                        onPress={onResetJerseys}
                        loading={resetJerseysMutation.isPending}
                        style={styles.wideBtn}
                      />
                    ) : null}
                    <Button
                      label="Save to history"
                      variant="secondary"
                      onPress={onSave}
                      loading={busy.isBusy("save")}
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
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

// Pressed = dimmed + shrunk with a light haptic (Tap). `busy` = a network
// action is running: spinner, inert, so a second tap can't fire it again.
function BarBtn({
  label,
  onPress,
  active,
  gold,
  grid,
  wide,
  busy,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  gold?: boolean;
  grid?: boolean;
  /** Grid only: a whole row to itself. */
  wide?: boolean;
  busy?: boolean;
}) {
  const on = gold || active;
  return (
    <Tap
      onPress={onPress}
      haptic
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      style={[
        styles.barBtn,
        grid && styles.barBtnGrid,
        grid && wide && styles.barBtnWide,
        gold && styles.barBtnGold,
        active && styles.barBtnActive,
        busy && styles.barBtnBusy,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={on ? colors.goldText : colors.text} />
      ) : (
        <Text style={[styles.barBtnText, on && styles.barBtnTextOn]}>{label}</Text>
      )}
    </Tap>
  );
}

function TeamCol({
  name,
  players,
  goalie,
  total,
  pick,
  flash,
  pairPartners,
  splitPartners,
  onMove,
  onLock,
  onPick,
}: {
  name: Team;
  /** Roster order, skating goalies first (lineup.teamRows). */
  players: TeamLineupPlayer[];
  goalie: TeamLineupGoalie | null;
  total: number;
  pick: null | { mode: "pair" | "split"; first: string | null };
  flash: Set<string>;
  pairPartners: (k: string) => string[];
  splitPartners: (k: string) => string[];
  onMove: (id: string) => void;
  onLock: (p: TeamLineupPlayer) => void;
  onPick: (id: string) => void;
}) {
  return (
    <View style={[styles.col, name === "Gold" ? styles.colGold : styles.colBlack]}>
      <Text style={[styles.colHead, name === "Gold" && { color: colors.gold }]}>{name} Team</Text>
      <Text style={styles.colTotal}>Team Rating: {total.toFixed(2)}</Text>

      {goalie ? (
        <View style={styles.pRow}>
          <Text style={styles.pName} numberOfLines={1}>
            {goalie.name} <Text style={styles.gBadge}>G</Text>
          </Text>
          <Text style={styles.pRate}>{Number(goalie.rating || 0).toFixed(2)}</Text>
        </View>
      ) : null}

      {players.map((p) => {
        const k = p.id;
        const selected = pick?.first === k;
        const paired = pairPartners(k).length > 0;
        const split = splitPartners(k).length > 0;
        return (
          <View
            key={k}
            style={[styles.pRow, flash.has(k) && styles.pRowFlash, selected && styles.pRowSel]}
          >
            <Tap
              feedback="row"
              style={styles.pTapArea}
              onPress={() => (pick ? onPick(k) : onMove(k))}
            >
              <Text style={styles.pName} numberOfLines={1}>
                {p.name}
                {p.is_goalie ? <Text style={styles.gBadge}> G</Text> : null}
                {paired ? " 🔗" : ""}
                {split ? " ✂️" : ""}
                {p.is_new ? <Text style={styles.newTag}> new</Text> : null}
              </Text>
            </Tap>
            <Text style={styles.pRate}>{p.rating.toFixed(2)}</Text>
            <Tap
              feedback="icon"
              onPress={() => {
                tapHaptic();
                onLock(p);
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${p.locked ? "Unlock" : "Lock"} ${p.name}`}
            >
              <Ionicons
                name={p.locked ? "lock-closed" : "lock-open-outline"}
                size={15}
                color={p.locked ? colors.gold : colors.textMuted}
              />
            </Tap>
            <Tap
              feedback="icon"
              onPress={() => onMove(k)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Move ${p.name} to ${name === "Gold" ? "Black" : "Gold"}`}
            >
              <Ionicons name="swap-horizontal" size={16} color={colors.textMuted} />
            </Tap>
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
      <Tap feedback="icon" onPress={onX} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${text}`}>
        <Ionicons name="close" size={15} color={colors.textMuted} />
      </Tap>
    </View>
  );
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
    table { width: 100%; border-collapse: collapse; margin-top: 12pt; table-layout: fixed; }
    col { width: 50%; }
    tr { page-break-inside: avoid; }
    th, td {
      border: 1pt solid #000; text-align: center; vertical-align: middle; padding: 5pt; font-size: 13pt;
      white-space: normal; word-wrap: break-word; overflow-wrap: anywhere;
    }
    th { font-size: 14pt; }
    th.gold { color: #ffd54a; }
  </style></head><body>
    ${d.nightImageUrl ? `<div class="hdr"><img src="${esc(d.nightImageUrl)}"></div>` : ""}
    <h1>${esc(d.poolName)}</h1>
    ${d.poolDescription ? `<div class="desc">${esc(d.poolDescription)}</div>` : ""}
    <table>
      <colgroup><col><col></colgroup>
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
  lockStatus: { color: colors.gold, fontSize: font.xs, fontWeight: "700", textAlign: "center" },
  syncNote: { color: colors.textMuted, fontSize: font.xs, textAlign: "center" },
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
  barBtnWide: { flexBasis: "100%" },
  barBtnGold: { backgroundColor: colors.gold, borderColor: colors.gold },
  barBtnActive: { backgroundColor: colors.goldDim, borderColor: colors.gold },
  barBtnText: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  barBtnTextOn: { color: colors.goldText },
  barBtnBusy: { opacity: 0.7 },
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
  // Just moved (Auto-balance / tap-to-move) — brighter than the pick highlight.
  pRowFlash: { backgroundColor: "rgba(212, 175, 55, 0.28)" },
  pTapArea: { flex: 1 },
  pName: { color: colors.text, fontSize: font.xs },
  gBadge: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: "800",
  },
  pRate: { color: colors.textMuted, fontSize: 10, fontVariant: ["tabular-nums"] },
  // RSVP'd after the teams were made — the server put them on the smaller team.
  newTag: { color: colors.green, fontSize: 9, fontWeight: "800" },
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
