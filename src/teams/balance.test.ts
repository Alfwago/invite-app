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
