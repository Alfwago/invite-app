import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_HERO_ASPECT, heroAspect } from "./heroAspect.ts";

test("aspect comes from the picture", () => {
  assert.equal(heroAspect({ width: 1068, height: 231 }), 1068 / 231);
  assert.equal(heroAspect({ width: 1083, height: 359 }), 1083 / 359);
});

test("missing or zero size keeps the fallback", () => {
  assert.equal(heroAspect(null), DEFAULT_HERO_ASPECT);
  assert.equal(heroAspect({ width: 0, height: 100 }), DEFAULT_HERO_ASPECT);
  assert.equal(heroAspect({}, 3), 3);
});

test("clamped for odd uploads", () => {
  assert.equal(heroAspect({ width: 100, height: 100 }), 1.5);
  assert.equal(heroAspect({ width: 5000, height: 100 }), 8);
});
