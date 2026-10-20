import type { Candidate } from "./api/types.ts";

/** One skate group in the invite picker (server 0.38.0 #3). */
export interface InviteGroup {
  key: string;
  name: string;
  /** Who can still be invited. */
  members: Candidate[];
  /** Already on the invite list: shown ticked and greyed (owner 2026-10-20:
   *  every night's list is visible, not only groups with people left). */
  invited: { id: number; name: string }[];
}

export interface ServerInviteGroup {
  id: number | null;
  name: string;
  member_ids: number[];
  members?: { id: number; name: string }[];
}

/** Every group from the server's `invite_groups`, split into who can still
 *  be invited and who already is. An older server sends no groups: one flat
 *  list. */
export function buildInviteGroups(
  invitable: Candidate[],
  groups: ServerInviteGroup[] | undefined,
  invitedIds: number[] = [],
): InviteGroup[] {
  if (!groups || groups.length === 0) {
    return invitable.length ? [{ key: "all", name: "Players", members: invitable, invited: [] }] : [];
  }
  const byId = new Map(invitable.map((c) => [c.id, c]));
  const invited = new Set(invitedIds);
  return groups
    .map((g) => {
      const names = new Map((g.members ?? []).map((m) => [m.id, m.name]));
      return {
        key: String(g.id ?? "rest"),
        name: g.name,
        members: g.member_ids.map((id) => byId.get(id)).filter((c): c is Candidate => !!c),
        invited: g.member_ids
          .filter((id) => !byId.has(id) && invited.has(id))
          .map((id) => ({ id, name: names.get(id) ?? "" })),
      };
    })
    .filter((g) => g.members.length > 0 || g.invited.length > 0);
}

export type GroupState = "all" | "some" | "none";

export function groupState(members: Candidate[], picked: Set<number>): GroupState {
  if (members.length === 0) return "all"; // everyone's already invited
  const n = members.filter((m) => picked.has(m.id)).length;
  return n === 0 ? "none" : n === members.length ? "all" : "some";
}

/** "All of <group>": pick everyone in it, or clear them if they're all picked. */
export function toggleGroup(picked: number[], members: Candidate[]): number[] {
  const set = new Set(picked);
  const all = members.every((m) => set.has(m.id));
  for (const m of members) {
    if (all) set.delete(m.id);
    else set.add(m.id);
  }
  return [...set];
}

export function matches(c: Candidate, term: string): boolean {
  const t = term.trim().toLowerCase();
  return !t || c.name.toLowerCase().includes(t);
}
