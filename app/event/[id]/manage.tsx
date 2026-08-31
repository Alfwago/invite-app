import { useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { ApiError } from "@/src/api/client";
import type {
  DayPlayer,
  EventDetail,
  EventPatchBody,
  RosterAction,
  RosterEntry,
  WaitlistEntry,
} from "@/src/api/types";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import {
  useCandidates,
  useDeleteEvent,
  useEvent,
  usePatchEvent,
  useRosterAction,
  useSendBatch,
  useSendInvites,
} from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function ManageEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEvent(id);

  if (query.isLoading) return <Loading label="Loading event…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={
          query.error instanceof ApiError ? query.error.detail : "Couldn't load this event."
        }
        onRetry={() => query.refetch()}
      />
    );
  }

  const event = query.data;

  if (!event.can_manage) {
    return <ErrorState message="You don't manage this event." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Manage event" }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={query.refetch}
            tintColor={colors.gold}
          />
        }
      >
        <Card accent="director">
          <Text style={styles.dirTag}>Director only</Text>
          <Text style={styles.title}>{event.display_name}</Text>
          <Text style={styles.meta}>
            {formatEventDate(event.date)}
            {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
          </Text>
          <View style={styles.badgeRow}>
            <Badge text={event.status} tone="neutral" />
            {event.rsvp_locked ? <Badge text="SKATERS LOCKED" tone="bad" /> : null}
            {event.goalie_rsvp_locked ? <Badge text="GOALIES LOCKED" tone="bad" /> : null}
          </View>
        </Card>

        <DirectorMessageCard event={event} />
        <SettingsCard event={event} />
        <InvitesCard event={event} />
        <RosterCard event={event} />
        <LifecycleCard event={event} />
      </ScrollView>
    </>
  );
}

// ---- Director message --------------------------------------------------

function DirectorMessageCard({ event }: { event: EventDetail }) {
  const [message, setMessage] = useState(event.director_message ?? "");
  const patch = usePatchEvent(event.id);
  const dirty = message.trim() !== (event.director_message ?? "").trim();

  function save() {
    patch.mutate(
      { director_message: message.trim() },
      { onError: (e) => Alert.alert("Couldn't save", errText(e)) },
    );
  }

  return (
    <Card>
      <Text style={styles.heading}>Director message</Text>
      <Text style={styles.hint}>Shown to players on the event and included in the invite email.</Text>
      <TextInput
        style={styles.textarea}
        value={message}
        onChangeText={setMessage}
        placeholder="Add a note for the invite…"
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <Button
        label={dirty ? "Save message" : "Message saved"}
        variant="secondary"
        onPress={save}
        disabled={!dirty}
        loading={patch.isPending}
      />
    </Card>
  );
}

// ---- Event settings ---------------------------------------------------

