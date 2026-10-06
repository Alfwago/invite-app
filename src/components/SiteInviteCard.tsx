import { useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "@/src/api/client";
import type { SiteInviteOptions, SiteInviteResult } from "@/src/api/types";
import { Badge, Button, Card } from "@/src/components/ui";
import { Dropdown } from "@/src/components/Dropdown";
import { useSendSiteInvites } from "@/src/hooks/queries";
import {
  buildInvitePayload,
  inviteResultBadge,
  inviteSummary,
  namesApply,
  parseInviteEmails,
} from "@/src/siteInvites";
import { colors, font, radius, spacing } from "@/src/theme";

/** Invite people to set up an account (Invites & approvals, director-only).
 *  Same rules as the website's "Site invite": directors invite under
 *  themselves; admins pick the approving director. Each address gets its own
 *  result — some may send while others are refused. */
export function SiteInviteCard({ options }: { options: SiteInviteOptions }) {
  const send = useSendSiteInvites();
  const [emailText, setEmailText] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [directorId, setDirectorId] = useState<string | null>(
    options.can_choose_director ? String(options.default_director_id) : null,
  );
  const [results, setResults] = useState<SiteInviteResult[] | null>(null);
  const [resultDirector, setResultDirector] = useState("");
  const [error, setError] = useState("");

  const emails = parseInviteEmails(emailText);
  const nameOk = emails.length <= 1;
  const directorOptions = options.directors.map((d) => ({ value: String(d.id), label: d.name }));

  const onSend = () => {
    if (emails.length === 0) return;
    Keyboard.dismiss();
    setError("");
    const payload = buildInvitePayload({
      emailText,
      firstName,
      lastName,
      directorId: directorId ? Number(directorId) : null,
      canChooseDirector: options.can_choose_director,
    });
    send.mutate(payload, {
      onSuccess: (data) => {
        setResults(data.results);
        setResultDirector(
          data.director.id === options.default_director_id ? "" : data.director.name,
        );
        // Keep only the typos so they can be fixed and re-sent; the rest
        // (sent, has an account, someone else's invitee) are done here.
        const leftOver = data.results.filter((r) => r.status === "invalid").map((r) => r.email);
        setEmailText(leftOver.join(", "));
        if (leftOver.length === 0) {
          setFirstName("");
          setLastName("");
        }
      },
      onError: (e) => setError(e instanceof ApiError ? e.detail : "Couldn't send. Try again."),
    });
  };

  return (
    <Card>
      <Text style={styles.meta}>
        They get an email link to set up a username and password.
        {options.can_choose_director
          ? " Their approval goes to the director you pick."
          : " You're their approving director."}
      </Text>

      <TextInput
        style={[styles.input, styles.emails]}
        placeholder="Email(s), separated by commas"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        multiline
        value={emailText}
        onChangeText={setEmailText}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half, !nameOk && styles.disabled]}
          placeholder="First name"
          placeholderTextColor={colors.textMuted}
          editable={nameOk}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={[styles.input, styles.half, !nameOk && styles.disabled]}
          placeholder="Last name"
          placeholderTextColor={colors.textMuted}
          editable={nameOk}
          value={lastName}
          onChangeText={setLastName}
        />
      </View>
      <Text style={styles.meta}>
        {namesApply(emails) || emails.length === 0
          ? "Name is optional."
          : "A name is only used when you invite one email."}
      </Text>

      {options.can_choose_director ? (
        <>
          <Text style={styles.label}>Approving director</Text>
          <Dropdown
            options={directorOptions}
            value={directorId}
            onChange={setDirectorId}
            placeholder="Select a director"
          />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={emails.length > 1 ? `Send ${emails.length} invites` : "Send invite"}
        onPress={onSend}
        loading={send.isPending}
        disabled={emails.length === 0}
      />

      {results ? (
        <View style={styles.results}>
          <Text style={styles.summary}>
            {inviteSummary(results)}
            {resultDirector && results.some((r) => r.status === "sent")
              ? ` Approval goes to ${resultDirector}.`
              : ""}
          </Text>
          {results.map((r) => {
            const badge = inviteResultBadge(r.status);
            return (
              <View key={r.email} style={styles.resultRow}>
                <View style={styles.resultText}>
                  <Text style={styles.resultEmail} numberOfLines={1}>
                    {r.email}
                  </Text>
                  {r.status !== "sent" && r.message ? (
                    <Text style={styles.meta}>{r.message}</Text>
                  ) : null}
                </View>
                <Badge text={badge.text} tone={badge.tone} />
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.textMuted, fontSize: font.sm },
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: "600" },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  input: {
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  emails: { minHeight: 64, textAlignVertical: "top" },
  disabled: { opacity: 0.4 },
  error: { color: colors.red, fontWeight: "600" },
  results: { gap: spacing.sm, marginTop: spacing.xs },
  summary: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  resultText: { flex: 1, gap: 2 },
  resultEmail: { color: colors.text, fontSize: font.sm },
});
