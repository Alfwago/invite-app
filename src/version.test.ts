import assert from "node:assert/strict";
import { test } from "node:test";

import { compareVersions, isNewerVersion } from "./version.ts";

test("compareVersions: numeric per segment, not lexicographic", () => {
  assert.ok(compareVersions("1.10.0", "1.2.0") > 0);
  assert.ok(compareVersions("1.2.0", "1.10.0") < 0);
  assert.equal(compareVersions("1.2.0", "1.2.0"), 0);
});

test("compareVersions: missing segments count as 0", () => {
  assert.equal(compareVersions("1.2", "1.2.0"), 0);
  assert.ok(compareVersions("1.3", "1.2.9") > 0);
});

test("compareVersions: unparseable input is treated as equal, not a crash", () => {
  assert.equal(compareVersions("abc", "1.2.0"), 0);
  assert.equal(compareVersions("", "1.2.0"), 0);
  assert.equal(compareVersions("1.2.0", ""), 0);
  // Number("") === 0 in JS, not NaN — a trailing/empty segment (from a
  // literal "" or a trailing ".") must not be silently read as "0".
  assert.equal(compareVersions("1.2.", "1.2.0"), 0);
});

test("isNewerVersion: true only when latest is strictly newer", () => {
  assert.equal(isNewerVersion("1.2.0", "1.1.0"), true);
  assert.equal(isNewerVersion("1.1.0", "1.2.0"), false);
  assert.equal(isNewerVersion("1.2.0", "1.2.0"), false);
});

test("isNewerVersion: blank input never nudges", () => {
  assert.equal(isNewerVersion("", "1.1.0"), false);
  assert.equal(isNewerVersion("1.2.0", ""), false);
});
