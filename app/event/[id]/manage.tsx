import { useState, type ReactNode } from "react";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";

import { ApiError } from "@/src/api/client";
import type {
  DayPlayer,
  EventDetail,
  EventManage,
  EventPatchBody,
  EventPreset,
  RosterAction,
  RosterEntry,
  WaitlistEntry,
} from "@/src/api/types";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { TimeField } from "@/src/components/TimeField";
import { Badge, Button, Card, ErrorState, FillBar, Loading } from "@/src/components/ui";
import { formatDateTime, formatEventDate, formatTime } from "@/src/format";
import { fillPct, rosterHealth } from "@/src/roster";
import {
  useCandidates,
  useDeleteEvent,
  useEvent,
  useHeaderImage,
  useInviteSchedule,
  usePatchEvent,
  usePenaltyBox,
  usePresetMutations,
  usePresets,
  useRosterAction,
  useSendBatch,
  useSendInvites,
} from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "settings", label: "Settings" },
  { key: "communications", label: "Comms" },
  { key: "roster", label: "Roster" },
  { key: "advanced", label: "Advanced" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ManageEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEvent(id);
  const [tab, setTab] = useState<TabKey>("overview");

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
  if (!event.can_manage || !event.manage) {
    return <ErrorState message="You don't manage this event." />;
  }
  const manage = event.manage;

  return (
    <>
      <Stack.Screen options={{ title: "Manage event" }} />

      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, tab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <KeyboardAwareScrollView
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
        {tab === "overview" ? <OverviewPanel event={event} manage={manage} /> : null}
        {tab === "settings" ? <SettingsPanel event={event} /> : null}
        {tab === "communications" ? <CommunicationsPanel event={event} manage={manage} /> : null}
        {tab === "roster" ? <RosterCard event={event} /> : null}
        {tab === "advanced" ? <AdvancedPanel event={event} manage={manage} /> : null}
      </KeyboardAwareScrollView>
    </>
  );
}

// ====================================================================
// OVERVIEW
// ====================================================================

