/**
 * Team balancer — a faithful TS port of the website's obh_teams autoBalance
 * (app/invitations/static/obh_teams/views/teams.js). Same weighted-rating
 * draft, "keep together" connected-component units, capacity-first placement,
 * and "keep apart" split resolution with rating-matched swaps.
 */

export type TeamName = "Gold" | "Black";

export interface TGRatings {
  hockey_sense: number;
  skating: number;
  defense: number;
  offense: number;
  goalie: number;
}

export interface TGPlayer {
  id: number | string;
  name: string;
  is_goalie: boolean;
  present: boolean;
  ratings: TGRatings;
  /** Manual lock to a team (survives re-balance). */
  locked?: TeamName | null;
}

export interface GoalieSlot {
  id: string;
  playerId: number | string;
  name: string;
  team: TeamName | "Auto";
  weight: number;
}

export interface BalanceInput {
  players: TGPlayer[];
  /** Undirected "keep together" edges. Connected components stay on one team. */
  pairs: [TGPlayer["id"], TGPlayer["id"]][];
  /** Pairwise "keep apart" (not transitive). */
  splits: [TGPlayer["id"], TGPlayer["id"]][];
  /** Per-goalie team preference. */
  goaliePrefs?: Record<string, TeamName | "Auto">;
  /** Goalie ids deselected on the Goalies tab — they skate as regular players. */
  inactiveGoalieIds?: Set<TGPlayer["id"]>;
  presentOnly?: boolean;
  /** Randomise the within-team order (matches the web). Off for tests. */
  shuffle?: boolean;
  rng?: () => number;
}

export interface BalanceResult {
  gold: TGPlayer[];
  black: TGPlayer[];
  goldGoalie: GoalieSlot | null;
  blackGoalie: GoalieSlot | null;
}

/**
 * Match the website's normalizeRating: an unrated skill (0, negative, or
 * non-numeric) counts as 3; anything else is clamped to 1–5. So a player
 * with no ratings still balances as a mid-tier skater, never a 0.
 */
export function normalizeSkill(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.min(5, Math.max(1, n));
}

/** Website's normalizeGoalieRating: clamp 0–3, no default. */
export function normalizeGoalie(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(3, Math.max(0, n)) * 100) / 100;
}

/** Weighted skill value — 40% hockey sense, 25% skating, 20% defense, 15% offense. */
export function ppv(r: TGRatings): number {
  const hs = normalizeSkill(r.hockey_sense);
  const sk = normalizeSkill(r.skating);
  const de = normalizeSkill(r.defense);
  const off = normalizeSkill(r.offense);
  return Math.round((0.4 * hs + 0.25 * sk + 0.2 * de + 0.15 * off) * 100) / 100;
}

function ratingFor(p: TGPlayer): number {
  return p.is_goalie ? normalizeGoalie(p.ratings.goalie) : ppv(p.ratings);
}

