import assert from "node:assert/strict";
import { test } from "node:test";

import { autoBalance, ppv, type TGPlayer } from "./balance.ts";

const flat = { hockey_sense: 3, skating: 3, defense: 3, offense: 3, goalie: 0 };

function mk(
  id: number,
  rating: number,
  extra: Partial<TGPlayer> = {},
): TGPlayer {
  return {
    id,
    name: `P${id}`,
    is_goalie: false,
    present: true,
    ratings: { ...flat, hockey_sense: rating, skating: rating, defense: rating, offense: rating },
    ...extra,
  };
}

const run = (input: Parameters<typeof autoBalance>[0]) =>
  autoBalance({ shuffle: false, ...input });

test("ppv weighting matches the server", () => {
  // 0.4*4 + 0.25*2 + 0.2*3 + 0.15*1
  assert.equal(ppv({ hockey_sense: 4, skating: 2, defense: 3, offense: 1, goalie: 0 }), 2.85);
});

test("an unrated skill counts as 3 — no 0s (matches the web)", () => {
  // all-zero ratings -> treated as all 3 -> PPV 3
  assert.equal(ppv({ hockey_sense: 0, skating: 0, defense: 0, offense: 0, goalie: 0 }), 3);
  // a single 0 among real ratings is bumped to 3
  assert.equal(ppv({ hockey_sense: 4, skating: 0, defense: 4, offense: 4, goalie: 0 }), 3.75);
});

test("unrated players still balance as mid-tier, not zero", () => {
  const rated = [1, 2, 3, 4].map((i) => mk(i, 4));
  const unrated = [5, 6, 7, 8].map((i) => mk(i, 0));
  const r = run({ players: [...rated, ...unrated], pairs: [], splits: [] });
  const total = (arr: TGPlayer[]) => arr.reduce((a, p) => a + ppv(p.ratings), 0);
  // unrated contribute 3 each, so totals stay within a point
  assert.ok(Math.abs(total(r.gold) - total(r.black)) <= 1);
});

test("splits an even roster in half; odd gives one team the extra", () => {
  const six = [1, 2, 3, 4, 5, 6].map((i) => mk(i, i));
  let r = run({ players: six, pairs: [], splits: [] });
  assert.equal(r.gold.length, 3);
  assert.equal(r.black.length, 3);

  const seven = [1, 2, 3, 4, 5, 6, 7].map((i) => mk(i, i));
  r = run({ players: seven, pairs: [], splits: [] });
  assert.deepEqual([r.gold.length, r.black.length].sort(), [3, 4]);
});

test("rating totals land close", () => {
  const players = Array.from({ length: 12 }, (_, i) => mk(i + 1, 1 + (i % 5)));
  const r = run({ players, pairs: [], splits: [] });
  const total = (arr: TGPlayer[]) => arr.reduce((a, p) => a + ppv(p.ratings), 0);
  assert.ok(Math.abs(total(r.gold) - total(r.black)) <= 2, "totals within 2 PPV");
});

test("locked players stay on their team", () => {
  const players = [
    mk(1, 5, { locked: "Gold" }),
    mk(2, 5, { locked: "Gold" }),
    mk(3, 1),
    mk(4, 1),
  ];
  const r = run({ players, pairs: [], splits: [] });
  assert.ok(r.gold.some((p) => p.id === 1) && r.gold.some((p) => p.id === 2));
});

test("paired players land on the same team (3-player group too)", () => {
  const players = [1, 2, 3, 4, 5, 6].map((i) => mk(i, 3));
  const r = run({
    players,
    pairs: [
      [1, 2],
      [2, 3],
    ],
    splits: [],
  });
  const team = (id: number) => (r.gold.some((p) => p.id === id) ? "G" : "B");
  assert.equal(team(1), team(2));
  assert.equal(team(2), team(3));
});

test("pair/split edges keyed by string still match numeric player ids", () => {
  const players = [1, 2, 3, 4, 5, 6].map((i) => mk(i, 3));
  // The app keys constraint edges by String(id); players carry numeric ids.
  const r = run({ players, pairs: [["1", "2"] as unknown as [number, number]], splits: [] });
  const team = (id: number) => (r.gold.some((p) => p.id === id) ? "G" : "B");
  assert.equal(team(1), team(2));
});

