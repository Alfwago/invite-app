import { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/src/api/client";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { Tap } from "@/src/components/Tap";
import { ClockField, DateField, NumberField } from "@/src/components/pickers";
import type { Night, NonSkatingEventBody } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import { useCreateNextEvent, useCreateNonSkatingEvent, useNights } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

const CUSTOM = -1;
// A golf outing / party / Hockey Fest (server 0.40.0+): Admins + Presidents.
const NON_SKATING = -2;

export default function NewEventScreen() {
  const router = useRouter();
  const { me } = useAuth();
  const nightsQuery = useNights();
  const create = useCreateNextEvent();

  const [nightId, setNightId] = useState<number | null>(null);
  const [date, setDate] = useState(""); // optional YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // optional HH:MM (24h)
  const [capacity, setCapacity] = useState(""); // optional roster limit
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => nightsQuery.data ?? [], [nightsQuery.data]);
  const selected = nightId != null;
  const night = nightId != null && nightId !== CUSTOM
    ? options.find((n) => n.id === nightId)
    : undefined;

  // A default preset overrides the night's plain defaults on create, so the
  // "what you'll get" values must come from the preset when there is one.
  const preset = night?.default_preset ?? null;
  const effTime = preset?.start_time ?? night?.default_time ?? null;
  const effCapacity = preset?.capacity ?? night?.default_capacity ?? null;

  if (nightsQuery.isLoading) return <Loading label="Loading nights…" />;
  if (nightsQuery.isError) {
    return (
      <ErrorState
        message={
          nightsQuery.error instanceof ApiError ? nightsQuery.error.detail : "Couldn't load nights."
        }
        onRetry={() => nightsQuery.refetch()}
      />
    );
  }

  async function submit() {
    setError(null);
    if (date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Date must be YYYY-MM-DD, or leave it blank for the next scheduled day.");
      return;
    }
    const time = startTime.trim();
    if (time !== "" && !/^\d{1,2}:\d{2}$/.test(time)) {
      setError("Pick a valid puck drop time, or leave it blank.");
      return;
    }
    const cap = capacity.trim();
    if (cap !== "" && !/^\d+$/.test(cap)) {
      setError("Roster limit must be a whole number, or leave it blank.");
      return;
    }
    try {
      const event = await create.mutateAsync({
        night_id: nightId === CUSTOM ? null : nightId,
        ...(date ? { base_date: date } : {}),
        ...(time ? { start_time: time } : {}),
        ...(cap ? { capacity: Number(cap) } : {}),
      });
      router.replace(`/event/${event.id}/manage`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't create the event.");
    }
  }

  return (
    <KeyboardAwareScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.label}>Which event?</Text>
        {options.map((n: Night) => (
          <NightOption
            key={n.id}
            label={n.name}
            active={nightId === n.id}
            onPress={() => setNightId(n.id)}
          />
        ))}
        <NightOption
          label="Custom event (no skate group)"
          active={nightId === CUSTOM}
          onPress={() => setNightId(CUSTOM)}
        />
        {me?.is_president ? (
          <NightOption
            label="Non-skating event (golf outing, party, Hockey Fest)"
            active={nightId === NON_SKATING}
            onPress={() => setNightId(NON_SKATING)}
          />
        ) : null}
      </Card>

      {nightId === NON_SKATING ? <NonSkatingForm /> : null}
      {nightId === NON_SKATING ? null : (
        <>

      {night ? (
        <Card accent="public">
          <Text style={styles.label}>What you&apos;ll get</Text>
          <DefaultRow
            k="Date"
            v={night.next_default_date ? formatEventDate(night.next_default_date) : "today"}
          />
          <DefaultRow k="Puck drop" v={effTime ? formatTime(effTime) : "—"} />
          <DefaultRow k="Location" v={night.default_location || "—"} />
          <DefaultRow
            k="Roster limit"
            v={effCapacity != null ? String(effCapacity) : "—"}
          />
          <DefaultRow
            k="Goalies needed"
            v={night.default_goalies_needed != null ? String(night.default_goalies_needed) : "—"}
          />
          {preset ? (
            <DefaultRow k="Preset" v={`${preset.name} (sets time, limit & roster)`} />
          ) : null}
          <Text style={styles.hint}>
            {preset
              ? `"${preset.name}" is this night's default preset — its time and roster limit win over the plain night defaults. `
              : ""}
            The director message and invite list come from this skate group too. Override the
            date / time / limit below if you need to.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.label}>Date</Text>
        <DateField
          value={date}
          onChange={setDate}
          minimumDate={new Date()}
          placeholder={
            night?.next_default_date
              ? `Default · ${formatEventDate(night.next_default_date)}`
              : "Default · today"
          }
        />

        <Text style={styles.label}>Puck drop</Text>
        <ClockField
          value={startTime}
          onChange={setStartTime}
          placeholder={effTime ? `Default · ${formatTime(effTime)}` : "Choose a time"}
        />

        <Text style={styles.label}>Roster limit</Text>
        <NumberField
          value={capacity}
          onChange={setCapacity}
          min={4}
          max={60}
          placeholder={
            effCapacity != null ? `Default · ${effCapacity} skaters` : "Night default"
          }
        />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Create event"
        onPress={submit}
        disabled={!selected}
        loading={create.isPending}
      />
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

/** A golf outing / party: no skate group, goalies or hockey (same form as
 *  the website's "New non-skating event"). Starts as a draft; the Manage
 *  screen's Comms tab builds the invite list and sends. */
function NonSkatingForm() {
  const router = useRouter();
  const create = useCreateNonSkatingEvent();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [arriveBy, setArriveBy] = useState("");
  const [location, setLocation] = useState("");
  const [directions, setDirections] = useState("");
  const [venueNotes, setVenueNotes] = useState("");
  const [capacity, setCapacity] = useState("");
  const [cost, setCost] = useState("");
  const [allowGuests, setAllowGuests] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) return setError("Give it a name.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Pick a date.");
    if (!/^\d{1,2}:\d{2}$/.test(startTime.trim())) return setError("Pick a start time.");
    if (!location.trim()) return setError("Where is it?");
    const body: NonSkatingEventBody = {
      title: title.trim(),
      date,
      start_time: startTime.trim(),
      location: location.trim(),
      allow_guests: allowGuests,
      ...(arriveBy.trim() ? { arrive_by: arriveBy.trim() } : {}),
      ...(directions.trim() ? { directions_url: directions.trim() } : {}),
      ...(venueNotes.trim() ? { venue_notes: venueNotes.trim() } : {}),
      ...(capacity.trim() ? { capacity: Number(capacity) } : {}),
      ...(cost.trim() ? { skate_fee: Number(cost) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      const event = await create.mutateAsync(body);
      router.replace(`/event/${event.id}/manage`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't create the event.");
    }
  }

  return (
    <>
      <Card accent="public">
        <Text style={styles.hint}>
          No goalies, teams, ratings or late-drop fines. Guests count toward the headcount. After
          you create it, build the invite list on its Comms tab and send.
        </Text>
      </Card>
      <Card>
        <Text style={styles.label}>Event name</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Holiday Party"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Date</Text>
        <DateField value={date} onChange={setDate} minimumDate={new Date()} placeholder="Pick a date" />
        <Text style={styles.label}>Start time</Text>
        <ClockField value={startTime} onChange={setStartTime} placeholder="Pick a time" />
        <Text style={styles.label}>Arrive by (optional)</Text>
        <ClockField value={arriveBy} onChange={setArriveBy} placeholder="Optional" />
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Place / address"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Directions link (optional)</Text>
        <TextInput
          style={styles.input}
          value={directions}
          onChangeText={setDirections}
          placeholder="Blank = a map of the location"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.label}>Venue notes (parking, dress code…)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={venueNotes}
          onChangeText={setVenueNotes}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </Card>
      <Card>
        <Text style={styles.label}>Headcount limit (optional)</Text>
        <NumberField value={capacity} onChange={setCapacity} min={1} max={300} placeholder="No limit" />
        <Text style={styles.hint}>Players plus their guests. Extra RSVPs go on the waitlist.</Text>
        <Text style={styles.label}>Cost per person, $ (optional)</Text>
        <NumberField value={cost} onChange={setCost} min={0} max={500} step={5} placeholder="Free" icon="cash-outline" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Players can bring guests (just a number)</Text>
          <Switch
            value={allowGuests}
            onValueChange={setAllowGuests}
            trackColor={{ true: colors.gold, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.label}>Details for invitees (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create event" onPress={submit} loading={create.isPending} />
    </>
  );
}

function DefaultRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.defaultRow}>
      <Text style={styles.defaultKey}>{k}</Text>
      <Text style={styles.defaultVal} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

function NightOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      feedback="row"
      onPress={onPress}
      style={[styles.option, active && { borderColor: colors.gold, backgroundColor: colors.bg }]}
    >
      <View style={[styles.radio, active && { borderColor: colors.gold }]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionText: { color: colors.text, fontSize: 15, flexShrink: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  hint: { color: colors.textMuted, fontSize: 13 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  multiline: { minHeight: 64, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchLabel: { color: colors.text, fontSize: 15, flexShrink: 1 },
  error: { color: colors.red, fontWeight: "600" },
  defaultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 3,
  },
  defaultKey: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  defaultVal: { color: colors.text, fontSize: 14, flexShrink: 1, textAlign: "right" },
});
