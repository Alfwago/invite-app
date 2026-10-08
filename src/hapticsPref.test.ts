import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hapticsEnabled,
  parseHapticsPref,
  serializeHapticsPref,
  setHapticsEnabled,
  shouldBuzz,
  subscribeHapticsPref,
} from "./hapticsPref.ts";

test("haptics are on until the player turns them off", () => {
  assert.equal(hapticsEnabled(), true);
  assert.equal(shouldBuzz("ios"), true);
  assert.equal(shouldBuzz("android"), true);
});

test("never buzz on web, whatever the setting", () => {
  setHapticsEnabled(true);
  assert.equal(shouldBuzz("web"), false);
});

test("switched off, no platform buzzes — taps and toast haptics alike", () => {
  setHapticsEnabled(false);
  try {
    for (const os of ["ios", "android", "web"]) assert.equal(shouldBuzz(os), false, os);
  } finally {
    setHapticsEnabled(true);
  }
  assert.equal(shouldBuzz("ios"), true);
});

test("only an explicit 'off' turns it off — missing or odd values stay on", () => {
  assert.equal(parseHapticsPref(null), true);
  assert.equal(parseHapticsPref(undefined), true);
  assert.equal(parseHapticsPref(""), true);
  assert.equal(parseHapticsPref("on"), true);
  assert.equal(parseHapticsPref("garbled"), true);
  assert.equal(parseHapticsPref("off"), false);
});

test("saved values round-trip", () => {
  for (const on of [true, false]) assert.equal(parseHapticsPref(serializeHapticsPref(on)), on);
});

test("listeners hear real changes only, and can unsubscribe", () => {
  const heard: boolean[] = [];
  const off = subscribeHapticsPref((on) => heard.push(on));
  setHapticsEnabled(true); // no change
  setHapticsEnabled(false);
  setHapticsEnabled(true);
  off();
  setHapticsEnabled(false);
  setHapticsEnabled(true);
  assert.deepEqual(heard, [false, true]);
});
