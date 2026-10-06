// "Borrow a Goalie or Skater" (app 1.5.3+, server 0.33+): a director puts a
// player from ANOTHER skate group on this skate's roster as Yes, for this
// skate only. Pure helpers so the picker's rules and copy can be unit-tested
// without React Native. The server (services.borrow_player) enforces every
// rule again and writes the over-capacity warning.

export type BorrowRole = "goalie" | "skater";

export interface BorrowCandidate {
  id: number;
  name: string;
  first_name: string;
  is_goalie: boolean; // pure goalie
  is_goalie_skater: boolean;
  can_goalie: boolean;
  can_skate: boolean;
  home_nights: { id: number; name: string }[];
  /** e.g. "Sun · Thu" — every home skate group. */
  home_label: string;
  /** The first home night; the picker groups each player once, under it. */
  group: string;
}

export interface BorrowPanel {
  available: boolean;
  reason: string;
  night_name?: string;
  event_date?: string; // "Tue Oct 7"
  event_day?: string; // "Oct 7"
  default_role?: BorrowRole;
  warnings?: Record<BorrowRole, string>;
  players: BorrowCandidate[];
}

export interface BorrowResult {
  name: string;
  role: BorrowRole;
  pushed: boolean;
}

/** Who shows under Goalie / Skater, then the name search (case-insensitive). */
export function filterCandidates(
  players: BorrowCandidate[],
  role: BorrowRole,
  query: string,
): BorrowCandidate[] {
  const q = query.trim().toLowerCase();
  return players.filter(
    (p) => (role === "goalie" ? p.can_goalie : p.can_skate) && (!q || p.name.toLowerCase().includes(q)),
  );
}

/**
 * Letters needed before Skater lists anyone (owner's call, 2026-10-06: the
 * league has 100+ players, too many to show at once). Goalie lists every
 * goalie and G/S straight away — there are only a handful.
 */
export const SKATER_MIN_SEARCH = 2;

/** True while Skater is picked and fewer than 2 letters are typed: show the prompt, no rows. */
export function needsSearch(role: BorrowRole, query: string): boolean {
  return role === "skater" && query.trim().length < SKATER_MIN_SEARCH;
}

/** The rows the picker shows: none for Skater until the search is long enough. */
export function visibleCandidates(
  players: BorrowCandidate[],
  role: BorrowRole,
  query: string,
): BorrowCandidate[] {
  return needsSearch(role, query) ? [] : filterCandidates(players, role, query);
}

/** Group rows by home night, keeping the server's order (by weekday, then name). */
export function groupCandidates(players: BorrowCandidate[]): { night: string; players: BorrowCandidate[] }[] {
  const groups: { night: string; players: BorrowCandidate[] }[] = [];
  for (const p of players) {
    const last = groups[groups.length - 1];
    if (last && last.night === p.group) last.players.push(p);
    else groups.push({ night: p.group, players: [p] });
  }
  return groups;
}

/** "G" for a pure goalie, "G/S" for goalie & skater, "" for a skater. */
export function roleMark(p: Pick<BorrowCandidate, "is_goalie" | "is_goalie_skater">): string {
  return p.is_goalie_skater ? "G/S" : p.is_goalie ? "G" : "";
}

/** What a screen reader says for a row: "Sam Lee, goalie, Thursday Night". */
export function candidateA11yLabel(p: BorrowCandidate): string {
  const kind = p.is_goalie_skater ? "goalie or skater" : p.is_goalie ? "goalie" : "skater";
  return [p.name, kind, p.home_nights.map((n) => n.name).join(", ")].filter(Boolean).join(", ");
}

/** The empty line under the list — or "" when there are rows to show. */
export function emptyText(
  players: BorrowCandidate[],
  role: BorrowRole,
  query: string,
): string {
  if (players.length === 0) return "No players from other skate groups are free for this skate.";
  if (filterCandidates(players, role, "").length === 0) {
    return role === "goalie"
      ? "No goalies from other skate groups are free. Try Skater, or add a walk-on goalie below."
      : "No players from other skate groups are free for this skate.";
  }
  if (needsSearch(role, query)) return "Type a name to find a skater from another skate group.";
  if (filterCandidates(players, role, query).length === 0) {
    return `No one named '${query.trim()}' in other skate groups. Not in the app? Add them as a walk-on below.`;
  }
  return "";
}

/** The confirm dialog before adding (one player at a time). */
export function confirmCopy(
  p: BorrowCandidate,
  role: BorrowRole,
  panel: BorrowPanel,
): { title: string; body: string; button: string } {
  const home = p.home_nights[0]?.name;
  const warning = panel.warnings?.[role] ?? "";
  const body =
    `${p.first_name}${home ? ` (${home})` : ""} goes straight onto ${panel.night_name}'s ` +
    `${panel.event_day} roster as Yes, for this skate only. They'll get a push and email now.` +
    (warning ? `\n\n${warning}` : "");
  return {
    title: `Add ${p.name} as ${role}?`,
    body,
    button: `Add & notify ${p.first_name}`,
  };
}

/** After a borrow: "Sam Lee added as goalie, notified." */
export function successText(r: BorrowResult): string {
  return `${r.name} added as ${r.role}, ${r.pushed ? "notified" : "notified by email only"}.`;
}

/** The "Add to <Night>" confirm on a borrowed player's row. */
export function makePermanentCopy(
  name: string,
  nightName: string,
  weekday: string,
  fromNight: string,
): { title: string; body: string; button: string } {
  const every = weekday ? `every ${weekday} skate` : `every ${nightName} skate`;
  return {
    title: `Add ${name} to ${nightName}?`,
    body: `They'll be invited to ${every} from now on.${fromNight ? ` They stay in ${fromNight}.` : ""}`,
    button: `Add to ${nightName}`,
  };
}

/** Weekday name from an ISO date ("2026-10-07" → "Wednesday"), local calendar. */
export function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(y, m - 1, d).getDay()
  ];
}
