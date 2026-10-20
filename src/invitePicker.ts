import type { Candidate } from "./api/types.ts";

/** One skate group in the invite picker (server 0.38.0 #3). */
export interface InviteGroup {
  key: string;
  name: string;
  members: Candidate[];
}

/** Groups from the server's `invite_groups`, each limited to people who can
 *  still be invited. An older server sends no groups: one flat list. */
export function buildInviteGroups(
  invitable: Candidate[],
  groups: { id: number | null; name: string; member_ids: number[] }[] | undefined,
): InviteGroup[] {
  if (!groups || groups.length === 0) {
    return invitable.length ? [{ key: "all", name: "Players", members: invitable }] : [];
  }
  const byId = new Map(invitable.map((c) => [c.id, c]));
  return groups
    .map((g) => ({
      key: String(g.id ?? "rest"),
      name: g.name,
      members: g.member_ids.map((id) => byId.get(id)).filter((c): c is Candidate => !!c),
    }))
    .filter((g) => g.members.length > 0);
}

export type GroupState = "all" | "some" | "none";

export function groupState(members: Candidate[], picked: Set<number>): GroupState {
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