function SettingsCard({ event }: { event: EventDetail }) {
  const patch = usePatchEvent(event.id);

  const [startTime, setStartTime] = useState(event.start_time?.slice(0, 5) ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [capacity, setCapacity] = useState(event.capacity != null ? String(event.capacity) : "");
  const [goaliesNeeded, setGoaliesNeeded] = useState(
    event.goalies_needed != null ? String(event.goalies_needed) : "",
  );
  const [allowGuests, setAllowGuests] = useState(event.allow_guests);
  const [beer, setBeer] = useState(event.beer_guy_enabled);
  const [whiskey, setWhiskey] = useState(event.whiskey_guy_enabled);
  const [autoWaitlist, setAutoWaitlist] = useState(event.auto_waitlist_enabled);
  const [error, setError] = useState<string | null>(null);

  const origTime = event.start_time?.slice(0, 5) ?? "";
  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
  const dirty =
    startTime !== origTime ||
    location !== (event.location ?? "") ||
    numOrNull(capacity) !== event.capacity ||
    numOrNull(goaliesNeeded) !== event.goalies_needed ||
    allowGuests !== event.allow_guests ||
    beer !== event.beer_guy_enabled ||
    whiskey !== event.whiskey_guy_enabled ||
    autoWaitlist !== event.auto_waitlist_enabled;

  function save() {
    setError(null);
    if (startTime && !/^\d{1,2}:\d{2}$/.test(startTime.trim())) {
      setError("Start time must be HH:MM (24-hour), or blank.");
      return;
    }
    for (const [label, val] of [
      ["Capacity", capacity],
      ["Goalies needed", goaliesNeeded],
    ] as const) {
      if (val.trim() !== "" && !Number.isFinite(Number(val))) {
        setError(`${label} must be a number.`);
        return;
      }
    }

    const body: EventPatchBody = {
      start_time: startTime.trim() ? `${startTime.trim()}:00` : null,
      location: location.trim(),
      capacity: numOrNull(capacity),
      goalies_needed: numOrNull(goaliesNeeded),
      allow_guests: allowGuests,
      beer_guy_enabled: beer,
      whiskey_guy_enabled: whiskey,
      auto_waitlist_enabled: autoWaitlist,
    };
    patch.mutate(body, { onError: (e) => setError(errText(e)) });
  }

  return (
    <Card>
      <Text style={styles.heading}>Event settings</Text>

      <Field label="Start time (HH:MM)">
        <TextInput
          style={styles.input}
          value={startTime}
          onChangeText={setStartTime}
          placeholder="20:30"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="Location">
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Rink / address"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <View style={styles.twoCol}>
        <Field label="Skater capacity" style={styles.col}>
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
        </Field>
        <Field label="Goalies needed" style={styles.col}>
          <TextInput
            style={styles.input}
            value={goaliesNeeded}
            onChangeText={setGoaliesNeeded}
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
        </Field>
      </View>

      <ToggleRow label="Allow guest RSVPs" value={allowGuests} onChange={setAllowGuests} />
      <ToggleRow label="Auto-waitlist when full" value={autoWaitlist} onChange={setAutoWaitlist} />
      <ToggleRow label="Beer Guy sign-up" value={beer} onChange={setBeer} />
      <ToggleRow label="Whiskey Guy sign-up" value={whiskey} onChange={setWhiskey} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={dirty ? "Save settings" : "Settings saved"}
        onPress={save}
        disabled={!dirty}
        loading={patch.isPending}
      />
    </Card>
  );
}

// ---- Invites --------------------------------------------------------

function InvitesCard({ event }: { event: EventDetail }) {
  const sendInvites = useSendInvites(event.id);
  const sendBatch = useSendBatch(event.id);

  function confirmSendInvites() {
    Alert.alert("Send invites?", "This emails the first batch of invites for this event now.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () =>
          sendInvites.mutate(undefined, {
            onSuccess: (r) =>
              Alert.alert("Invites sent", `${r.notified} notified, ${r.created} new records.`),
            onError: (e) => Alert.alert("Send failed", errText(e)),
          }),
      },
    ]);
  }

  function confirmSendBatch() {
    Alert.alert("Send batch 2?", "Emails everyone on the batch-2 list now.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () =>
          sendBatch.mutate(undefined, {
            onSuccess: (r) => Alert.alert("Batch 2 sent", `${r.notified} notified.`),
            onError: (e) => Alert.alert("Send failed", errText(e)),
          }),
      },
    ]);
  }

  return (
    <Card>
      <Text style={styles.heading}>Invites</Text>
      <Text style={styles.status}>
        {event.invites_sent_at
          ? `Invites sent ${new Date(event.invites_sent_at).toLocaleString()}`
          : "Invites not sent yet."}
      </Text>
      <Button label="Send invites" onPress={confirmSendInvites} loading={sendInvites.isPending} />
      <Button
        label="Send batch 2"
        variant="secondary"
        onPress={confirmSendBatch}
        loading={sendBatch.isPending}
      />
    </Card>
  );
}

// ---- Roster admin --------------------------------------------------

