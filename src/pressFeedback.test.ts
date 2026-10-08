import assert from "node:assert/strict";
import { test } from "node:test";

import { pressFx } from "./pressFeedback.ts";

test("every pressable kind but 'none' visibly dims when pressed", () => {
  for (const kind of ["button", "row", "icon"] as const) {
    const fx = pressFx(kind);
    assert.ok(fx && typeof fx.opacity === "number" && fx.opacity < 1, kind);
  }
  assert.equal(pressFx("none"), null);
  assert.deepEqual(pressFx(), pressFx("button"));
});

test("rows never scale (a whole row shrinking reads as a glitch)", () => {
  assert.equal(pressFx("row")?.transform, undefined);
});
