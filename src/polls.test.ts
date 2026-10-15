import { test } from "node:test";
import assert from "node:assert/strict";

import { audienceLabel, audienceValid, cleanPicked, newPollBody, notifiedText, supportsPollGroups } from "./polls.ts";

const MON = { id: 1, name: "Monday Mules", short_label: "Mon" };
const THU = { id: 2, name: "Thursday Night", short_label: "Thu" };
const SUN = { id: 3, name: "Sundae Morning", short_label: "Sundae" };
const BASE = { title: "T", questions: [{ text: "Q", choices: ["a", "b"] }] };

test("supportsPollGroups: only when the server sends pickable_nights", () => {
  assert.equal(supportsPollGroups(undefined), false);
  assert.equal(supportsPollGroups({ polls: [] }), false);
  assert.equal(supportsPollGroups({ polls: [], pickable_nights: [] }), true);
});

test("audienceLabel", () => {
  assert.equal(audienceLabel({}), "");
  assert.equal(audienceLabel({ nights: [] }), "Everyone");
  assert.equal(audienceLabel({ nights: [MON, THU] }), "Monday Mules, Thursday Night");
  assert.equal(audienceLabel({ nights: [MON, THU, SUN] }), "Mon · Thu · Sundae");
});

test("cleanPicked / audienceValid", () => {
  assert.deepEqual(cleanPicked([1, 9], [MON, THU]), [1]);
  assert.equal(audienceValid("everyone", []), true);
  assert.equal(audienceValid("groups", []), false);
  assert.equal(audienceValid("groups", [1]), true);
});

test("newPollBody: old server gets the old body", () => {
  assert.deepEqual(
    newPollBody(BASE, { groupsSupported: false, audience: "groups", picked: [1], notify: true }),
    BASE,
  );
});

test("newPollBody: everyone = [] + notify flag; groups sorted", () => {
  assert.deepEqual(newPollBody(BASE, { groupsSupported: true, audience: "everyone", picked: [2], notify: true }), {
    ...BASE,
    night_ids: [],
    notify: true,
  });
  assert.deepEqual(newPollBody(BASE, { groupsSupported: true, audience: "groups", picked: [2, 1], notify: false }), {
    ...BASE,
    night_ids: [1, 2],
    notify: false,
  });
});

test("notifiedText", () => {
  assert.equal(notifiedText(undefined), null);
  assert.equal(notifiedText({ recipients: 0 }), "Nobody to notify yet.");
  assert.equal(notifiedText({ recipients: 1 }), "Sent to 1 player.");
  assert.equal(notifiedText({ recipients: 23 }), "Sent to 23 players.");
});
