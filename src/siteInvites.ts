// Site invites from Invites & approvals (app 1.6.0+, server 0.33+).
// Pure helpers so the form's rules can be unit-tested without React Native.
// The server (services.parse_site_invite_emails / classify_site_invite) has
// the final say; these only shape what the app sends and shows.

export type SiteInviteStatus = "sent" | "exists" | "invalid" | "other_director";

/** Same splitting as the server: commas, semicolons or new lines; trimmed,
 *  lower-cased, duplicates dropped (first one wins). */
export function parseInviteEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const email = part.trim().toLowerCase();
    if (email && !seen.has(email)) {
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}

/** A first/last name only makes sense for one person — with several
 *  addresses the name boxes are disabled and nothing is sent for them. */
export function namesApply(emails: string[]): boolean {
  return emails.length === 1;
}

export interface SiteInvitePayload {
  emails: string;
  first_name?: string;
  last_name?: string;
  director_id?: number;
}

export function buildInvitePayload({
  emailText,
  firstName,
  lastName,
  directorId,
  canChooseDirector,
}: {
  emailText: string;
  firstName: string;
  lastName: string;
  directorId: number | null;
  canChooseDirector: boolean;
}): SiteInvitePayload {
  const emails = parseInviteEmails(emailText);
  const payload: SiteInvitePayload = { emails: emails.join(", ") };
  if (namesApply(emails)) {
    if (firstName.trim()) payload.first_name = firstName.trim();
    if (lastName.trim()) payload.last_name = lastName.trim();
  }
  // Directors always invite under themselves; the server ignores the field
  // for them anyway, so only an admin's pick is sent.
  if (canChooseDirector && directorId != null) payload.director_id = directorId;
  return payload;
}

/** Badge text + tone for one address's outcome. Unknown statuses (a newer
 *  server) fall back to the server's message with a neutral badge. */
export function inviteResultBadge(status: string): {
  text: string;
  tone: "good" | "caution" | "bad" | "neutral";
} {
  switch (status) {
    case "sent":
      return { text: "SENT", tone: "good" };
    case "exists":
      return { text: "HAS AN ACCOUNT", tone: "neutral" };
    case "invalid":
      return { text: "INVALID", tone: "bad" };
    case "other_director":
      return { text: "NOT SENT", tone: "caution" };
    default:
      return { text: status.toUpperCase(), tone: "neutral" };
  }
}

/** One-line summary above the per-address list. */
export function inviteSummary(results: { status: string }[]): string {
  const sent = results.filter((r) => r.status === "sent").length;
  const notSent = results.length - sent;
  if (results.length === 0) return "";
  if (notSent === 0) return sent === 1 ? "Invite sent." : `${sent} invites sent.`;
  if (sent === 0) return results.length === 1 ? "Not sent." : "None sent.";
  return `${sent} sent, ${notSent} not sent.`;
}
