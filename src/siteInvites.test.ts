import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildInvitePayload,
  inviteResultBadge,
  inviteSummary,
  namesApply,
  parseInviteEmails,
} from "./siteInvites.ts";

test("parseInviteEmails: commas, semicolons, new lines; trimmed, lower-cased, de-duplicated", () => {
  assert.deepEqual(parseInviteEmails(" A@Example.test, b@example.test;\nA@example.test ,, "), [
    "a@example.test",
    "b@example.test",
  ]);
  assert.deepEqual(parseInviteEmails("   "), []);
});

test("namesApply: only for exactly one address", () => {
  assert.equal(namesApply([]), false);
  assert.equal(namesApply(["a@example.test"]), true);
  assert.equal(namesApply(["a@example.test", "b@example.test"]), false);
});

test("buildInvitePayload: a single address carries the trimmed name", () => {
  assert.deepEqual(
    buildInvitePayload({
      emailText: "a@example.test",
      firstName: " Ann ",
      lastName: "",
      directorId: null,
      canChooseDirector: false,
    }),
    { emails: "a@example.test", first_name: "Ann" },
  );
});

test("buildInvitePayload: several addresses drop the name", () => {
  assert.deepEqual(
    buildInvitePayload({
      emailText: "a@example.test; b@example.test",
      firstName: "Ann",
      lastName: "Smith",
      directorId: null,
      canChooseDirector: false,
    }),
    { emails: "a@example.test, b@example.test" },
  );
});

test("buildInvitePayload: director_id only for an admin's pick", () => {
  const base = { emailText: "a@example.test", firstName: "", lastName: "" };
  assert.equal(buildInvitePayload({ ...base, directorId: 7, canChooseDirector: false }).director_id, undefined);
  assert.equal(buildInvitePayload({ ...base, directorId: 7, canChooseDirector: true }).director_id, 7);
  assert.equal(buildInvitePayload({ ...base, directorId: null, canChooseDirector: true }).director_id, undefined);
});

test("inviteResultBadge: known statuses and a newer server's unknown one", () => {
  assert.deepEqual(inviteResultBadge("sent"), { text: "SENT", tone: "good" });
  assert.equal(inviteResultBadge("invalid").tone, "bad");
  assert.equal(inviteResultBadge("exists").text, "HAS AN ACCOUNT");
  assert.equal(inviteResultBadge("other_director").tone, "caution");
  assert.deepEqual(inviteResultBadge("queued"), { text: "QUEUED", tone: "neutral" });
});

test("inviteSummary", () => {
  assert.equal(inviteSummary([]), "");
  assert.equal(inviteSummary([{ status: "sent" }]), "Invite sent.");
  assert.equal(inviteSummary([{ status: "sent" }, { status: "sent" }]), "2 invites sent.");
  assert.equal(inviteSummary([{ status: "exists" }]), "Not sent.");
  assert.equal(inviteSummary([{ status: "sent" }, { status: "invalid" }]), "1 sent, 1 not sent.");
});
