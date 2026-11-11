// Invites & approvals, grouped by approving director (1.8.1, owner
// 2026-11-10) like the website's Pending Approvals: your own group first,
// then the rest by name. Directors only ever see their own, so this matters
// for admins, who see everyone's.

export interface ApprovalGroup<T> {
  key: string;
  director: string;
  mine: boolean;
  items: T[];
  /** Finished setup, waiting on a director (1.8.2): listed first, counted green. */
  readyCount: number;
}

interface Groupable {
  sponsor: string;
  sponsor_id?: number | null;
  account_ready: boolean;
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
        readyCount: 0,
      };
      groups.set(key, group);
    }
    group.items.push(row);
  }
  // Ready to approve first, like the website's Pending Approvals (0.40.10);
  // sort is stable, so each part keeps the server's order.
  for (const group of groups.values()) {
    group.items.sort((a, b) => Number(b.account_ready) - Number(a.account_ready));
    group.readyCount = group.items.filter((r) => r.account_ready).length;
  }
  return [...groups.values()].sort(
    (a, b) => Number(b.mine) - Number(a.mine) || a.director.localeCompare(b.director),
  );
}
