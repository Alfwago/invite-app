import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type { EventDetail, RsvpBody, RsvpGuest } from "@/src/api/types";
import { ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/ui";
import { useRsvp } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";
import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";

const CHOICES: RsvpBody["status"][] = ["YES", "NO", "MAYBE"];
const SKILLS: RsvpGuest["skill"][] = ["A", "B", "C", "D"];
const MAX_GUESTS = 10;

// Selected-choice colour for the segmented control (a decision indicator,
// not a roster-health signal).
const CHOICE_COLOR: Record<RsvpBody["status"], string> = {
  YES: colors.green,
  MAYBE: colors.amber,
  NO: colors.red,
};

export function RsvpControls({ event }: { event: EventDetail }) {
  const { me, refreshMe } = useAuth();
  const rsvp = useRsvp(event.id);

  const blockedUnverified = !!me && !me.email_verified && !me.is_director;
  const resend = useMutation({
    mutationFn: () => api.resendVerification(),
    onSuccess: () => {
      Alert.alert("Check your email", "Open the verification link, then reopen this event.");
      refreshMe();
    },
    onError: () => Alert.alert("Couldn't send", "Try again from your Profile."),
  });

  const current = event.my_rsvp;
  const [editing, setEditing] = useState(!current);
  const locked = !!current && !editing;
  const [choice, setChoice] = useState<RsvpBody["status"]>(
    current && CHOICES.includes(current.status as RsvpBody["status"])
      ? (current.status as RsvpBody["status"])
      : "YES",
  );
  const [asGoalie, setAsGoalie] = useState(current?.is_goalie ?? me?.is_goalie ?? false);
  const [beerGuy, setBeerGuy] = useState(current?.is_beer_guy ?? false);
  const [whiskeyGuy, setWhiskeyGuy] = useState(current?.is_whiskey_guy ?? false);
  const [guests, setGuests] = useState<RsvpGuest[]>(current?.guests ?? []);
  const [notices, setNotices] = useState<string[]>([]);

  const showGoalieToggle = choice === "YES" && !!me?.is_goalie_skater;
  const showBeer = choice === "YES" && event.beer_guy_enabled;
  const showWhiskey = choice === "YES" && event.whiskey_guy_enabled;
  const showGuests = choice === "YES" && event.allow_guests;

  function setGuest(i: number, patch: Partial<RsvpGuest>) {
    setGuests((g) => g.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addGuest() {
    setGuests((g) => (g.length >= MAX_GUESTS ? g : [...g, { name: "", skill: "C" }]));
  }
  function removeGuest(i: number) {
    setGuests((g) => g.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setNotices([]);
    const body: RsvpBody = { status: choice };
    if (choice === "YES") {
      if (me?.is_goalie_skater) body.is_goalie = asGoalie;
      if (event.beer_guy_enabled) body.beer_guy = beerGuy;
      if (event.whiskey_guy_enabled) body.whiskey_guy = whiskeyGuy;
      if (event.allow_guests) {
        const named = guests.map((g) => ({ ...g, name: g.name.trim() })).filter((g) => g.name);
        body.guests = named;
        body.guest_count = named.length;
      }
    }
    try {
      const fresh = await rsvp.mutateAsync(body);
      setNotices(fresh.notices ?? []);
      setEditing(false);
    } catch {
      // error surfaced below via rsvp.error
    }
  }

  const errText =
    rsvp.error instanceof ApiError ? rsvp.error.detail : rsvp.isError ? "Couldn't save your RSVP." : null;

  if (blockedUnverified) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.error}>
          Verify your email address before you can RSVP.
        </Text>
        <Button
          label="Resend verification email"
          variant="secondary"
          onPress={() => resend.mutate()}
          loading={resend.isPending}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {locked ? (
        <Text style={styles.currentLine}>
          You&apos;re in as {current!.status.replace("_", " ")}
          {current!.is_goalie ? " (goalie)" : ""}
          {current!.guest_count > 0 ? ` +${current!.guest_count} guest${current!.guest_count === 1 ? "" : "s"}` : ""}
        </Text>
      ) : null}

      <View
        style={[styles.controls, locked && styles.lockedControls]}
        pointerEvents={locked ? "none" : "auto"}
      >
      <View style={styles.segment}>
        {CHOICES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setChoice(c)}
            style={[
              styles.segmentItem,
              choice === c && { backgroundColor: CHOICE_COLOR[c], borderColor: CHOICE_COLOR[c] },
            ]}
          >
            <Text style={[styles.segmentText, choice === c && { color: colors.goldText }]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      {showGoalieToggle ? (
        <ToggleRow label="Playing goalie" value={asGoalie} onChange={setAsGoalie} />
      ) : null}
      {showBeer ? <ToggleRow label="I can be Beer Guy" value={beerGuy} onChange={setBeerGuy} /> : null}
      {showWhiskey ? (
        <ToggleRow label="I can be Whiskey Guy" value={whiskeyGuy} onChange={setWhiskeyGuy} />
      ) : null}

      {showGuests ? (
        <View style={styles.guests}>
          <View style={styles.guestHead}>
            <Text style={styles.guestTitle}>Guests ({guests.length})</Text>
            <Pressable
              onPress={addGuest}
              disabled={guests.length >= MAX_GUESTS}
              style={[styles.addGuest, guests.length >= MAX_GUESTS && { opacity: 0.4 }]}
            >
              <Text style={styles.addGuestText}>+ Add guest</Text>
            </Pressable>
          </View>
          {guests.map((g, i) => (
            <View key={i} style={styles.guestRow}>
              <View style={styles.guestTop}>
                <TextInput
                  style={styles.guestInput}
                  value={g.name}
                  onChangeText={(t) => setGuest(i, { name: t })}
                  placeholder={`Guest ${i + 1} name`}
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable onPress={() => removeGuest(i)} hitSlop={8}>
                  <Text style={styles.removeGuest}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.skillRow}>
                {SKILLS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setGuest(i, { skill: s })}
                    style={[styles.skillChip, g.skill === s && styles.skillChipOn]}
                  >
                    <Text style={[styles.skillText, g.skill === s && styles.skillTextOn]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      </View>

      {errText ? <Text style={styles.error}>{errText}</Text> : null}
      {notices.map((n) => (
        <Text key={n} style={styles.notice}>
          {n}
        </Text>
      ))}

      {locked ? (
        <Button label="Change RSVP" variant="secondary" onPress={() => setEditing(true)} />
      ) : (
        <>
          <Button
            label={current ? "Save changes" : "Save RSVP"}
            onPress={submit}
            loading={rsvp.isPending}
          />
          {current ? (
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setChoice(
                  CHOICES.includes(current.status as RsvpBody["status"])
                    ? (current.status as RsvpBody["status"])
                    : "YES",
                );
                setAsGoalie(current.is_goalie);
                setBeerGuy(current.is_beer_guy);
                setWhiskeyGuy(current.is_whiskey_guy);
                setGuests(current.guests ?? []);
                setEditing(false);
              }}
            />
          ) : null}
        </>
      )}
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  controls: { gap: spacing.md },
  lockedControls: { opacity: 0.45 },
  segment: { flexDirection: "row", gap: spacing.sm },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  segmentText: { color: colors.text, fontWeight: "700" },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  toggleLabel: { color: colors.text, fontSize: 15 },
  error: { color: colors.red, fontWeight: "600" },
  notice: { color: colors.amber },
  currentLine: { color: colors.textMuted, fontSize: 13, textAlign: "center" },

  guests: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  guestHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  guestTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  addGuest: { paddingVertical: 4, paddingHorizontal: spacing.sm },
  addGuestText: { color: colors.gold, fontWeight: "700", fontSize: 13 },
  guestRow: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  guestTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  guestInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  removeGuest: { color: colors.red, fontSize: 12, fontWeight: "700" },
  skillRow: { flexDirection: "row", gap: spacing.xs },
  skillChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  skillChipOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  skillText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  skillTextOn: { color: colors.gold },
});
