import assert from "node:assert/strict";
import { test } from "node:test";

import { addModeOptions, borrowOffReason, resolveAddMode } from "./addPlayer.ts";

const open = { nightName: "Demo Thursday", status: "OPEN", isPast: false, canBorrow: true };

test("three modes in order, Skate Group names the night", () => {
  const opts = addModeOptions(open);
  assert.deepEqual(
    opts.map((o) => o.label),
    ["Skate Group", "Borrow", "Walk-On"],
  );
  assert.equal(opts[0].description, "Members of Demo Thursday.");
  assert.equal(opts[1].description, "From another skate group, for this skate only. They're notified.");
  assert.equal(opts[2].description, "Someone without an account. No emails sent.");
  assert.ok(opts.every((o) => o.disabledReason === null));
});

test("older server (no can_borrow) → no Borrow segment at all", () => {
  const opts = addModeOptions({ ...open, canBorrow: undefined });
  assert.deepEqual(
    opts.map((o) => o.key),
    ["group", "walkon"],
  );
  assert.equal(resolveAddMode("borrow", opts), "group");
});

test("Borrow off → disabled with the server's reason", () => {
  assert.equal(
    addModeOptions({ ...open, status: "DRAFT", canBorrow: false })[1].disabledReason,
    "Send this skate's invites first, then you can borrow players.",
  );
  assert.equal(borrowOffReason({ ...open, isPast: true }), "This skate is over.");
  assert.equal(
    borrowOffReason({ ...open, nightName: null }),
    "Borrowing only works for a skate group's skate.",
  );
});

test("custom event: Skate Group describes account holders", () => {
  assert.equal(addModeOptions({ ...open, nightName: null })[0].description, "Players with an account.");
});

test("resolveAddMode keeps a usable choice, else Skate Group", () => {
  const opts = addModeOptions(open);
  assert.equal(resolveAddMode(null, opts), "group");
  assert.equal(resolveAddMode("walkon", opts), "walkon");
  assert.equal(resolveAddMode("borrow", opts), "borrow");
  const off = addModeOptions({ ...open, canBorrow: false });
  assert.equal(resolveAddMode("borrow", off), "group");
});