function OverviewPanel({ event, manage }: { event: EventDetail; manage: EventManage }) {
  const r = event.roster;
  const going = event.players.filter((p) => p.status === "YES").length;
  const maybe = event.players.filter((p) => p.status === "MAYBE").length;
  const no = event.players.filter((p) => p.status === "NO").length;
  const noResp = manage.invitees.filter((i) => i.status === "NO_RESPONSE").length;
  const pct = fillPct(r);

  return (
    <>
      <Card accent="director">
        <Text style={styles.dirTag}>Director only</Text>
        <Text style={styles.title}>{event.display_name}</Text>
        <Text style={styles.meta}>
          {formatEventDate(event.date)}
          {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
        </Text>
        {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}
        <View style={styles.badgeRow}>
          <Badge text={event.status} tone="neutral" />
          {event.rsvp_locked ? <Badge text="SKATERS LOCKED" tone="bad" /> : null}
          {event.goalie_rsvp_locked ? <Badge text="GOALIES LOCKED" tone="bad" /> : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.heading}>Capacity</Text>
        <View style={styles.tiles}>
          <StatTile
            value={`${r.skaters}`}
            sub={r.capacity != null ? `/ ${r.capacity}` : undefined}
            label="Skaters"
          />
          <StatTile
            value={`${r.goalies}`}
            sub={r.goalies_needed != null ? `/ ${r.goalies_needed}` : undefined}
            label="Goalies"
          />
          <StatTile value={`${r.waitlist}`} label="Waitlist" />
        </View>
        {pct != null ? <FillBar pct={pct} tone={rosterHealth(r)} /> : null}
        <Text style={styles.meta}>
          {r.is_full
            ? "Roster full"
            : r.skater_spots_open != null
              ? `${r.skater_spots_open} skater spot${r.skater_spots_open === 1 ? "" : "s"} open`
              : `${r.skaters} in`}
          {(r.goalie_spots_open ?? 0) > 0 ? ` · needs ${r.goalie_spots_open} goalie` : ""}
        </Text>
      </Card>

      <Card>
        <Text style={styles.heading}>RSVPs</Text>
        <View style={styles.countGrid}>
          <CountCell label="Yes" value={going} />
          <CountCell label="Maybe" value={maybe} />
          <CountCell label="No" value={no} />
          <CountCell label="No response" value={noResp} />
          <CountCell label="Guests" value={r.guest_yes} />
          <CountCell label="Day players" value={r.day_players} />
        </View>
      </Card>

      <Card>
        <Text style={styles.heading}>Invites</Text>
        <Text style={styles.status}>
          {event.invites_sent_at
            ? `Sent ${formatDateTime(event.invites_sent_at)}`
            : manage.invites_send_at
              ? `Scheduled for ${formatDateTime(manage.invites_send_at)}`
              : "Not sent yet."}
        </Text>
        {manage.penalty_box.length > 0 ? (
          <Text style={styles.status}>
            {manage.penalty_box.length} player{manage.penalty_box.length === 1 ? "" : "s"} in the
            penalty box
          </Text>
        ) : null}
      </Card>
    </>
  );
}

function StatTile({
  value,
  sub,
  label,
}: {
  value: string;
  sub?: string;
  label: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>
        {value}
        {sub ? <Text style={styles.tileSub}> {sub}</Text> : null}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.countCell}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

// ====================================================================
// SETTINGS
// ====================================================================

function SettingsPanel({ event }: { event: EventDetail }) {
  return (
    <>
      <SettingsCard event={event} />
    </>
  );
}

function SettingsCard({ event }: { event: EventDetail }) {
  const patch = usePatchEvent(event.id);
  const m = event.manage!;

  const [title, setTitle] = useState(m.title ?? "");
  const [startTime, setStartTime] = useState(event.start_time?.slice(0, 5) ?? "");
  const [date, setDate] = useState(m.date ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [capacity, setCapacity] = useState(event.capacity != null ? String(event.capacity) : "");
  const [goaliesNeeded, setGoaliesNeeded] = useState(
    event.goalies_needed != null ? String(event.goalies_needed) : "",
  );
  const [warnHours, setWarnHours] = useState(
    m.rsvp_change_warning_hours != null ? String(m.rsvp_change_warning_hours) : "",
  );
  const [allowGuests, setAllowGuests] = useState(event.allow_guests);
  const [autoWaitlist, setAutoWaitlist] = useState(event.auto_waitlist_enabled);
  const [rsvpLocked, setRsvpLocked] = useState(event.rsvp_locked);
  const [goalieLocked, setGoalieLocked] = useState(event.goalie_rsvp_locked);
  const [beer, setBeer] = useState(event.beer_guy_enabled);
  const [beerPays, setBeerPays] = useState(m.beer_guy_pays);
  const [whiskey, setWhiskey] = useState(event.whiskey_guy_enabled);
  const [whiskeyPays, setWhiskeyPays] = useState(m.whiskey_guy_pays);
  const [error, setError] = useState<string | null>(null);

  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

  function save() {
    setError(null);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError("Date must be YYYY-MM-DD.");
      return;
    }
    if (startTime && !/^\d{1,2}:\d{2}$/.test(startTime.trim())) {
      setError("Pick a valid start time, or clear it.");
      return;
    }
    const body: EventPatchBody = {
      title: title.trim(),
      date: date.trim() || undefined,
      start_time: startTime.trim() ? `${startTime.trim()}:00` : null,
      location: location.trim(),
      capacity: numOrNull(capacity),
      goalies_needed: numOrNull(goaliesNeeded),
      rsvp_change_warning_hours: numOrNull(warnHours),
      allow_guests: allowGuests,
      auto_waitlist_enabled: autoWaitlist,
      rsvp_locked: rsvpLocked,
      goalie_rsvp_locked: goalieLocked,
      beer_guy_enabled: beer,
      beer_guy_pays: beerPays,
      whiskey_guy_enabled: whiskey,
      whiskey_guy_pays: whiskeyPays,
    };
    patch.mutate(body, {
      onError: (e) => setError(errText(e)),
    });
  }

  return (
    <Card>
      <Text style={styles.heading}>Event settings</Text>

      <Field label="Title (blank = night name)">
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={event.display_name}
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <View style={styles.twoCol}>
        <Field label="Date (YYYY-MM-DD)" style={styles.col}>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-09-03"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </Field>
        <Field label="Start time" style={styles.col}>
          <TimeField value={startTime} onChange={setStartTime} />
        </Field>
      </View>

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

      <Field label="Late-change warning (hours before start)">
        <TextInput
          style={styles.input}
          value={warnHours}
          onChangeText={setWarnHours}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>

      <View style={styles.divider} />
      <ToggleRow label="Allow guest RSVPs" value={allowGuests} onChange={setAllowGuests} />
      <ToggleRow label="Auto-waitlist when full" value={autoWaitlist} onChange={setAutoWaitlist} />
      <ToggleRow label="Lock skater RSVPs" value={rsvpLocked} onChange={setRsvpLocked} />
      <ToggleRow label="Lock goalie RSVPs" value={goalieLocked} onChange={setGoalieLocked} />
      <Text style={styles.hint}>
        Locks send new Yes responses straight to the waitlist. They also turn on automatically once
        the first player is waitlisted.
      </Text>

      <View style={styles.divider} />
      <ToggleRow label="Beer Guy sign-up" value={beer} onChange={setBeer} />
      {beer ? <ToggleRow label="Beer Guy pays" value={beerPays} onChange={setBeerPays} /> : null}
      <ToggleRow label="Whiskey Guy sign-up" value={whiskey} onChange={setWhiskey} />
      {whiskey ? (
        <ToggleRow label="Whiskey Guy pays" value={whiskeyPays} onChange={setWhiskeyPays} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save configuration" onPress={save} loading={patch.isPending} />
    </Card>
  );
}

// ====================================================================
// COMMUNICATIONS
// ====================================================================

function CommunicationsPanel({ event, manage }: { event: EventDetail; manage: EventManage }) {
  return (
    <>
      <DirectorMessageCard event={event} />
      <HeaderImageCard event={event} manage={manage} />
      <SendInvitesCard event={event} manage={manage} />
      <InviteListCard event={event} manage={manage} />
      <PenaltyBoxCard event={event} manage={manage} />
    </>
  );
}

function DirectorMessageCard({ event }: { event: EventDetail }) {
  const [message, setMessage] = useState(event.director_message ?? "");
  const patch = usePatchEvent(event.id);
  const dirty = message.trim() !== (event.director_message ?? "").trim();

  return (
    <Card accent="public">
      <Text style={styles.heading}>Director message</Text>
      <Text style={styles.hint}>Shown to players on the event and in the invite email.</Text>
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
        onPress={() =>
          patch.mutate(
            { director_message: message.trim() },
            { onError: (e) => Alert.alert("Couldn't save", errText(e)) },
          )
        }
        disabled={!dirty}
        loading={patch.isPending}
      />
    </Card>
  );
}

function HeaderImageCard({ event, manage }: { event: EventDetail; manage: EventManage }) {
  const img = useHeaderImage(event.id);

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]) return;
    img.set.mutate(res.assets[0].uri, {
      onError: (e) => Alert.alert("Upload failed", errText(e)),
    });
  }

  return (
    <Card>
      <Text style={styles.heading}>Invite header image</Text>
      {manage.invite_header_image ? (
        <Image
          source={{ uri: manage.invite_header_image }}
          style={styles.headerPreview}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.muted}>Using the default header.</Text>
      )}
      <View style={styles.twoCol}>
        <Button
          label="Choose image"
          variant="secondary"
          onPress={pick}
          loading={img.set.isPending}
          style={styles.grow}
        />
        {manage.invite_header_image ? (
          <Button
            label="Clear"
            variant="secondary"
            onPress={() => img.clear.mutate()}
            loading={img.clear.isPending}
            style={styles.grow}
          />
        ) : null}
      </View>
    </Card>
  );
}

