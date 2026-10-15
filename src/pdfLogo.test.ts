import { test } from "node:test";
import assert from "node:assert/strict";

import { asImageDataUri, imageMime, pdfLogoCandidates } from "./pdfLogo.ts";

const B = "https://x.test";

test("server header first, then the name guess, then the default", () => {
  assert.deepEqual(
    pdfLogoCandidates({ display_name: "Monday Mules", header_image_url: `${B}/media/m.png` }, B),
    [`${B}/media/m.png`, `${B}/static/invitations/Monday.png`, `${B}/static/invitations/HeaderImage.png`],
  );
});

test("older server: no header_image_url", () => {
  assert.deepEqual(pdfLogoCandidates({ display_name: "Thursday Night" }, B), [
    `${B}/static/invitations/Thursday.png`,
    `${B}/static/invitations/HeaderImage.png`,
  ]);
});

test("no duplicates; no event", () => {
  assert.deepEqual(
    pdfLogoCandidates({ display_name: "Monday", header_image_url: `${B}/static/invitations/Monday.png` }, B),
    [`${B}/static/invitations/Monday.png`, `${B}/static/invitations/HeaderImage.png`],
  );
  assert.deepEqual(pdfLogoCandidates(undefined, B), [`${B}/static/invitations/HeaderImage.png`]);
});

test("imageMime", () => {
  assert.equal(imageMime("image/png", "x"), "image/png");
  assert.equal(imageMime("", "https://a/b/c.JPG?v=1"), "image/jpeg");
  assert.equal(imageMime("application/octet-stream", "https://a/b.png"), "image/png");
  assert.equal(imageMime(undefined, "https://a/b"), null);
});

test("asImageDataUri retypes octet-stream, refuses non-images", () => {
  assert.equal(asImageDataUri("data:image/png;base64,AAA", null), "data:image/png;base64,AAA");
  assert.equal(asImageDataUri("data:application/octet-stream;base64,AAA", "image/png"), "data:image/png;base64,AAA");
  assert.equal(asImageDataUri("data:text/html;base64,AAA", null), null);
  assert.equal(asImageDataUri("not a data url", "image/png"), null);
});