export function autoBalance(input: BalanceInput): BalanceResult {
  const {
    players,
    pairs,
    splits,
    goaliePrefs = {},
    inactiveGoalieIds = new Set(),
    presentOnly = false,
    shuffle: doShuffle = true,
    rng = Math.random,
  } = input;

  const candidates = presentOnly ? players.filter((p) => p.present) : players.slice();

  // --- Goalies: pick up to 2, honour team preference, rest skate out --------
  const playerGoalies = candidates.filter((p) => p.is_goalie && !inactiveGoalieIds.has(p.id));
  const selected: GoalieSlot[] = playerGoalies.slice(0, 2).map((p) => ({
    id: `goalie_${p.id}`,
    playerId: p.id,
    name: p.name,
    team: goaliePrefs[String(p.id)] || "Auto",
    weight: normalizeGoalie(p.ratings.goalie),
  }));

  let goldGoalie = selected.find((g) => g.team === "Gold") || null;
  let blackGoalie = selected.find((g) => g.team === "Black") || null;
  const remaining = selected.filter((g) => g !== goldGoalie && g !== blackGoalie);
  if (!goldGoalie && remaining.length) goldGoalie = remaining.shift() || null;
  if (!blackGoalie && remaining.length) blackGoalie = remaining.shift() || null;
  const gw = (g: GoalieSlot | null) => (g ? Number(g.weight || 0) : 0);

  const overflowGoalies = playerGoalies.slice(2);
  const list = candidates
    .filter((p) => !p.is_goalie)
    .concat(overflowGoalies)
    .sort((a, b) => ratingFor(b) - ratingFor(a));

  const sum = (arr: TGPlayer[]) => arr.reduce((a, p) => a + ratingFor(p), 0);

  const gold: TGPlayer[] = [];
  const black: TGPlayer[] = [];
  const totalGold = () => sum(gold) + gw(goldGoalie);
  const totalBlack = () => sum(black) + gw(blackGoalie);

  const goldTarget = Math.floor(list.length / 2);
  const blackTarget = list.length - goldTarget;

  // --- Locked players go straight to their team ----------------------------
  const unlocked: TGPlayer[] = [];
  for (const p of list) {
    if (p.locked === "Gold") gold.push(p);
    else if (p.locked === "Black") black.push(p);
    else unlocked.push(p);
  }

  // --- Pairs → connected components ("units") among unlocked players -------
  // Ids can be numbers (real players) or strings (guests / walk-ons), and the
  // pair/split lists key by string — compare everything as strings.
  const sid = (x: TGPlayer["id"]) => String(x);
  const pairEdges = pairs.map(([a, b]) => [sid(a), sid(b)] as const);
  const splitEdges = splits.map(([a, b]) => [sid(a), sid(b)] as const);
  const listIds = new Set(list.map((p) => sid(p.id)));
  const adjacency = new Map<string, string[]>();
  list.forEach((p) => adjacency.set(sid(p.id), []));
  for (const [a, b] of pairEdges) {
    if (listIds.has(a) && listIds.has(b)) {
      adjacency.get(a)!.push(b);
      adjacency.get(b)!.push(a);
    }
  }
  const pairPartnerIds = (id: TGPlayer["id"]) =>
    pairEdges.filter(([a, b]) => a === sid(id) || b === sid(id)).map(([a, b]) => (a === sid(id) ? b : a));
  const splitPartnerIds = (id: TGPlayer["id"]) =>
    splitEdges.filter(([a, b]) => a === sid(id) || b === sid(id)).map(([a, b]) => (a === sid(id) ? b : a));

  const unlockedIds = new Set(unlocked.map((p) => sid(p.id)));
  const visited = new Set<string>();
  let units: { members: TGPlayer[]; rating: number }[] = [];
  for (const p of unlocked) {
    if (visited.has(sid(p.id))) continue;
    const stack = [sid(p.id)];
    const memberIds: string[] = [];
    visited.add(sid(p.id));
    while (stack.length) {
      const cur = stack.pop()!;
      memberIds.push(cur);
      for (const n of adjacency.get(cur) || []) {
        if (!visited.has(n) && unlockedIds.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    const members = memberIds
      .map((mid) => unlocked.find((u) => sid(u.id) === mid))
      .filter((x): x is TGPlayer => !!x);
    units.push({ members, rating: sum(members) });
  }

  // A paired player whose partner already landed on a locked team joins them.
  for (const p of unlocked) {
    if (gold.includes(p) || black.includes(p)) continue;
    const partnerTeams = new Set(
      pairPartnerIds(p.id)
        .map((pid) =>
          gold.some((g) => sid(g.id) === pid)
            ? "Gold"
            : black.some((b) => sid(b.id) === pid)
              ? "Black"
              : null,
        )
        .filter((t): t is TeamName => !!t),
    );
    if (partnerTeams.size === 1) {
      const team = [...partnerTeams][0];
      (team === "Gold" ? gold : black).push(p);
      for (const unit of units) unit.members = unit.members.filter((mem) => mem.id !== p.id);
    }
  }

  // --- Place units: equal team SIZE first, rating closeness second --------
  units.sort((a, b) => b.rating - a.rating);
  const roomOn = (team: TGPlayer[], target: number) => Math.max(0, target - team.length);
  const placeUnit = (unit: { members: TGPlayer[] }) => {
    const rest = unit.members.filter((m) => !gold.includes(m) && !black.includes(m));
    if (!rest.length) return;
    const size = rest.length;
    const goldRoom = roomOn(gold, goldTarget);
    const blackRoom = roomOn(black, blackTarget);
    const goldFits = size <= goldRoom;
    const blackFits = size <= blackRoom;
    let target: TGPlayer[];
    if (goldFits && !blackFits) target = gold;
    else if (blackFits && !goldFits) target = black;
    else if (goldFits && blackFits) target = totalGold() <= totalBlack() ? gold : black;
    else target = goldRoom >= blackRoom ? gold : black;
    target.push(...rest);
  };
  units.filter((u) => u.members.length > 1).forEach(placeUnit);
  units.filter((u) => u.members.length <= 1).forEach(placeUnit);

  // --- Splits: separate any "keep apart" pair still on one team ----------
  for (const [aId, bId] of splitEdges) {
    const aInGold = gold.some((p) => sid(p.id) === aId);
    const aInBlack = black.some((p) => sid(p.id) === aId);
    const bInGold = gold.some((p) => sid(p.id) === bId);
    const bInBlack = black.some((p) => sid(p.id) === bId);
    const together = (aInGold && bInGold) || (aInBlack && bInBlack);
    if (!together) continue;

    const canMove = (id: string) => {
      const p = list.find((pl) => sid(pl.id) === id);
      if (!p || p.locked) return false;
      const partners = pairPartnerIds(id);
      return (
        partners.length === 0 ||
        !partners.some(
          (pid) => gold.some((g) => sid(g.id) === pid) || black.some((b) => sid(b.id) === pid),
        )
      );
    };
    const createsNewSplit = (id: string, dest: TGPlayer[]) =>
      splitPartnerIds(id).some((pid) => dest.some((p) => sid(p.id) === pid));

    const fromTeam = aInGold ? gold : black;
    const toTeam = aInGold ? black : gold;
    const mover = canMove(aId) ? aId : canMove(bId) ? bId : null;
    if (mover == null) continue;

    const moverIdx = fromTeam.findIndex((p) => sid(p.id) === mover);
    const [moved] = fromTeam.splice(moverIdx, 1);
    toTeam.push(moved);

    const moverRating = ratingFor(moved);
    const swap = toTeam
      .filter((p) => sid(p.id) !== mover && canMove(sid(p.id)) && !createsNewSplit(sid(p.id), fromTeam))
      .sort(
        (x, y) => Math.abs(ratingFor(x) - moverRating) - Math.abs(ratingFor(y) - moverRating),
      )[0];
    if (swap) {
      toTeam.splice(
        toTeam.findIndex((p) => sid(p.id) === swap.id),
        1,
      );
      fromTeam.push(swap);
    }
  }

  if (doShuffle) {
    shuffle(gold, rng);
    shuffle(black, rng);
  }

  return { gold, black, goldGoalie, blackGoalie };
}

function shuffle<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