test("split players end up apart", () => {
  const players = [1, 2, 3, 4].map((i) => mk(i, 3));
  const r = run({ players, pairs: [], splits: [[1, 2]] });
  const g1 = r.gold.some((p) => p.id === 1);
  const g2 = r.gold.some((p) => p.id === 2);
  assert.notEqual(g1, g2);
});

test("an unresolvable split doesn't unbalance team sizes (regression: extra player on one team)", () => {
  // P1+P2 paired (a unit) land together on Gold; P3, unpaired, lands on
  // Gold too. P1 is split from P3, but P1 can't move (would break the
  // pairing with P2), so P3 is the only candidate mover — and every Black
  // player is individually locked, so none of them can swap back. The old
  // behaviour moved P3 to Black anyway (Gold 2, Black 4); the fix leaves
  // the split unresolved instead (Gold 3, Black 3).
  const players = [
    mk(1, 5),
    mk(2, 5),
    mk(3, 5),
    mk(4, 3, { locked: "Black" }),
    mk(5, 3, { locked: "Black" }),
    mk(6, 3, { locked: "Black" }),
  ];
  const r = run({ players, pairs: [[1, 2]], splits: [[1, 3]] });
  assert.equal(r.gold.length, 3);
  assert.equal(r.black.length, 3);
  assert.deepEqual(
    r.gold.map((p) => p.id).sort(),
    [1, 2, 3],
  );
});

test("goalie team preference is honoured; overflow goalie skates out", () => {
  const players: TGPlayer[] = [
    { id: 10, name: "G1", is_goalie: true, present: true, ratings: { ...flat, goalie: 2 } },
    { id: 11, name: "G2", is_goalie: true, present: true, ratings: { ...flat, goalie: 2 } },
    { id: 12, name: "G3", is_goalie: true, present: true, ratings: { ...flat, goalie: 1 } },
    ...[1, 2, 3, 4].map((i) => mk(i, 3)),
  ];
  const r = run({
    players,
    pairs: [],
    splits: [],
    goaliePrefs: { "10": "Black" },
  });
  assert.equal(r.blackGoalie?.playerId, 10);
  assert.equal(r.goldGoalie?.playerId, 11);
  // G3 is the 3rd goalie → skates as a field player
  assert.ok([...r.gold, ...r.black].some((p) => p.id === 12));
});

test("presentOnly drops absent players", () => {
  const players = [
    mk(1, 3),
    mk(2, 3),
    mk(3, 3, { present: false }),
    mk(4, 3, { present: false }),
  ];
  const r = run({ players, pairs: [], splits: [], presentOnly: true });
  assert.equal(r.gold.length + r.black.length, 2);
});

// ---- 1.6.1: split-swap dropped a player -----------------------------------
// The app keys pair/split edges by String(id) while real players carry
// numeric ids. 1.6.0 compared one side of the split swap raw, so a split
// resolved by a swap removed the mover and duplicated the swap partner.

/** Small deterministic PRNG so the sweeps below are repeatable. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A roster like a real night: numeric members, a string-id walk-on, two goalies. */
function roster(rng: () => number, size: number): TGPlayer[] {
  const skill = () => 1 + Math.floor(rng() * 5);
  const players: TGPlayer[] = Array.from({ length: size }, (_, i) => ({
    id: 100 + i,
    name: `P${100 + i}`,
    is_goalie: false,
    present: true,
    ratings: { hockey_sense: skill(), skating: skill(), defense: skill(), offense: skill(), goalie: 0 },
  }));
  players.push({ id: "walkon-1", name: "Walk-on", is_goalie: false, present: true, ratings: { ...flat } });
  players.push({ id: 900, name: "G1", is_goalie: true, present: true, ratings: { ...flat, goalie: 2 } });
  players.push({ id: 901, name: "G2", is_goalie: true, present: true, ratings: { ...flat, goalie: 2 } });
  return players;
}

const S = (x: TGPlayer["id"]) => String(x);
const skaterIds = (players: TGPlayer[]) => players.filter((p) => !p.is_goalie).map((p) => S(p.id)).sort();

