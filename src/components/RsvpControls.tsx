import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import type { EventDetail, RsvpBody } from "@/src/api/types";
import { ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { useAuth } from "@/src/auth/AuthContext";
import { Button, Card } from "@/src/components/ui";
import { useRsvp } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";
import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";

const CHOICES: RsvpBody["status"][] = ["YES", "NO", "MAYBE"];

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
  const [choice, setChoice] = useState<RsvpBody["status"]>(
    current && CHOICES.includes(current.status as RsvpBody["status"])
      ? (current.status as RsvpBody["status"])
      : "YES",
  );
  const [asGoalie, setAsGoalie] = useState(current?.is_goalie ?? me?.is_goalie ?? false);
  const [beerGuy, setBeerGuy] = useState(current?.is_beer_guy ?? false);
  const [whiskeyGuy, setWhiskeyGuy] = useState(current?.is_whiskey_guy ?? false);
  const [notices, setNotices] = useState<string[]>([]);

  const showGoalieToggle = choice === "YES" && !!me?.is_goalie_skater;
  const showBeer = choice === "YES" && event.beer_guy_enabled;
  const showWhiskey = choice === "YES" && event.whiskey_guy_enabled;

  async function submit() {
    setNotices([]);
    const body: RsvpBody = { status: choice };
    if (choice === "YES") {
      if (me?.is_goalie_skater) body.is_goalie = asGoalie;
      if (event.beer_guy_enabled) body.beer_guy = beerGuy;
      if (event.whiskey_guy_enabled) body.whiskey_guy = whiskeyGuy;
    }
    try {
      const fresh = await rsvp.mutateAsync(body);
      setNotices(fresh.notices ?? []);
    } catch {
      // error surfaced below via rsvp.error
    }
  }

  const errText =
    rsvp.error instanceof ApiError ? rsvp.error.detail : rsvp.isError ? "Couldn't save your RSVP." : null;

  if (blockedUnverified) {
    return (
      <Card>
        <Text style={styles.heading}>Your RSVP</Text>
        <Text style={styles.error}>
          Verify your email address before you can RSVP.
        </Text>
        <Button
          label="Resend verification email"
          variant="secondary"
          onPress={() => resend.mutate()}
          loading={resend.isPending}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.heading}>Your RSVP</Text>

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

      {errText ? <Text style={styles.error}>{errText}</Text> : null}
      {notices.map((n) => (
        <Text key={n} style={styles.notice}>
          {n}
        </Text>
      ))}

      <Button label="Save RSVP" onPress={submit} loading={rsvp.isPending} />
      {current ? (
        <Text style={styles.currentLine}>
          Currently: {current.status.replace("_", " ")}
          {current.is_goalie ? " (goalie)" : ""}
        </Text>
      ) : null}
    </Card>
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
  heading: { color: colors.text, fontSize: 16, fontWeight: "700" },
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
});
