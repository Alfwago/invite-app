// Pure logic for polls by skate group (server 0.36.0 / app 1.7.1) — no
// React Native imports, so it runs under `npm test`.
//
// Owner 2026-10-15: a poll is for Everyone (Global) or one or more skate
// groups; directors pick the groups they run; "Notify" sends email + push +
// an inbox message; players see results only after a poll closes. An older
// server sends no `pickable_nights`, ignores `night_ids` / `notify`, and has
// no closed-poll results — the app hides those controls then.

import type { ManagePollsResponse, NewPoll, Poll, PollNight, PollSummary } from "./api/types.ts";

export type Audience = "everyone" | "groups";

/** The server knows about poll groups (0.36.0+). */
export function supportsPollGroups(resp: ManagePollsResponse | undefined): boolean {
  return !!resp && Array.isArray(resp.pickable_nights);
}

/** "Everyone", "Monday Mules" or "Mon · Thu" (short labels when 3+). Empty
 *  string when the server didn't say (older server) — show nothing then. */
export function audienceLabel(p: Pick<Poll | PollSummary, "nights" | "audience_label">): string {
  if (!p.nights) return "";
  if (p.nights.length === 0) return "Everyone";
  if (p.nights.length <= 2) return p.nights.map((n) => n.name).join(", ");
  return p.nights.map((n) => n.short_label || n.name).join(" · ");
}

/** Group ids that are still pickable (drops anything no longer offered). */
export function cleanPicked(picked: number[], pickable: PollNight[]): number[] {
  const ok = new Set(pickable.map((n) => n.id));
  return picked.filter((id) => ok.has(id));
}

/** Can the form be sent? "Skate groups" needs at least one group. */
export function audienceValid(audience: Audience, picked: number[]): boolean {
  return audience === "everyone" || picked.length > 0;
}

/**
 * The body for POST /api/director/polls/. On an older server (no group
 * support) neither `night_ids` nor `notify` is sent, so nothing pretends to
 * have happened.
 */
export function newPollBody(
  base: Omit<NewPoll, "night_ids" | "notify" | "show_names">,
  opts: { groupsSupported: boolean; audience: Audience; picked: number[]; notify: boolean; showNames?: boolean },
): NewPoll {
  if (!opts.groupsSupported) return base;
  return {
    ...base,
    night_ids: opts.audience === "groups" ? [...opts.picked].sort((a, b) => a - b) : [],
    notify: opts.notify,
    // Names shown (server 0.36.2+); Anonymous is the default, so only sent when on.
    ...(opts.showNames ? { show_names: true } : {}),
  };
}

/** "Sent to 23 players." after a create with Notify on. */
export function notifiedText(n: { recipients: number } | undefined): string | null {
  if (!n) return null;
  if (n.recipients === 0) return "Nobody to notify yet.";
  return `Sent to ${n.recipients} player${n.recipients === 1 ? "" : "s"}.`;
}
