import { test } from "node:test";
import assert from "node:assert/strict";

import { imageMimeType, pickQuality } from "./imageUpload.ts";

test("both platforms pick the original file (GIFs intact, no slow re-encode)", () => {
  assert.equal(pickQuality("android"), 1);
  assert.equal(pickQuality("ios"), 1);
});

test("GIFs are sent as image/gif", () => {
  assert.equal(imageMimeType("meme.GIF"), "image/gif");
  assert.equal(imageMimeType("a.png"), "image/png");
  assert.equal(imageMimeType("photo.jpeg"), "image/jpeg");
  assert.equal(imageMimeType("noext"), "image/jpeg");
});
