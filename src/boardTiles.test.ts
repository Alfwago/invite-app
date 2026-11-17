import { test } from "node:test";
import assert from "node:assert/strict";

import {
  boardA11yLabel,
  boardTileImage,
  boardTileLayout,
  boardTileRow,
  nightShortLabel,
  offscreenUnread,
  ROW_GAP,
  ROW_TILE,
  scrollToShow,
  TILE_MAX,
  TILE_MIN,
} from "./boardTiles.ts";

test("short label: server value wins", () => {
  assert.equal(nightShortLabel({ name: "Monday Mules", weekday: 2, short_label: "Custom" }), "Custom");
});

test("short label: weekday first word -> 3 letters", () => {
  assert.equal(nightShortLabel({ name: "Monday Mules", weekday: 2 }), "Mon");
  assert.equal(nightShortLabel({ name: "Sunday Black Sabbath", weekday: 1 }), "Sun");
  assert.equal(nightShortLabel({ name: "Thursday Old Fashioneds", weekday: 5 }), "Thu");
  assert.equal(nightShortLabel({ name: "Wednesdays at Pirelli", weekday: 4 }), "Wed");
  assert.equal(nightShortLabel({ name: "tue late", weekday: 3 }), "Tue");
});

test("short label: short custom first word kept", () => {
  assert.equal(nightShortLabel({ name: "Sundae Morning", weekday: 1 }), "Sundae");
  assert.equal(nightShortLabel({ name: "Pirelli Pickup", weekday: 6 }), "Pirelli");
});

test("short label: long custom name -> weekday", () => {
  assert.equal(nightShortLabel({ name: "Franklin Friday", weekday: 6 }), "Fri");
  assert.equal(nightShortLabel({ name: "Breakfast Club", weekday: 7 }), "Sat");
  assert.equal(nightShortLabel({ name: "", weekday: 3 }), "Tue");
});

test("tile image: dark tile, else original (older server), else none", () => {
  assert.equal(boardTileImage({ tile_image_url: "https://x/t.png", image_url: "https://x/o.png" }), "https://x/t.png");
  assert.equal(boardTileImage({ image_url: "https://x/o.png" }), "https://x/o.png");
  assert.equal(boardTileImage({ tile_image_url: null, image_url: "https://x/o.png" }), "https://x/o.png");
  assert.equal(boardTileImage({ tile_image_url: null, image_url: null }), null);
  assert.equal(boardTileImage({}), null);
});

test("a11y label", () => {
  assert.equal(boardA11yLabel("Monday Mules", 3), "Monday Mules board, 3 unread");
  assert.equal(boardA11yLabel("Main", 0), "Main board");
});

test("tile layout: a few tiles stay at the cap and spread out", () => {
  // iPhone 16 (393pt) minus the 12pt board padding each side.
  const l = boardTileLayout(369, 2);
  assert.deepEqual([l.size, l.columns], [TILE_MAX, 2]);
  assert.equal(l.gap, Math.floor((369 - 2 * TILE_MAX) / 3));
});

test("tile layout: 6 tiles fill one phone row edge to edge", () => {
  const l = boardTileLayout(369, 6);
  assert.equal(l.columns, 6);
  assert.ok(l.size >= TILE_MIN && l.size <= TILE_MAX);
  assert.ok(l.size * 6 + l.gap * 7 <= 369);
  assert.ok(369 - (l.size * 6 + l.gap * 7) < 7, "no big leftover margin");
});

test("tile layout: 7 and 8 wrap into balanced rows", () => {
  assert.equal(boardTileLayout(369, 7).columns, 4);
  assert.equal(boardTileLayout(369, 8).columns, 4);
  assert.equal(boardTileLayout(369, 13).columns, 5);
});

test("tile layout: never under 44pt, never wider than the screen", () => {
  for (const width of [296, 320, 351, 369, 406]) {
    for (let n = 1; n <= 14; n++) {
      const l = boardTileLayout(width, n);
      assert.ok(l.size >= TILE_MIN, `size ${l.size} at ${width}/${n}`);
      assert.ok(l.size * l.columns + l.gap * (l.columns + 1) <= width, `overflow at ${width}/${n}`);
    }
  }
  // iPhone SE (320pt): 6 can't fit at 44 + gaps, so 5 a row.
  assert.equal(boardTileLayout(296, 6).columns, 3);
  assert.equal(boardTileLayout(296, 5).columns, 5);
});

test("a11y label: the Main bar", () => {
  assert.equal(boardA11yLabel("Main", 0), "Main board");
  assert.equal(boardA11yLabel("Main", 4), "Main board, 4 unread");
});

test("tile layout: counts night tiles only (Main is the bar above)", () => {
  // OBH's 6 skate groups: one row of 6 under the Main bar, not 4 + 3.
  const l = boardTileLayout(369, 6);
  assert.equal(l.columns, 6);
  assert.ok(l.size >= TILE_MIN);
  // A single group: one tile at the cap, centred (equal gaps both sides).
  const one = boardTileLayout(369, 1);
  assert.deepEqual([one.size, one.columns], [TILE_MAX, 1]);
  assert.equal(one.gap, Math.floor((369 - TILE_MAX) / 2));
});

// -- one scrolling row (owner 2026-11-17, Art + Amy) ------------------------

test("a night or two keeps the spread-out row", () => {
  const r = boardTileRow(416, 2);
  assert.equal(r.scroll, false);
});

test("seven nights on a phone: one scrolling row, not a grid", () => {
  const r = boardTileRow(369, 7);
  assert.equal(r.scroll, true);
  if (r.scroll) assert.deepEqual([r.size, r.gap], [ROW_TILE, ROW_GAP]);
});

test("off-screen unread: nearest on each side", () => {
  // pad 12, 52 + 8: tile i at 12 + 60i. Window 0..300 shows tiles 0-3 fully.
  const unread = [0, 2, 0, 0, 0, 1, 3];
  assert.deepEqual(offscreenUnread(unread, 52, 8, 12, 0, 300), { left: null, right: 5 });
  // Scrolled to 200: tiles 0-3 start before 200 except tile 4 (252).
  assert.deepEqual(offscreenUnread(unread, 52, 8, 12, 200, 300), { left: 1, right: null });
  assert.deepEqual(offscreenUnread([0, 0, 0], 52, 8, 12, 0, 100), { left: null, right: null });
});

test("scrollToShow brings the open tile into view, else leaves it", () => {
  assert.equal(scrollToShow(1, 52, 8, 12, 0, 300), 0);
  // Tile 6 at 372..424 (+12 pad) in a 300 window: scroll to 136.
  assert.equal(scrollToShow(6, 52, 8, 12, 0, 300), 136);
  // Tile 0 while scrolled right: back to 0.
  assert.equal(scrollToShow(0, 52, 8, 12, 136, 300), 0);
});
