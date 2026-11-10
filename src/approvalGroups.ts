// Invites & approvals, grouped by approving director (1.8.1, owner
// 2026-11-10) like the website's Pending Approvals: your own group first,
// then the rest by name. Directors only ever see their own, so this matters
// for admins, who see everyone's.

export interface ApprovalGroup<T> {
  key: string;
  director: string;
  mine: boolean;
  items: T[];
}

interface Groupable {
  sponsor: string;
  sponsor_id?: number | null;
}

export function groupBySponsor<T extends Groupable>(rows: T[], meId: number | null | undefined): ApprovalGroup<T>[] {
  const groups = new Map<string, ApprovalGroup<T>>();
  for (const row of rows) {
    // An older server has no sponsor_id: group by name instead.
    const key = row.sponsor_id != null ? `id:${row.sponsor_id}` : `name:${row.sponsor}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        director: row.sponsor || "No director",
        mine: meId != null && row.sponsor_id === meId,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(row);
  }
  return [...groups.values()].sort(
    (a, b) => Number(b.mine) - Number(a.mine) || a.director.localeCompare(b.director),
  );
}
