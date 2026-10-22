// Communications → Invite list (1.8.0, matching the website's 0.39.0 tab,
// owner 2026-10-21): one status per row with its badge, and filter chips with
// counts. Same keys and words as the website (admin_event_detail.html).

export type InviteFilter =
  | "all"
  | "going"
  | "maybe"
  | "cant"
  | "waitlist"
  | "noreply"
  | "notsent"
  | "other";

export type InviteTone = "good" | "info" | "bad" | "gold" | "neutral" | "unsent";

interface Row {
  status: string;
  sent_at: string | null;
  from_group?: string;
}

const STATUS: Record<string, { key: InviteFilter; label: string; tone: InviteTone }> = {
  YES: { key: "going", label: "Going", tone: "good" },
  MAYBE: { key: "maybe", label: "Maybe", tone: "info" },
  NO: { key: "cant", label: "Can't make it", tone: "bad" },
  WAITLIST: { key: "waitlist", label: "Waitlisted", tone: "gold" },
};

/** The row's status: an RSVP, else No reply (sent) or Not sent. */
export function inviteStatus(row: Row): { key: InviteFilter; label: string; tone: InviteTone } {
  const known = STATUS[row.status];
  if (known) return known;
  return row.sent_at
    ? { key: "noreply", label: "No reply", tone: "neutral" }
    : { key: "notsent", label: "Not sent", tone: "unsent" };
}

export function matchesFilter(row: Row, filter: InviteFilter): boolean {
  if (filter === "all") return true;
  if (filter === "other") return !!row.from_group;
  return inviteStatus(row).key === filter;
}

const CHIPS: [InviteFilter, string][] = [
  ["all", "All"],
  ["going", "Going"],
  ["maybe", "Maybe"],
  ["cant", "Can't"],
  ["waitlist", "Waitlisted"],
  ["noreply", "No reply"],
  ["notsent", "Not sent"],
  ["other", "Other groups"],
];

/** Chips with counts; empty ones are left out (All always shows). */
export function filterChips(rows: Row[]): { key: InviteFilter; label: string; count: number }[] {
  return CHIPS.map(([key, label]) => ({ key, label, count: rows.filter((r) => matchesFilter(r, key)).length })).filter(
    (c) => c.key === "all" || c.count > 0,
  );
}

/** The Remove confirm: warns when the player is Going (they lose their spot). */
export function removeConfirmText(name: string, status: string): string {
  const going = status === "YES" ? " They're marked Going and will lose their spot." : "";
  return `Remove ${name} from the invite list?${going}`;
}
