import { test } from "node:test";
import assert from "node:assert/strict";

import { roleTag } from "./roleTag.ts";

test("a director playing goalie keeps ND and gets G", () => {
  assert.equal(roleTag({ is_director: true, is_goalie: true }), "ND G");
  assert.equal(roleTag({ is_acting_director: true, is_goalie: true }), "Acting ND G");
  assert.equal(roleTag({ is_assistant_director: true, is_goalie: true }), "AD G");
});

test("single tags and none", () => {
  assert.equal(roleTag({ is_goalie: true }), "G");
  assert.equal(roleTag({ is_director: true }), "ND");
  assert.equal(roleTag({ is_director: true, is_acting_director: true }), "ND");
  assert.equal(roleTag({}), "");
});
