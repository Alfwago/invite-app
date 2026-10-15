import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACTION_CONFIRM,
  ACTION_DECLINE,
  confirmSucceeded,
  handlePromotionResponse,
  isPromotionPush,
  type ActionDeps,
  type ConfirmResult,
} from "./promotion.ts";

const DATA = { type: "waitlist_promoted", action: "confirm_promotion", eventId: 42 };

function deps(over: Partial<ActionDeps> & { result?: ConfirmResult; throws?: boolean } = {}) {
  const calls = { posted: [] as string[], failures: [] as string[] };
  const d: ActionDeps = {
    getToken: async () => "tok",
    postConfirm: async (eventId, token) => {
      calls.posted.push(`${eventId}:${token}`);
      if (over.throws) throw new Error("offline");
      return over.result ?? { kind: "http", status: 200, body: {} };
    },
    notifyFailure: async (eventId) => {
      calls.failures.push(eventId);
    },
    seen: new Set(),
    ...over,
  };
  return { d, calls };
}

const confirmTap = { actionIdentifier: ACTION_CONFIRM, notificationId: "n1", data: DATA };

test("isPromotionPush: type or action", () => {
  assert.equal(isPromotionPush(DATA), true);
  assert.equal(isPromotionPush({ type: "waitlist_promoted" }), true);
  assert.equal(isPromotionPush({ type: "late_drop", eventId: 1 }), false);
  assert.equal(isPromotionPush(null), false);
});

test("confirmSucceeded: 200 yes; 409 already-confirmed yes; else no", () => {
  assert.equal(confirmSucceeded({ kind: "http", status: 200 }), true);
  assert.equal(
    confirmSucceeded({ kind: "http", status: 409, body: { my_rsvp: { status: "YES", promotion: null } } }),
    true,
  );
  assert.equal(
    confirmSucceeded({ kind: "http", status: 409, body: { my_rsvp: { status: "NO", promotion: null } } }),
    false,
  );
  assert.equal(confirmSucceeded({ kind: "http", status: 409, body: { detail: "nothing" } }), false);
  assert.equal(confirmSucceeded({ kind: "http", status: 401 }), false);
  assert.equal(confirmSucceeded({ kind: "http", status: 500 }), false);
  assert.equal(confirmSucceeded({ kind: "network" }), false);
});

test("Confirm success posts with the stored token, no failure notice", async () => {
  const { d, calls } = deps();
  assert.equal(await handlePromotionResponse(confirmTap, d), "confirmed");
  assert.deepEqual(calls.posted, ["42:tok"]);
  assert.deepEqual(calls.failures, []);
});

test("Confirm failure (401 / 5xx / network / no token) posts the fallback notice", async () => {
  for (const over of [
    { result: { kind: "http", status: 401 } as ConfirmResult },
    { result: { kind: "http", status: 503 } as ConfirmResult },
    { result: { kind: "network" } as ConfirmResult },
    { throws: true },
    { getToken: async () => null },
  ]) {
    const { d, calls } = deps(over);
    assert.equal(await handlePromotionResponse(confirmTap, d), "failed");
    assert.deepEqual(calls.failures, ["42"]);
  }
});

test("a failing failure notice still reports failed (the app opens the card)", async () => {
  const { d } = deps({
    result: { kind: "network" },
    notifyFailure: async () => {
      throw new Error("no permission");
    },
  });
  assert.equal(await handlePromotionResponse(confirmTap, d), "failed");
});

test("Can't make it and a plain tap only open the event — never decline", async () => {
  const { d, calls } = deps();
  assert.equal(
    await handlePromotionResponse({ actionIdentifier: ACTION_DECLINE, notificationId: "n1", data: DATA }, d),
    "open",
  );
  assert.equal(
    await handlePromotionResponse(
      { actionIdentifier: "expo.modules.notifications.actions.DEFAULT", notificationId: "n1", data: DATA },
      d,
    ),
    "open",
  );
  assert.deepEqual(calls.posted, []);
});

test("the same response twice confirms once", async () => {
  const { d, calls } = deps();
  assert.equal(await handlePromotionResponse(confirmTap, d), "confirmed");
  assert.equal(await handlePromotionResponse(confirmTap, d), "duplicate");
  assert.equal(calls.posted.length, 1);
});

test("other pushes are ignored", async () => {
  const { d } = deps();
  assert.equal(
    await handlePromotionResponse(
      { actionIdentifier: ACTION_CONFIRM, notificationId: "x", data: { type: "late_drop", eventId: 1 } },
      d,
    ),
    "ignored",
  );
});
