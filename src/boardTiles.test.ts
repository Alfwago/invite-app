import { test } from "node:test";
import assert from "node:assert/strict";

import { boardA11yLabel, boardTileImage, nightShortLabel } from "./boardTiles.ts";

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
