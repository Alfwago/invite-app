import { test } from "node:test";
import assert from "node:assert/strict";

import { allowedWhilePending, isAccountPendingError, pendingReason } from "./pendingAccount.ts";

const base = { is_director: false, director_approved: true, email_verified: true };

test("reason: approval first, then verify; directors always pass", () => {
  assert.equal(pendingReason(base), null);
  assert.equal(pendingReason({ ...base, director_approved: false, email_verified: false }), "approval");
  assert.equal(pendingReason({ ...base, email_verified: false }), "verify");
  assert.equal(pendingReason({ ...base, is_director: true, director_approved: false }), null);
  assert.equal(pendingReason(null), null);
});

test("allowed routes: pending, profile, delete account, auth screens", () => {
  assert.ok(allowedWhilePending(["pending"]));
  assert.ok(allowedWhilePending(["(tabs)", "profile"]));
  assert.ok(allowedWhilePending(["delete-account"]));
  assert.ok(!allowedWhilePending(["(tabs)"]));
  assert.ok(!allowedWhilePending(["(tabs)", "messages"]));
  assert.ok(!allowedWhilePending(["event", "[id]"]));
});

test("the server's pending 403", () => {
  assert.ok(isAccountPendingError(403, { code: "account_pending", reason: "approval" }));
  assert.ok(!isAccountPendingError(403, { detail: "nope" }));
  assert.ok(!isAccountPendingError(401, { code: "account_pending" }));
  assert.ok(!isAccountPendingError(403, "text"));
});