function RosterCard({ event }: { event: EventDetail }) {
  const roster = useRosterAction(event.id);
  const [showAdd, setShowAdd] = useState(false);
  const [walkOn, setWalkOn] = useState("");
  const [walkOnGoalie, setWalkOnGoalie] = useState(false);

  const going = event.players.filter((p) => p.status === "YES");
  const busy = roster.isPending;

  function act(body: RosterAction) {
    roster.mutate(body, { onError: (e) => Alert.alert("Roster update failed", errText(e)) });
  }

  function confirmRemove(entry: RosterEntry) {
    Alert.alert("Remove from roster?", `${entry.name} will be set to Not going.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => act({ action: "remove", player_id: entry.player_id }),
      },
    ]);
  }

  function addWalkOn() {
    const name = walkOn.trim();
    if (!name) return;
    act({ action: "add_day_player", name, is_goalie: walkOnGoalie });
    setWalkOn("");
    setWalkOnGoalie(false);
  }

  return (
    <Card>
      <Text style={styles.heading}>Roster</Text>

      <Text style={styles.subhead}>Going ({going.length})</Text>
      {going.length === 0 ? (
        <Text style={styles.muted}>Nobody yet.</Text>
      ) : (
        going.map((p) => (
          <RosterAdminRow
            key={`p-${p.player_id}`}
            name={p.name + (p.guest_count > 0 ? ` +${p.guest_count}` : "")}
            isGoalie={p.is_goalie}
            present={p.present}
            paid={p.paid}
            disabled={busy}
            onPresent={(v) => act({ action: "set_present", player_id: p.player_id, present: v })}
            onPaid={(v) => act({ action: "set_paid", player_id: p.player_id, paid: v })}
            onRemove={() => confirmRemove(p)}
          />
        ))
      )}

      {event.day_players.map((dp: DayPlayer) => (
        <RosterAdminRow
          key={`dp-${dp.id}`}
          name={dp.name}
          isGoalie={dp.is_goalie}
          walkOn
          present={dp.present}
          paid={dp.paid}
          disabled={busy}
          onPresent={(v) => act({ action: "set_present", day_player_id: dp.id, present: v })}
          onPaid={(v) => act({ action: "set_paid", day_player_id: dp.id, paid: v })}
          onRemove={() => act({ action: "remove_day_player", day_player_id: dp.id })}
        />
      ))}

      <View style={styles.divider} />

      <Button
        label={showAdd ? "Close player list" : "Add players"}
        variant="secondary"
        onPress={() => setShowAdd((s) => !s)}
      />
      {showAdd ? (
        <AddPlayerPanel event={event} busy={busy} onAct={act} />
      ) : null}

      <Text style={styles.subhead}>Add a walk-on</Text>
      <View style={styles.walkOnRow}>
        <TextInput
          style={[styles.input, styles.grow]}
          value={walkOn}
          onChangeText={setWalkOn}
          placeholder="Name"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          onPress={() => setWalkOnGoalie((g) => !g)}
          style={[styles.goaliePick, walkOnGoalie && styles.goaliePickOn]}
        >
          <Text style={[styles.goaliePickText, walkOnGoalie && styles.goaliePickTextOn]}>G</Text>
        </Pressable>
      </View>
      <Button
        label="Add walk-on"
        variant="secondary"
        onPress={addWalkOn}
        disabled={busy || !walkOn.trim()}
      />

      {event.waitlist.length > 0 ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.subhead}>Waitlist ({event.waitlist.length})</Text>
          {event.waitlist.map((w: WaitlistEntry) => (
            <View key={`w-${w.waitlist_id}`} style={styles.rosterRow}>
              <Text style={styles.playerName} numberOfLines={1}>
                {w.name}
                {w.is_goalie ? " (G)" : ""}
              </Text>
              <Button
                label="Promote"
                variant="secondary"
                onPress={() => act({ action: "promote", waitlist_id: w.waitlist_id })}
                disabled={busy}
                style={styles.promoteBtn}
              />
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

function RosterAdminRow({
  name,
  isGoalie,
  walkOn,
  present,
  paid,
  disabled,
  onPresent,
  onPaid,
  onRemove,
}: {
  name: string;
  isGoalie: boolean;
  walkOn?: boolean;
  present: boolean;
  paid: boolean;
  disabled?: boolean;
  onPresent: (v: boolean) => void;
  onPaid: (v: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.adminRow}>
      <View style={styles.adminRowTop}>
        <Text style={styles.playerName} numberOfLines={1}>
          {name}
          {isGoalie ? " " : ""}
        </Text>
        {isGoalie ? <Badge text="G" tone="goalie" /> : null}
        {walkOn ? <Text style={styles.walkOnTag}>walk-on</Text> : null}
      </View>
      <View style={styles.adminRowActions}>
        <TogglePill label="Present" on={present} disabled={disabled} onPress={() => onPresent(!present)} />
        <TogglePill label="Paid" on={paid} disabled={disabled} onPress={() => onPaid(!paid)} />
        <Pressable onPress={onRemove} disabled={disabled} hitSlop={8} style={styles.removeX}>
          <Text style={styles.removeXText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TogglePill({
  label,
  on,
  disabled,
  onPress,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.pill, on ? styles.pillOn : styles.pillOff, disabled && { opacity: 0.5 }]}
    >
      <Text style={[styles.pillText, on && styles.pillTextOn]}>{on ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

function AddPlayerPanel({
  event,
  busy,
  onAct,
}: {
  event: EventDetail;
  busy: boolean;
  onAct: (body: RosterAction) => void;
}) {
  const candidates = useCandidates(event.id);
  const [selected, setSelected] = useState<number[]>([]);

  if (candidates.isLoading) return <Loading label="Loading players…" />;
  if (candidates.isError || !candidates.data) {
    return <Text style={styles.error}>Couldn&apos;t load the player list.</Text>;
  }

  const { addable } = candidates.data;
  if (addable.length === 0) {
    return <Text style={styles.muted}>Everyone on this skate group is already on the roster or waitlist.</Text>;
  }

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function submit(to: "roster" | "waitlist") {
    if (selected.length === 0) return;
    onAct({ action: "add", player_ids: selected, to });
    setSelected([]);
  }

  return (
    <View style={styles.addPanel}>
      {addable.map((c) => (
        <Pressable key={c.id} onPress={() => toggle(c.id)} style={styles.checkRow}>
          <View style={[styles.checkbox, selected.includes(c.id) && styles.checkboxOn]}>
            {selected.includes(c.id) ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel} numberOfLines={1}>
            {c.name}
            {c.is_goalie ? " (G)" : ""}
          </Text>
        </Pressable>
      ))}
      <View style={styles.twoCol}>
        <Button
          label={`Add to roster${selected.length ? ` (${selected.length})` : ""}`}
          onPress={() => submit("roster")}
          disabled={busy || selected.length === 0}
          style={styles.grow}
        />
        <Button
          label="To waitlist"
          variant="secondary"
          onPress={() => submit("waitlist")}
          disabled={busy || selected.length === 0}
          style={styles.grow}
        />
      </View>
    </View>
  );
}

// ---- Lifecycle: locks + delete -------------------------------------

function LifecycleCard({ event }: { event: EventDetail }) {
  const patch = usePatchEvent(event.id);
  const del = useDeleteEvent(event.id);
  const router = useRouter();

  function setLock(field: "rsvp_locked" | "goalie_rsvp_locked", value: boolean) {
    patch.mutate({ [field]: value } as EventPatchBody, {
      onError: (e) => Alert.alert("Couldn't update", errText(e)),
    });
  }

  function confirmDelete() {
    Alert.alert(
      "Delete this event?",
      "This permanently removes the event and every RSVP. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            del.mutate(undefined, {
              onSuccess: () => router.replace("/(tabs)/events"),
              onError: (e) => Alert.alert("Delete failed", errText(e)),
            }),
        },
      ],
    );
  }

  return (
    <Card>
      <Text style={styles.heading}>Event status</Text>
      <Text style={styles.status}>
        Currently: {event.status}
        {event.status === "DRAFT" ? " — sending invites opens RSVPs." : ""}
      </Text>

      <ToggleRow
        label="Lock skater RSVPs"
        value={event.rsvp_locked}
        onChange={(v) => setLock("rsvp_locked", v)}
      />
      <ToggleRow
        label="Lock goalie RSVPs"
        value={event.goalie_rsvp_locked}
        onChange={(v) => setLock("goalie_rsvp_locked", v)}
      />
      <Text style={styles.hint}>
        When locked, new Yes responses go straight to the waitlist instead of taking a spot.
      </Text>

      <View style={styles.divider} />
      <Button
        label="Delete event"
        variant="danger"
        onPress={confirmDelete}
        loading={del.isPending}
      />
    </Card>
  );
}

// ---- shared bits ---------------------------------------------------

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.gold, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

function errText(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Something went wrong.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  dirTag: {
    alignSelf: "flex-start",
    color: colors.red,
    backgroundColor: colors.redDim,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  title: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: font.sm },
  badgeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  heading: { color: colors.gold, fontSize: font.md, fontWeight: "800" },
  subhead: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  hint: { color: colors.textMuted, fontSize: font.sm, lineHeight: 18 },
  field: { gap: spacing.xs },
  label: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  textarea: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 15,
  },
  twoCol: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },
  grow: { flex: 1 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  toggleLabel: { color: colors.text, fontSize: 15, flexShrink: 1 },
  status: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.red, fontWeight: "600" },
  muted: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  rosterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    gap: spacing.sm,
  },
  playerName: { color: colors.text, fontSize: font.sm, flexShrink: 1 },
  promoteBtn: { flexGrow: 0, paddingHorizontal: spacing.md, minHeight: 36 },

  adminRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  adminRowTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  adminRowActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  walkOnTag: { color: colors.textMuted, fontSize: font.xs },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  pillOff: { borderColor: colors.border, backgroundColor: colors.cardRaised },
  pillOn: { borderColor: colors.green, backgroundColor: colors.greenDim },
  pillText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },
  pillTextOn: { color: colors.green },
  removeX: { marginLeft: "auto", paddingVertical: 5, paddingHorizontal: spacing.sm },
  removeXText: { color: colors.red, fontSize: font.xs, fontWeight: "700" },

  walkOnRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  goaliePick: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  goaliePickOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  goaliePickText: { color: colors.textMuted, fontWeight: "800" },
  goaliePickTextOn: { color: colors.gold },

  addPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
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
  checkboxMark: { color: colors.gold, fontWeight: "800", fontSize: 13 },
  checkLabel: { color: colors.text, fontSize: font.sm, flexShrink: 1 },
});