/** Every skater exactly once across the two teams, team sizes within one. */
function assertEveryoneOnce(players: TGPlayer[], r: ReturnType<typeof autoBalance>, label: string) {
  const placed = [...r.gold, ...r.black].map((p) => S(p.id));
  assert.equal(new Set(placed).size, placed.length, `${label}: someone is on the screen twice`);
  assert.deepEqual([...placed].sort(), skaterIds(players), `${label}: a player is missing`);
  assert.ok(Math.abs(r.gold.length - r.black.length) <= 1, `${label}: team sizes ${r.gold.length}/${r.black.length}`);
}

const teamOf = (r: ReturnType<typeof autoBalance>, id: TGPlayer["id"]) =>
  r.gold.some((p) => S(p.id) === S(id)) ? "Gold" : r.black.some((p) => S(p.id) === S(id)) ? "Black" : null;

test("owner's sequence: pair, unpair, split, Auto-balance keeps both players, apart", () => {
  // Mirrors the screen: edges are stored as strings (K(id)); the pair is
  // added, Auto-balanced, removed, then the same two are split and
  // Auto-balance is pressed again and again.
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed);
    const players = roster(rng, 14);
    const a = S(players[Math.floor(rng() * 14)].id);
    let b = S(players[Math.floor(rng() * 14)].id);
    if (a === b) b = "walkon-1";

    let pairs: [string, string][] = [[a, b]];
    let r = autoBalance({ players, pairs, splits: [], rng });
    assertEveryoneOnce(players, r, `seed ${seed} paired`);
    assert.equal(teamOf(r, a), teamOf(r, b), `seed ${seed}: pair split up`);

    pairs = [];
    const splits: [string, string][] = [[a, b]];
    for (let press = 0; press < 5; press++) {
      r = autoBalance({ players, pairs, splits, rng });
      assertEveryoneOnce(players, r, `seed ${seed} split press ${press}`);
      assert.notEqual(teamOf(r, a), teamOf(r, b), `seed ${seed} press ${press}: split pair together`);
    }
  }
});

test("seeded sweep: every player appears exactly once with pairs, splits and locks", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed * 7919);
    const players = roster(rng, 10 + Math.floor(rng() * 12));
    const skaters = players.filter((p) => !p.is_goalie);
    const pick = () => S(skaters[Math.floor(rng() * skaters.length)].id);
    // A lock or two, as the 🔒 button sets them.
    for (const p of skaters) if (rng() < 0.1) p.locked = rng() < 0.5 ? "Gold" : "Black";
    const pairs: [string, string][] = [];
    const splits: [string, string][] = [];
    for (let i = 0; i < 3; i++) {
      const x = pick();
      const y = pick();
      if (x === y) continue;
      // Numeric and string forms both turn up (app vs a web-locked draft).
      const edge = (rng() < 0.5 ? [x, y] : [Number(x) || x, Number(y) || y]) as [string, string];
      (rng() < 0.5 ? pairs : splits).push(edge);
    }
    const r = autoBalance({ players, pairs, splits, rng });
    assertEveryoneOnce(players, r, `seed ${seed}`);
  }
});

test("split players end up apart whenever a swap partner exists (numeric and string edges)", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed * 104729);
    const players = roster(rng, 12);
    const [a, b] = [players[0].id, players[1].id];
    for (const splits of [[[a, b]], [[S(a), S(b)]]] as [TGPlayer["id"], TGPlayer["id"]][][]) {
      const r = autoBalance({ players, pairs: [], splits, rng });
      assertEveryoneOnce(players, r, `seed ${seed}`);
      assert.notEqual(teamOf(r, a), teamOf(r, b), `seed ${seed}: ${a} and ${b} together`);
    }
  }
});

test("a goalie deselected by string id matches a numeric goalie id", () => {
  const players = roster(seeded(3), 8);
  const r = autoBalance({ players, pairs: [], splits: [], inactiveGoalieIds: new Set(["900"]), shuffle: false });
  assert.equal(r.goldGoalie?.playerId, 901);
  assert.equal(r.blackGoalie, null);
});
