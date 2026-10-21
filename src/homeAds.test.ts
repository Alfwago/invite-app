import { test } from "node:test";
import assert from "node:assert/strict";

import type { HomeAdItem } from "./api/types.ts";
import { hiddenUntil, isHidden, pickAd, storeKey } from "./homeAds.ts";

const ad = (id: number, hide = 86400, v = 0): HomeAdItem => ({
  id,
  name: `Ad ${id}`,
  image_url: `https://x/${id}.gif`,
  link_url: "",
  alt_text: "",
  key: `obh.ad.${id}.${v}`,
  hide_seconds: hide,
});

test("hidden for its time, then back", () => {
  const a = ad(1, 3600);
  const now = 1_000_000;
  const stored = { [a.key]: hiddenUntil(a, now) };
  assert.equal(isHidden(a, stored, new Set(), now + 1000), true);
  assert.equal(isHidden(a, stored, new Set(), now + 3600 * 1000 + 1), false);
});

test("this-visit hides live in the session set only", () => {
  const a = ad(2, 0);
  assert.equal(hiddenUntil(a, 5), 0);
  assert.equal(isHidden(a, {}, new Set([a.key]), 5), true);
  assert.equal(isHidden(a, {}, new Set(), 5), false);
});

test("Show again to everyone: a new key ignores the old hide", () => {
  const old = ad(3, 86400, 0);
  const again = ad(3, 86400, 1);
  const stored = { [old.key]: Date.now() + 1e9 };
  assert.equal(isHidden(again, stored, new Set(), Date.now()), false);
});

test("picks among those not hidden", () => {
  const a = ad(4);
  const b = ad(5);
  const stored = { [a.key]: 9e15 };
  assert.equal(pickAd([a, b], stored, new Set(), 0)?.id, 5);
  assert.equal(pickAd([a], stored, new Set(), 0), null);
  assert.equal(pickAd([a, b], {}, new Set(), 0, () => 0.99)?.id, 5);
});

test("store keys are SecureStore-safe", () => {
  assert.equal(storeKey("obh.ad.12.3"), "obh.ad.12.3");
  assert.equal(storeKey("obh ad/1"), "obh_ad_1");
});
