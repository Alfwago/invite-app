import assert from "node:assert/strict";
import { test } from "node:test";

import { latestForPlatform, shouldShowUpdate } from "./updateCheck.ts";

const both = { ios: "1.5.3", android: "1.5.2" };

test("latestForPlatform: each platform reads its own setting", () => {
  assert.equal(latestForPlatform("ios", both, "9.9.9"), "1.5.3");
  assert.equal(latestForPlatform("android", both, "9.9.9"), "1.5.2");
});

test("latestForPlatform: a current server's blank setting means no nudge, not the Home value", () => {
  assert.equal(latestForPlatform("android", { ios: "1.5.3", android: "" }, "1.5.3"), "");
  assert.equal(latestForPlatform("ios", { ios: "", android: "1.5.2" }, "1.5.2"), "");
});

test("latestForPlatform: older server (no endpoint) falls back to Home for both platforms", () => {
  assert.equal(latestForPlatform("ios", null, "1.5.3"), "1.5.3");
  assert.equal(latestForPlatform("android", null, "1.5.3"), "1.5.3");
  assert.equal(latestForPlatform("ios", null, undefined), "");
  assert.equal(latestForPlatform("android", null, ""), "");
});

test("latestForPlatform: still loading or failed → nothing, even if Home has a value", () => {
  assert.equal(latestForPlatform("ios", undefined, "1.5.3"), "");
});

test("latestForPlatform: other platforms (web) never nudge", () => {
  assert.equal(latestForPlatform("web", both, "1.5.3"), "");
});

test("shouldShowUpdate: newer and not dismissed", () => {
  assert.equal(shouldShowUpdate("1.5.3", "1.5.2", null), true);
  assert.equal(shouldShowUpdate("1.5.2", "1.5.2", null), false);
  assert.equal(shouldShowUpdate("1.5.1", "1.5.2", null), false);
  assert.equal(shouldShowUpdate("", "1.5.2", null), false);
});

test("shouldShowUpdate: dismissing hides that version; a newer one shows again", () => {
  assert.equal(shouldShowUpdate("1.5.3", "1.5.2", "1.5.3"), false);
  assert.equal(shouldShowUpdate("1.5.4", "1.5.2", "1.5.3"), true);
});
