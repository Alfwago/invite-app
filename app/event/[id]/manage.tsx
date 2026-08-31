import { useState, type ReactNode } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { EventDetail, EventPatchBody, RosterEntry } from "@/src/api/types";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import { useEvent, usePatchEvent, useSendBatch, useSendInvites } from "@/src/hooks/queries";
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
            {event.roster.rsvp_locked ? <Badge text="RSVP LOCKED" tone="bad" /> : null}
          </View>
        </Card>

        <DirectorMessageCard event={event} />
        <SettingsCard event={event} />
        <InvitesCard event={event} />
        <RosterCard players={event.players} />
        <LifecycleCard status={event.status} />
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

// ---- Roster (read-only until the server supports edits) --------------

function RosterCard({ players }: { players: RosterEntry[] }) {
  const going = players.filter((p) => p.status === "YES");
  const waitlist = players.filter((p) => p.status === "WAITLIST");

  return (
    <Card>
      <Text style={styles.heading}>Roster</Text>
      <Text style={styles.hint}>
        Add / remove players, mark present or paid, and promote from the waitlist need a server
        update — use the website for now.
      </Text>

      <Text style={styles.subhead}>Going ({going.length})</Text>
      {going.length === 0 ? (
        <Text style={styles.muted}>Nobody yet.</Text>
      ) : (
        going.map((p) => <RosterRow key={p.player_id} entry={p} />)
      )}

      {waitlist.length > 0 ? (
        <>
          <Text style={styles.subhead}>Waitlist ({waitlist.length})</Text>
          {waitlist.map((p) => (
            <RosterRow key={p.player_id} entry={p} />
          ))}
        </>
      ) : null}
    </Card>
  );
}

function RosterRow({ entry }: { entry: RosterEntry }) {
  return (
    <View style={styles.rosterRow}>
      <Text style={styles.playerName} numberOfLines={1}>
        {entry.name}
        {entry.guest_count > 0 ? ` +${entry.guest_count}` : ""}
      </Text>
      <View style={styles.rosterTags}>
        {entry.is_goalie ? <Badge text="G" tone="goalie" /> : null}
        {entry.present ? <Badge text="IN" tone="good" /> : null}
        {entry.paid ? <Badge text="PAID" tone="good" /> : null}
      </View>
    </View>
  );
}

// ---- Lifecycle (needs server endpoints) -----------------------------

function LifecycleCard({ status }: { status: EventDetail["status"] }) {
  const notImpl = () =>
    Alert.alert(
      "Not available yet",
      "Opening, closing, completing and cancelling events from the app needs a server update. Use the website for now.",
    );

  return (
    <Card>
      <Text style={styles.heading}>Event status</Text>
      <Text style={styles.status}>Currently: {status}</Text>
      <View style={styles.lifecycleRow}>
        <Button label="Open RSVPs" variant="secondary" onPress={notImpl} disabled style={styles.grow} />
        <Button label="Close RSVPs" variant="secondary" onPress={notImpl} disabled style={styles.grow} />
      </View>
      <View style={styles.lifecycleRow}>
        <Button label="Mark complete" variant="secondary" onPress={notImpl} disabled style={styles.grow} />
        <Button label="Cancel event" variant="danger" onPress={notImpl} disabled style={styles.grow} />
      </View>
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
  rosterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    gap: spacing.sm,
  },
  playerName: { color: colors.text, fontSize: font.sm, flexShrink: 1 },
  rosterTags: { flexDirection: "row", gap: spacing.xs, alignItems: "center", flexShrink: 0 },
  lifecycleRow: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1 },
});
