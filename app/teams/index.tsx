import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type {
  SaveTeamsBody,
  TeamEvent,
  TeamGeneratorSnapshot,
  TeamGeneratorState,
  TeamRosterPlayer,
} from "@/src/api/types";
import { Dropdown } from "@/src/components/Dropdown";
import { useToast } from "@/src/components/Toast";
import { Button, Card, ErrorState, Loading, Tap } from "@/src/components/ui";
import { tapHaptic } from "@/src/haptics";
import { useBusy } from "@/src/hooks/useBusy";
import {
  useLockTeamGeneratorState,
  usePublishTeams,
  useResetJerseys,
  useSaveTeamHistory,
  useTeamEvents,
  useTeamGeneratorState,
  useTeamRoster,
  useUnlockTeamGeneratorState,
} from "@/src/hooks/queries";
import {
  autoBalance,
  normalizeGoalie,
  ppv,
  type BalanceResult,
  type TGPlayer,
} from "@/src/teams/balance";
import { balanceMessage, movedIds } from "@/src/teams/moves";
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
  const generatorState = useTeamGeneratorState(eventId);
  const lockMutation = useLockTeamGeneratorState(eventId ?? 0);
  const unlockMutation = useUnlockTeamGeneratorState(eventId ?? 0);
  const resetJerseysMutation = useResetJerseys(eventId ?? 0);
  const isLocked = !!generatorState.data?.locked;

  const [presentOnly, setPresentOnly] = useState(false);
  const [locks, setLocks] = useState<Record<string, Team>>({});
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [splits, setSplits] = useState<[string, string][]>([]);
  const [assignment, setAssignment] = useState<Record<string, Team>>({});
  const [goldGoalie, setGoldGoalie] = useState<BalanceResult["goldGoalie"]>(null);
  const [blackGoalie, setBlackGoalie] = useState<BalanceResult["blackGoalie"]>(null);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState<null | { mode: "pair" | "split"; first: string | null }>(null);
  const toast = useToast();
  const busy = useBusy();

  // Rows that just changed team (Auto-balance, or a tap-to-move) get a brief
  // gold highlight so the change is visible, then fade back after ~1s.
  const [flash, setFlash] = useState<Set<string>>(() => new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRows = useCallback((ids: string[]) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(new Set(ids));
    flashTimer.current = setTimeout(() => setFlash(new Set()), 1000);
  }, []);
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  // {id: name} — see TeamGeneratorSnapshot.pairNames. A ref, not state: it's
  // a display fallback only, never read to decide what to render on its own
  // (nameOf reads it inline), so mutating it shouldn't itself trigger a
  // re-render.
  const pairNameCache = useRef<Record<string, string>>({});

  // Lock Teams — see TeamGeneratorState on the server. Restoring a locked
  // draft happens once per event, as soon as both the roster and the lock
  // state have loaded; a roster refetch afterwards must not clobber further
  // edits, hence the ref guard instead of an effect dependency on the data.
  const restoredForEvent = useRef<number | null>(null);
  const lastSavedSnapshotJson = useRef<string | null>(null);

  // Shared by the initial-load effect below and the explicit Refresh button
  // (onRefresh) — pulling the server's locked draft onto the screen. Takes
  // the generator-state/roster data as arguments rather than reading the
  // reactive query objects, so a manual refresh can apply the just-fetched
  // result immediately instead of waiting a render for `.data` to update
  // (which risks the effect re-firing on stale cached data first — see
  // onRefresh).
  const applyLockedState = useCallback(
    (data: TeamGeneratorState, rosterData: TeamRosterPlayer[]) => {
      const snap = (data.state || {}) as TeamGeneratorSnapshot;
      const restoredAssignment = (snap.assignment ?? {}) as Record<string, Team>;
      // A draft locked on the website stores numeric ids; the app keys
      // everything by K(id). Normalize at load so pair/split chips, the
      // already-paired check and nameOf all match.
      const restoredPairs = toEdges(snap.pairs);
      const restoredSplits = toEdges(snap.splits);
      const restoredPresentOnly = !!snap.presentOnly;
      Object.assign(pairNameCache.current, snap.pairNames || {});

      setLocks(restoredAssignment);
      setPairs(restoredPairs);
      setSplits(restoredSplits);
      setPresentOnly(restoredPresentOnly);

      // Re-run the balancer directly (not runBalance(), whose memoized inputs
      // haven't picked up the state just set above yet) so gold/black/goalies
      // come out exactly as they were when locked.
      const tgPlayers: TGPlayer[] = rosterData.map((r) => ({
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
        locked: restoredAssignment[K(r.id)] ?? null,
      }));
      const result = autoBalance({
        players: tgPlayers,
        pairs: restoredPairs,
        splits: restoredSplits,
        presentOnly: restoredPresentOnly,
        shuffle: true,
      });
      const nextAssignment: Record<string, Team> = {};
      result.gold.forEach((p) => (nextAssignment[K(p.id)] = "Gold"));
      result.black.forEach((p) => (nextAssignment[K(p.id)] = "Black"));
      setAssignment(nextAssignment);
      setGoldGoalie(result.goldGoalie);
      setBlackGoalie(result.blackGoalie);
      lastSavedSnapshotJson.current = JSON.stringify({
        assignment: nextAssignment,
        pairs: restoredPairs,
        splits: restoredSplits,
        presentOnly: restoredPresentOnly,
        pairNames: snap.pairNames || {},
      });
    },
    [],
  );

  useEffect(() => {
    if (eventId == null) return;
    if (restoredForEvent.current === eventId) return;
    if (!generatorState.data || !roster.data) return;
    restoredForEvent.current = eventId;
    if (!generatorState.data.locked) return;
    applyLockedState(generatorState.data, roster.data);
  }, [eventId, generatorState.data, roster.data, applyLockedState]);

  // Explicit "Refresh" — unlike the roster-only refetch this used to be, a
  // director expects this to also pick up a lock/publish made elsewhere
  // (the website, or another device) since this screen was opened. Awaits
  // the refetch results directly rather than resetting restoredForEvent and
  // letting the effect above re-fire: React Query keeps the previous
  // `.data` around while a refetch is in flight, so clearing the guard
  // first would risk the effect reapplying stale cached data a render
  // before the fresh result lands. If the server reports unlocked, local
  // (possibly unsaved) edits are left alone — only a locked/published
  // server state overwrites the screen, same as the initial-load behavior.
  async function onRefresh() {
    await busy.run("refresh", async () => {
      const [rosterResult, genResult] = await Promise.all([
        roster.refetch(),
        generatorState.refetch(),
      ]);
      if (rosterResult.isError || genResult.isError) {
        toast.show("Couldn't refresh — try again", "error");
        return;
      }
      if (genResult.data?.locked && rosterResult.data) {
        applyLockedState(genResult.data, rosterResult.data);
        toast.show("Refreshed: locked teams loaded");
      } else {
        toast.show(`Refreshed: ${rosterResult.data?.length ?? 0} on roster`);
      }
    });
  }

  // Once locked, every further edit (move, pair/split, swap, re-balance)
  // re-saves so nothing done after the initial lock is lost either.
  useEffect(() => {
    if (!isLocked || eventId == null) return;
    if (restoredForEvent.current !== eventId) return;
    const snap: TeamGeneratorSnapshot = {
      assignment,
      pairs,
      splits,
      presentOnly,
      pairNames: { ...pairNameCache.current },
    };
    const json = JSON.stringify(snap);
    if (json === lastSavedSnapshotJson.current) return;
    lastSavedSnapshotJson.current = json;
    lockMutation.mutate(snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, eventId, assignment, pairs, splits, presentOnly]);

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
      return next;
    },
    [tgPlayers, pairs, splits, presentOnly],
  );

  // Auto-balance (and Present only, which re-balances): say what happened
  // and highlight who moved — otherwise a re-balance that shuffles two
  // players looks like nothing happened.
  function rebalanceWithToast(present = presentOnly, prefix?: string) {
    const prev = assignment;
    const hadTeams = Object.keys(prev).length > 0;
    const next = runBalance(present);
    const moved = movedIds(prev, next);
    flashRows(moved);
    const msg = balanceMessage(hadTeams, moved.length);
    toast.show(prefix ? `${prefix} · ${msg}` : msg);
  }

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
    flashRows([k]);
  }

  function toggleLock(id: TeamRosterPlayer["id"]) {
    const k = K(id);
    const wasLocked = !!locks[k];
    const team = assignment[k] ?? "Gold";
    setLocks((l) => {
      const c = { ...l };
      if (c[k]) delete c[k];
      else c[k] = team;
      return c;
    });
    toast.show(wasLocked ? `Unlocked ${nameOf(k)}` : `Locked ${nameOf(k)} to ${team}`, "info");
  }

  function clearLocks() {
    setLocks({});
  }

  function onClearLocks() {
    const n = Object.keys(locks).length;
    clearLocks();
    toast.show(n ? `Cleared ${n} lock${n === 1 ? "" : "s"}` : "No locks to clear", n ? "success" : "info");
  }

  function onSwapTeams() {
    swapTeams();
    toast.show("Teams swapped");
  }

  function onSwapGoalies() {
    if (!goldGoalie && !blackGoalie) return toast.show("No goalies to swap", "info");
    swapGoalies();
    toast.show("Goalies swapped");
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
      if (!has(pairs)) {
        setPairs((p) => [...p, edge]);
        toast.show(`Paired ${nameOf(edge[0])} + ${nameOf(edge[1])} · Auto-balance to apply`);
      } else toast.show("Already paired", "info");
    } else {
      if (has(pairs)) {
        Alert.alert(
          "Already paired",
          "These two are set to keep together — remove that pairing first.",
        );
        return setPick(null);
      }
      if (!has(splits)) {
        setSplits((s) => [...s, edge]);
        toast.show(`Split ${nameOf(edge[0])} / ${nameOf(edge[1])} · Auto-balance to apply`);
      } else toast.show("Already split", "info");
    }
    setPick(null);
  }

  const nameOf = (k: string) => {
    const p = players.find((pl) => K(pl.id) === k);
    if (p) {
      pairNameCache.current[k] = p.name;
      return p.name;
    }
    return pairNameCache.current[k] ?? "(removed)";
  };

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
    await busy.run("save", async () => {
      try {
        await save.mutateAsync(splitBody());
        setNote("");
        toast.show("Saved to history");
      } catch (e) {
        Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : "Try again.");
      }
    });
  }

  async function onLock() {
    if (!eventId || !balanced) return;
    // Pin every currently-placed player — the same manual 🔒 already
    // available per-player, applied to everyone at once.
    setLocks(assignment);
    const snap: TeamGeneratorSnapshot = {
      assignment,
      pairs,
      splits,
      presentOnly,
      pairNames: { ...pairNameCache.current },
    };
    await busy.run("lock", async () => {
      try {
        await lockMutation.mutateAsync(snap);
        lastSavedSnapshotJson.current = JSON.stringify(snap);
        toast.show("Teams locked");
      } catch (e) {
        Alert.alert("Couldn't lock teams", e instanceof ApiError ? e.detail : "Try again.");
      }
    });
  }

  async function syncLockStateAfterPublish() {
    try {
      const result = await generatorState.refetch();
      const data = result.data;
      if (data?.locked) {
        const snap = (data.state || {}) as TeamGeneratorSnapshot;
        setLocks((snap.assignment ?? {}) as Record<string, Team>);
        Object.assign(pairNameCache.current, snap.pairNames || {});
      }
      lastSavedSnapshotJson.current = JSON.stringify({
        assignment,
        pairs,
        splits,
        presentOnly,
        pairNames: { ...pairNameCache.current },
      });
    } catch {
      // best-effort UI sync only — the server already locked it during publish
    }
  }

  function onUnlock() {
    if (!eventId) return;
    Alert.alert(
      "Unlock teams?",
      "Auto-balance and pair/split changes will be able to move players again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: () =>
            busy.run("lock", async () => {
              try {
                await unlockMutation.mutateAsync();
                clearLocks();
                lastSavedSnapshotJson.current = null;
                toast.show("Teams unlocked");
              } catch (e) {
                Alert.alert("Couldn't unlock teams", e instanceof ApiError ? e.detail : "Try again.");
              }
            }),
        },
      ],
    );
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
              // The server auto-locks the published split whether or not
              // the director hit Lock Teams themselves — sync the
              // button/status to match rather than re-locking (and risking
              // a misleading error right after a successful push).
              await syncLockStateAfterPublish();
            } catch (e) {
              Alert.alert("Couldn't push", e instanceof ApiError ? e.detail : "Try again.");
            }
          },
        },
      ],
    );
  }

  function onResetJerseys() {
    if (!eventId) return;
    Alert.alert(
      "Reset jerseys?",
      "Players who already saw their Gold/Black assignment will stop seeing it — the card just " +
        "disappears next time they open the app or refresh. No notification is sent. This doesn't " +
        "touch your locked teams or pairs/splits in the generator; you can push again anytime.",
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
                  restoredForEvent.current = null;
                  lastSavedSnapshotJson.current = null;
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
                {isLocked ? (
                  <Text style={styles.lockStatus}>
                    🔒 Locked
                    {generatorState.data?.locked_by ? ` by ${generatorState.data.locked_by}` : ""} —
                    edits are saved automatically.
                  </Text>
                ) : null}

                {/* Fixed layout: Auto-balance on its own full-width row, then
                    Present only + Refresh; the buttons that appear after the
                    first balance (Lock, Swap…, Clear locks) fill whole rows
                    below, so nothing above them moves — Auto-balance stays
                    under the finger for a second tap. */}
                <View style={styles.toolGrid}>
                  <BarBtn label="Auto-balance" gold grid wide onPress={() => rebalanceWithToast()} />
                  <BarBtn
                    label={`Present only: ${presentOnly ? "On" : "Off"}`}
                    active={presentOnly}
                    grid
                    onPress={() => {
                      const next = !presentOnly;
                      setPresentOnly(next);
                      if (balanced) rebalanceWithToast(next, `Present only ${next ? "on" : "off"}`);
                      else toast.show(`Present only ${next ? "on" : "off"}`, "info");
                    }}
                  />
                  <BarBtn label="Refresh" grid busy={busy.isBusy("refresh")} onPress={onRefresh} />
                  {balanced ? (
                    <>
                      <BarBtn
                        label={isLocked ? "🔓 Unlock Teams" : "🔒 Lock Teams"}
                        active={isLocked}
                        grid
                        busy={busy.isBusy("lock")}
                        onPress={isLocked ? onUnlock : onLock}
                      />
                      <BarBtn label="Swap teams" grid onPress={onSwapTeams} />
                      <BarBtn label="Swap goalies" grid onPress={onSwapGoalies} />
                      <BarBtn label="Clear locks" grid onPress={onClearLocks} />
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
                          toast.show("Pairs and splits cleared");
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
                    <Chip
                      key={`p${i}`}
                      text={`🔗 ${nameOf(e[0])} ↔ ${nameOf(e[1])}`}
                      onX={() => {
                        setPairs((p) => p.filter((x) => x !== e));
                        toast.show(`Pair removed: ${nameOf(e[0])} + ${nameOf(e[1])}`, "info");
                      }}
                    />
                  ))}
                  {splits.map((e, i) => (
                    <Chip
                      key={`s${i}`}
                      text={`✂️ ${nameOf(e[0])} ↔ ${nameOf(e[1])}`}
                      tone="split"
                      onX={() => {
                        setSplits((s) => s.filter((x) => x !== e));
                        toast.show(`Split removed: ${nameOf(e[0])} / ${nameOf(e[1])}`, "info");
                      }}
                    />
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
                      flash={flash}
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
                      flash={flash}
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
                      {generatorState.data?.published_at ? (
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
                        loading={save.isPending || busy.isBusy("save")}
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
  locks,
  pick,
  flash,
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
  flash: Set<string>;
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
          <View
            key={k}
            style={[styles.pRow, flash.has(k) && styles.pRowFlash, selected && styles.pRowSel]}
          >
            <Tap
              feedback="row"
              style={styles.pTapArea}
              onPress={() => (pick ? onPick(p.id) : onMove(p.id))}
            >
              <Text style={styles.pName} numberOfLines={1}>
                {p.name}
                {p.is_goalie ? <Text style={styles.gBadge}> G</Text> : null}
                {paired ? " 🔗" : ""}
                {split ? " ✂️" : ""}
              </Text>
            </Tap>
            <Text style={styles.pRate}>{ratingOf(p).toFixed(2)}</Text>
            <Tap
              feedback="icon"
              onPress={() => {
                tapHaptic();
                onLock(p.id);
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${locked ? "Unlock" : "Lock"} ${p.name}`}
            >
              <Ionicons
                name={locked ? "lock-closed" : "lock-open-outline"}
                size={15}
                color={locked ? colors.gold : colors.textMuted}
              />
            </Tap>
            <Tap
              feedback="icon"
              onPress={() => onMove(p.id)}
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

function toEdges(list: unknown): [string, string][] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e): e is [unknown, unknown] => Array.isArray(e) && e.length === 2)
    .map(([a, b]) => [String(a), String(b)]);
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