const INVITEE_TONE: Record<string, "good" | "caution" | "bad" | "neutral"> = {
  YES: "good",
  MAYBE: "caution",
  WAITLIST: "caution",
  NO: "bad",
  NO_RESPONSE: "neutral",
};
const INVITEE_LABEL: Record<string, string> = {
  YES: "Going",
  MAYBE: "Maybe",
  WAITLIST: "Waitlist",
  NO: "No",
  NO_RESPONSE: "No response",
};

function InviteListCard({ event, manage }: { event: EventDetail; manage: EventManage }) {
  const roster = useRosterAction(event.id);
  const candidates = useCandidates(event.id);
  const [showAdd, setShowAdd] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  const busy = roster.isPending;
  const batchIds = new Set(manage.batch_invitee_ids);
  const invitees = [...manage.invitees].sort((a, b) => a.name.localeCompare(b.name));

  function act(body: RosterAction, onErr = "Couldn't update the invite list") {
    roster.mutate(body, { onError: (e) => Alert.alert(onErr, errText(e)) });
  }

  function addInvites() {
    if (picked.length === 0) return;
    roster.mutate(
      { action: "add_invites", player_ids: picked },
      {
        onSuccess: () => {
          setPicked([]);
          setShowAdd(false);
        },
        onError: (e) => Alert.alert("Couldn't add", errText(e)),
      },
    );
  }

  return (
    <Card>
      <Text style={styles.heading}>Invite list ({invitees.length})</Text>
      <Text style={styles.hint}>Everyone who gets the invite email. Tap a name for batch 2.</Text>

      {invitees.map((i) => {
        const inBatch = batchIds.has(i.player_id);
        return (
          <View key={i.player_id} style={styles.adminRow}>
            <View style={styles.adminRowTop}>
              <Text style={styles.playerName} numberOfLines={1}>
                {i.name}
              </Text>
              <Badge text={INVITEE_LABEL[i.status] ?? i.status} tone={INVITEE_TONE[i.status] ?? "neutral"} />
              {inBatch ? <Badge text="BATCH 2" tone="gold" /> : null}
            </View>
            <View style={styles.adminRowActions}>
              <Pressable
                onPress={() => act({ action: "send_invite", player_id: i.player_id })}
                disabled={busy}
                hitSlop={6}
              >
                <Text style={styles.linkText}>{i.sent_at ? "Resend" : "Send"}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  act(
                    inBatch
                      ? { action: "remove_batch", player_id: i.player_id }
                      : { action: "add_batch", player_ids: [i.player_id] },
                  )
                }
                disabled={busy}
                hitSlop={6}
              >
                <Text style={styles.linkText}>{inBatch ? "− Batch 2" : "+ Batch 2"}</Text>
              </Pressable>
              <Pressable
                onPress={() => act({ action: "remove_invite", player_id: i.player_id })}
                disabled={busy}
                hitSlop={6}
              >
                <Text style={styles.removeXText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <View style={styles.divider} />
      <Button
        label={showAdd ? "Close player list" : "Add to invite list"}
        variant="secondary"
        onPress={() => setShowAdd((s) => !s)}
      />
      {showAdd ? (
        candidates.isLoading ? (
          <Loading label="Loading…" />
        ) : candidates.data && candidates.data.invitable.length > 0 ? (
          <View style={styles.addPanel}>
            {candidates.data.invitable.map((c) => (
              <CheckRow
                key={c.id}
                label={c.name + (c.is_goalie ? " (G)" : "")}
                checked={picked.includes(c.id)}
                onToggle={() =>
                  setPicked((s) =>
                    s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id],
                  )
                }
              />
            ))}
            <Button
              label={`Add ${picked.length || ""}`.trim()}
              onPress={addInvites}
              disabled={busy || picked.length === 0}
            />
          </View>
        ) : (
          <Text style={styles.muted}>Everyone on this skate group is already invited.</Text>
        )
      ) : null}
    </Card>
  );
}

function SendInvitesCard({ event, manage }: { event: EventDetail; manage: EventManage }) {
  const patch = usePatchEvent(event.id);
  const sendInvites = useSendInvites(event.id);
  const sendBatch = useSendBatch(event.id);
  const schedule = useInviteSchedule(event.id);

  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [batchEnabled, setBatchEnabled] = useState(manage.batch_invites_enabled);
  const [batchDelay, setBatchDelay] = useState(String(manage.batch_invites_delay_hours ?? 24));

  function confirmSend() {
    Alert.alert("Send invites now?", "Emails the first batch of invites immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () =>
          sendInvites.mutate(undefined, {
            onSuccess: (r) => Alert.alert("Invites sent", `${r.notified} notified.`),
            onError: (e) => Alert.alert("Send failed", errText(e)),
          }),
      },
    ]);
  }

  function scheduleSend() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(schedDate) || !/^\d{1,2}:\d{2}$/.test(schedTime)) {
      Alert.alert("Check the date/time", "Use YYYY-MM-DD and HH:MM.");
      return;
    }
    const iso = `${schedDate}T${schedTime.padStart(5, "0")}:00`;
    schedule.set.mutate(iso, {
      onSuccess: () => {
        setSchedDate("");
        setSchedTime("");
      },
      onError: (e) => Alert.alert("Couldn't schedule", errText(e)),
    });
  }

  function saveBatch() {
    patch.mutate(
      {
        batch_invites_enabled: batchEnabled,
        batch_invites_delay_hours: Number(batchDelay) || 24,
      },
      { onError: (e) => Alert.alert("Couldn't save", errText(e)) },
    );
  }

  return (
    <Card>
      <Text style={styles.heading}>Invitations</Text>
      <Text style={styles.status}>
        {event.invites_sent_at
          ? `Sent ${formatDateTime(event.invites_sent_at)}`
          : manage.invites_send_at
            ? `Scheduled for ${formatDateTime(manage.invites_send_at)}`
            : "Not sent yet."}
      </Text>

      <Button label="Send invites now" onPress={confirmSend} loading={sendInvites.isPending} />
      <Button
        label="Send batch 2 now"
        variant="secondary"
        onPress={() =>
          sendBatch.mutate(undefined, {
            onSuccess: (r) => Alert.alert("Batch 2 sent", `${r.notified} notified.`),
            onError: (e) => Alert.alert("Send failed", errText(e)),
          })
        }
        loading={sendBatch.isPending}
      />

      <View style={styles.divider} />
      <Text style={styles.subhead}>Schedule for later</Text>
      <TextInput
        style={styles.input}
        value={schedDate}
        onChangeText={setSchedDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
      />
      <TimeField value={schedTime} onChange={setSchedTime} />
      <View style={styles.twoCol}>
        <Button
          label="Schedule"
          variant="secondary"
          onPress={scheduleSend}
          loading={schedule.set.isPending}
          style={styles.grow}
        />
        {manage.invites_send_at ? (
          <Button
            label="Clear schedule"
            variant="secondary"
            onPress={() => schedule.clear.mutate()}
            loading={schedule.clear.isPending}
            style={styles.grow}
          />
        ) : null}
      </View>

      <View style={styles.divider} />
      <ToggleRow label="Send in two batches" value={batchEnabled} onChange={setBatchEnabled} />
      {batchEnabled ? (
        <Field label="Batch 2 delay (hours)">
          <TextInput
            style={styles.input}
            value={batchDelay}
            onChangeText={setBatchDelay}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
          />
        </Field>
      ) : null}
      <Button
        label="Save batch settings"
        variant="secondary"
        onPress={saveBatch}
        loading={patch.isPending}
      />
    </Card>
  );
}

