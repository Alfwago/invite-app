import { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { API_BASE, ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import type { PlayerType, ProfilePatch } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { Badge, Button, Card } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

const CREST = require("@/assets/brand/crest.jpg");

export default function ProfileScreen() {
  const { me, refreshMe } = useAuth();
  const [editing, setEditing] = useState(false);

  // Pick up a verify-in-browser or director-side change when the tab regains focus.
  const unverified = !!me && !me.email_verified;
  useFocusEffect(
    useCallback(() => {
      if (unverified) refreshMe();
    }, [unverified, refreshMe]),
  );

  const resend = useMutation({
    mutationFn: () => api.resendVerification(),
    onSuccess: (r) =>
      Alert.alert(
        r.already_verified ? "Already verified" : "Check your email",
        r.already_verified
          ? "Your email is already verified."
          : "We sent a new verification link. Open it, then come back — this screen updates automatically.",
      ),
    onError: (e) =>
      Alert.alert("Couldn't send", e instanceof ApiError ? e.detail : "Try again later."),
  });

  if (!me) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const m = me.metrics;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.idRow}>
          <Image source={CREST} style={styles.crest} />
          <View style={styles.idText}>
            <Text style={styles.name}>{me.full_name || me.username}</Text>
            <Text style={styles.muted}>@{me.username}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.muted} numberOfLines={1}>
                {me.email}
              </Text>
              {me.email_verified ? (
                <Badge text="VERIFIED" tone="good" />
              ) : (
                <Badge text="UNVERIFIED" tone="caution" />
              )}
            </View>
          </View>
        </View>
        <View style={styles.badges}>
          {me.is_director ? <Badge text="DIRECTOR" tone="gold" /> : null}
          <Badge text={PLAYER_TYPE_LABEL[me.player_type]} tone="neutral" />
          {me.skill_assessment ? <Badge text={`SKILL ${me.skill_assessment}`} tone="neutral" /> : null}
        </View>
        {!me.email_verified ? (
          <View style={styles.verifyBox}>
            <Text style={styles.warn}>Your email isn&apos;t verified — you can&apos;t RSVP yet.</Text>
            <Button
              label="Resend verification email"
              variant="secondary"
              onPress={() => resend.mutate()}
              loading={resend.isPending}
            />
          </View>
        ) : null}
        {!me.director_approved && !me.is_director ? (
          <Text style={styles.warn}>Your account is awaiting director approval.</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.heading}>Player metrics</Text>
        <View style={styles.tiles}>
          <StatTile value={m.years_in_obh ?? "—"} label="Years in OBH" />
          <StatTile value={m.invited_count} label="Invites" />
          <StatTile value={m.yes_count} label="Yes RSVPs" />
        </View>
        <View style={styles.tiles}>
          <StatTile
            value={m.attendance_pct != null ? `${m.attendance_pct}%` : "—"}
            label="Attendance"
          />
          <StatTile value={m.beer_guy_count} label="Beer Guy" />
          <StatTile value={m.whiskey_guy_count} label="Whiskey Guy" />
        </View>
        {m.invites_by_night.length > 0 ? (
          <>
            <Text style={styles.subLabel}>Invites by night</Text>
            {m.invites_by_night.map((n) => (
              <View key={n.name} style={styles.kv}>
                <Text style={styles.kvKey}>{n.name}</Text>
                <Text style={styles.kvVal}>{n.count}</Text>
              </View>
            ))}
          </>
        ) : null}
      </Card>

      {editing ? (
        <EditProfileCard
          me={me}
          onDone={async () => {
            await refreshMe();
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <Text style={styles.heading}>Profile</Text>
          <ReadRow k="First name" v={me.first_name || "—"} />
          <ReadRow k="Last name" v={me.last_name || "—"} />
          <ReadRow k="Email" v={me.email} />
          <ReadRow k="OBH starting year" v={me.join_year != null ? String(me.join_year) : "—"} />
          <ReadRow k="Phone" v={me.phone_number || "—"} />
          <ReadRow k="Text alerts" v={me.sms_opt_in ? "On" : "Off"} />
          <ReadRow
            k="Provider"
            v={choiceLabel(me.profile_choices?.sms_provider, me.sms_provider)}
          />
          <ReadRow
            k="Self skill"
            v={choiceLabel(me.profile_choices?.skill_assessment, me.skill_assessment)}
          />
          <ReadRow k="Player type" v={PLAYER_TYPE_LABEL[me.player_type]} />
          <Button label="Edit profile" variant="secondary" onPress={() => setEditing(true)} />
        </Card>
      )}

      <AccountCard verified={me.email_verified} approved={me.director_approved || me.is_director} username={me.username} />

      <Text style={styles.server}>{API_BASE}</Text>
    </ScrollView>
  );
}

// ── edit form ──────────────────────────────────────────────────────────
function EditProfileCard({
  me,
  onDone,
  onCancel,
}: {
  me: NonNullable<ReturnType<typeof useAuth>["me"]>;
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [first, setFirst] = useState(me.first_name);
  const [last, setLast] = useState(me.last_name);
  const [email, setEmail] = useState(me.email);
  const [year, setYear] = useState(me.join_year != null ? String(me.join_year) : "");
  const [phone, setPhone] = useState(me.phone_number);
  const [smsOptIn, setSmsOptIn] = useState(me.sms_opt_in);
  const [provider, setProvider] = useState(me.sms_provider);
  const [skill, setSkill] = useState(me.skill_assessment);
  const [ptype, setPtype] = useState<PlayerType>(me.player_type);
  const [error, setError] = useState<string | null>(null);

  const providerChoices = me.profile_choices?.sms_provider ?? [];
  const skillChoices = me.profile_choices?.skill_assessment ?? [];
  const typeChoices = me.profile_choices?.player_type ?? [];

  const save = useMutation({
    mutationFn: (patch: ProfilePatch) => api.updateMe(patch),
    onSuccess: async (fresh) => {
      if (fresh.email_reverification_sent) {
        Alert.alert(
          "Verify your new email",
          "We sent a verification link to your new address. You can't RSVP until it's confirmed.",
        );
      }
      await onDone();
    },
    onError: (e) => setError(e instanceof ApiError ? e.detail : "Couldn't save."),
  });

  function submit() {
    setError(null);
    if (year && !/^\d{4}$/.test(year.trim())) {
      setError("Starting year must be a 4-digit year, or blank.");
      return;
    }
    save.mutate({
      first_name: first.trim(),
      last_name: last.trim(),
      email: email.trim(),
      join_year: year.trim() ? Number(year) : null,
      phone_number: phone.trim(),
      sms_opt_in: smsOptIn,
      sms_provider: provider,
      skill_assessment: skill,
      player_type: ptype,
    });
  }

  return (
    <Card>
      <Text style={styles.heading}>Edit profile</Text>

      <Field label="First name">
        <TextInput style={styles.input} value={first} onChangeText={setFirst} />
      </Field>
      <Field label="Last name">
        <TextInput style={styles.input} value={last} onChangeText={setLast} />
      </Field>
      <Field label="Email">
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.hint}>Changing your email requires re-verification.</Text>
      </Field>
      <Field label="OBH starting year">
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          placeholder="YYYY"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Phone number">
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </Field>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Receive SMS messages</Text>
        <Switch
          value={smsOptIn}
          onValueChange={setSmsOptIn}
          trackColor={{ true: colors.gold, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      <Field label="Provider">
        <ChoiceChips
          choices={providerChoices}
          value={provider}
          onChange={setProvider}
          allowClear
        />
      </Field>
      <Field label="Self skill assessment">
        <ChoiceChips choices={skillChoices} value={skill} onChange={setSkill} allowClear />
      </Field>
      <Field label="Player type">
        <ChoiceChips
          choices={typeChoices}
          value={ptype}
          onChange={(v) => setPtype(v as PlayerType)}
        />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Save changes" onPress={submit} loading={save.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={save.isPending} />
    </Card>
  );
}

function AccountCard({
  verified,
  approved,
  username,
}: {
  verified: boolean;
  approved: boolean;
  username: string;
}) {
  const reset = useMutation({
    mutationFn: () => api.requestPasswordReset(),
    onSuccess: () =>
      Alert.alert("Check your email", "We sent a password reset link to your address."),
    onError: (e) =>
      Alert.alert("Couldn't send", e instanceof ApiError ? e.detail : "Try again later."),
  });

  return (
    <Card>
      <Text style={styles.heading}>Account</Text>
      <ReadRow k="Username" v={username} />
      <View style={styles.kv}>
        <Text style={styles.kvKey}>Approval</Text>
        <Badge text={approved ? "APPROVED" : "PENDING"} tone={approved ? "good" : "caution"} />
      </View>
      <View style={styles.kv}>
        <Text style={styles.kvKey}>Email verification</Text>
        <Badge text={verified ? "VERIFIED" : "UNVERIFIED"} tone={verified ? "good" : "caution"} />
      </View>
      <Button
        label="Send password reset email"
        variant="secondary"
        onPress={() => reset.mutate()}
        loading={reset.isPending}
      />
    </Card>
  );
}

// ── bits ───────────────────────────────────────────────────────────────
const PLAYER_TYPE_LABEL: Record<PlayerType, string> = {
  non_playing: "Non-playing member",
  skater: "Skater",
  goalie: "Goalie",
  goalie_skater: "Goalie & Skater",
};

function choiceLabel(choices: { value: string; label: string }[] | undefined, value: string) {
  if (!value) return "—";
  return choices?.find((c) => c.value === value)?.label ?? value;
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function ReadRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChoiceChips({
  choices,
  value,
  onChange,
  allowClear,
}: {
  choices: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  allowClear?: boolean;
}) {
  const opts = choices.filter((c) => c.value !== "" || !allowClear);
  return (
    <View style={styles.chips}>
      {opts.map((c) => {
        const on = value === c.value;
        return (
          <Pressable
            key={c.value || "none"}
            onPress={() => onChange(allowClear && on ? "" : c.value)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  idRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  crest: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idText: { flexShrink: 1, gap: 2 },
  name: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  emailRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  muted: { color: colors.textMuted },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  warn: { color: colors.amber, fontWeight: "600" },
  verifyBox: { gap: spacing.sm },

  heading: { color: colors.gold, fontSize: font.md, fontWeight: "800" },
  subLabel: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
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
  tileLabel: {
    marginTop: spacing.xs,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    textAlign: "center",
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kvKey: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  kvVal: { color: colors.text, fontSize: font.sm, flexShrink: 1, textAlign: "right" },

  field: { gap: spacing.xs },
  fieldLabel: {
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
  hint: { color: colors.textMuted, fontSize: font.sm },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  toggleLabel: { color: colors.text, fontSize: 15 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  chipOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  chipText: { color: colors.textMuted, fontSize: font.sm, fontWeight: "600" },
  chipTextOn: { color: colors.gold },

  error: { color: colors.red, fontWeight: "600" },
  server: { color: colors.textMuted, fontSize: font.xs, textAlign: "center", opacity: 0.7 },
});