function PenaltyBoxCard({ event, manage }: { event: EventDetail; manage: EventManage }) {
  const pb = usePenaltyBox(event.id);
  const candidates = useCandidates(event.id);
  const [player, setPlayer] = useState<number | null>(null);
  const [delay, setDelay] = useState("24");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  // Anyone with an invitation is eligible; use invitees minus those already boxed.
  const boxedIds = new Set(manage.penalty_box.map((p) => p.player_id));
  const addable = manage.invitees.filter((i) => !boxedIds.has(i.player_id));

  function add() {
    if (player == null) return;
    pb.add.mutate(
      { player_id: player, delay_hours: Number(delay) || 24, reason: reason.trim() },
      {
        onSuccess: () => {
          setPlayer(null);
          setReason("");
          setOpen(false);
        },
        onError: (e) => Alert.alert("Couldn't add", errText(e)),
      },
    );
  }

  return (
    <Card accent="director">
      <Text style={styles.heading}>Penalty box</Text>
      <Text style={styles.hint}>
        Boxed players can&apos;t RSVP until their delay passes. Set this up before invites go out.
      </Text>

      {manage.penalty_box.length === 0 ? (
        <Text style={styles.muted}>Nobody in the box.</Text>
      ) : (
        manage.penalty_box.map((p) => (
          <View key={p.id} style={styles.rosterRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              {p.name} · {p.delay_hours}h{p.reason ? ` · ${p.reason}` : ""}
            </Text>
            <Pressable onPress={() => pb.remove.mutate(p.player_id)} hitSlop={8}>
              <Text style={styles.removeXText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <Button
        label={open ? "Cancel" : "Add to penalty box"}
        variant="secondary"
        onPress={() => setOpen((o) => !o)}
      />
      {open ? (
        <View style={styles.addPanel}>
          {candidates.isLoading ? (
            <Loading label="Loading…" />
          ) : (
            addable.map((i) => (
              <CheckRow
                key={i.player_id}
                label={i.name}
                checked={player === i.player_id}
                onToggle={() => setPlayer((cur) => (cur === i.player_id ? null : i.player_id))}
              />
            ))
          )}
          <View style={styles.twoCol}>
            <Field label="Delay (hours)" style={styles.col}>
              <TextInput
                style={styles.input}
                value={delay}
                onChangeText={setDelay}
                keyboardType="number-pad"
              />
            </Field>
            <Field label="Reason" style={styles.col}>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="optional"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
          </View>
          <Button label="Add" onPress={add} disabled={player == null || pb.add.isPending} />
        </View>
      ) : null}
    </Card>
  );
}

// ====================================================================
// ROSTER
// ====================================================================

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
            name={
              p.name +
              (p.guest_count > 0
                ? ` +${p.guest_count}${p.guest_names.length ? ` (${p.guest_names.join(", ")})` : ""}`
                : "")
            }
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
      {showAdd ? <AddPlayerPanel event={event} busy={busy} onAct={act} /> : null}

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
    return (
      <Text style={styles.muted}>
        Everyone on this skate group is already on the roster or waitlist.
      </Text>
    );
  }

  function submit(to: "roster" | "waitlist") {
    if (selected.length === 0) return;
    onAct({ action: "add", player_ids: selected, to });
    setSelected([]);
  }

  return (
    <View style={styles.addPanel}>
      {addable.map((c) => (
        <CheckRow
          key={c.id}
          label={c.name + (c.is_goalie ? " (G)" : "")}
          checked={selected.includes(c.id)}
          onToggle={() =>
            setSelected((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))
          }
        />
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

// ====================================================================
// ADVANCED
// ====================================================================

function AdvancedPanel({ event, manage }: { event: EventDetail; manage: EventManage }) {
  return (
    <>
      <DirectorNotesCard event={event} manage={manage} />
      <PresetsCard event={event} />
      <DeleteCard event={event} />
    </>
  );
}

function DirectorNotesCard({ event, manage }: { event: EventDetail; manage: EventManage }) {
  const patch = usePatchEvent(event.id);
  const [notes, setNotes] = useState(manage.director_notes ?? "");
  const dirty = notes.trim() !== (manage.director_notes ?? "").trim();

  return (
    <Card>
      <Text style={styles.heading}>Director notes</Text>
      <Text style={styles.hint}>Private to directors — never shown to players.</Text>
      <TextInput
        style={styles.textarea}
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything to remember for this skate…"
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <Button
        label={dirty ? "Save notes" : "Notes saved"}
        variant="secondary"
        onPress={() =>
          patch.mutate(
            { director_notes: notes.trim() },
            { onError: (e) => Alert.alert("Couldn't save", errText(e)) },
          )
        }
        disabled={!dirty}
        loading={patch.isPending}
      />
    </Card>
  );
}

function PresetsCard({ event }: { event: EventDetail }) {
  const nightId = event.night?.id ?? null;
  const presets = usePresets(nightId);
  const mut = usePresetMutations(event.id, nightId);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  if (nightId == null) {
    return (
      <Card>
        <Text style={styles.heading}>Event setup presets</Text>
        <Text style={styles.muted}>Custom events don&apos;t support presets.</Text>
      </Card>
    );
  }

  function save() {
    const n = name.trim();
    if (!n) return;
    mut.save.mutate(
      { name: n, is_default: makeDefault },
      {
        onSuccess: () => {
          setName("");
          setMakeDefault(false);
        },
        onError: (e) => Alert.alert("Couldn't save preset", errText(e)),
      },
    );
  }

  function confirmDelete(p: EventPreset) {
    Alert.alert("Delete preset?", `"${p.name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => mut.remove.mutate(p.id) },
    ]);
  }

  return (
    <Card>
      <Text style={styles.heading}>Event setup presets</Text>
      <Text style={styles.hint}>
        A reusable snapshot of time, capacity, beer/whiskey, and this event&apos;s Yes roster. The
        default preset auto-applies to new events for this night.
      </Text>

      {presets.isLoading ? (
        <Loading label="Loading presets…" />
      ) : (presets.data ?? []).length === 0 ? (
        <Text style={styles.muted}>No presets yet.</Text>
      ) : (
        (presets.data ?? []).map((p) => (
          <View key={p.id} style={styles.adminRow}>
            <View style={styles.adminRowTop}>
              <Text style={styles.playerName}>{p.name}</Text>
              {p.is_default ? <Badge text="DEFAULT" tone="gold" /> : null}
            </View>
            <View style={styles.adminRowActions}>
              {!p.is_default ? (
                <Pressable
                  onPress={() => mut.update.mutate({ presetId: p.id, body: { is_default: true } })}
                  hitSlop={6}
                >
                  <Text style={styles.linkText}>Make default</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() =>
                  mut.update.mutate({ presetId: p.id, body: { from_event_id: Number(event.id) } })
                }
                hitSlop={6}
              >
                <Text style={styles.linkText}>Update from this event</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(p)} hitSlop={6}>
                <Text style={styles.removeXText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <View style={styles.divider} />
      <Text style={styles.subhead}>Save this event as a preset</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Preset name"
        placeholderTextColor={colors.textMuted}
      />
      <ToggleRow label="Make it the default" value={makeDefault} onChange={setMakeDefault} />
      <Button
        label="Save preset"
        variant="secondary"
        onPress={save}
        disabled={!name.trim() || mut.save.isPending}
      />
    </Card>
  );
}

function DeleteCard({ event }: { event: EventDetail }) {
  const del = useDeleteEvent(event.id);
  const router = useRouter();

  function confirm() {
    Alert.alert(
      "Delete this event?",
      "This permanently removes the event and every RSVP. It can't be undone.",
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
      <Text style={styles.heading}>Delete event</Text>
      <Button label="Delete event" variant="danger" onPress={confirm} loading={del.isPending} />
    </Card>
  );
}

// ====================================================================
// shared
// ====================================================================

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

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.checkRow}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function errText(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Something went wrong.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  tabBarWrap: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.textMuted, fontWeight: "700", fontSize: font.sm },
  tabTextActive: { color: colors.goldText },

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
  status: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.red, fontWeight: "600" },
  muted: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  grow: { flex: 1 },

  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  tileValue: { fontSize: font.lg, fontWeight: "800", color: colors.text },
  tileSub: { fontSize: font.sm, fontWeight: "600", color: colors.textMuted },
  tileLabel: {
    marginTop: spacing.xs,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  countGrid: { flexDirection: "row", flexWrap: "wrap" },
  countCell: { width: "33%", paddingVertical: spacing.sm },
  countValue: { color: colors.text, fontSize: font.md, fontWeight: "800" },
  countLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

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

  headerPreview: {
    width: "100%",
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

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
  adminRowTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  adminRowActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  walkOnTag: { color: colors.textMuted, fontSize: font.xs },
  linkText: { color: colors.gold, fontSize: font.xs, fontWeight: "700" },
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
