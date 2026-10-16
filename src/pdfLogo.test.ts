import { test } from "node:test";
import assert from "node:assert/strict";

import { asImageDataUri, firstLogo, imageMime, pdfLogoCandidates, secureUrl } from "./pdfLogo.ts";

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

test("http:// header URLs get https on an https API (TEST, server <= build 98)", () => {
  assert.equal(secureUrl("http://x.test/media/a.png", B), "https://x.test/media/a.png");
  assert.equal(secureUrl("http://localhost:8080/a.png", "http://localhost:8080"), "http://localhost:8080/a.png");
  assert.deepEqual(pdfLogoCandidates({ display_name: "Saturday Sticks", header_image_url: "http://x.test/media/s.png" }, B), [
    `${B}/media/s.png`,
    `${B}/static/invitations/Saturday.png`,
    `${B}/static/invitations/HeaderImage.png`,
  ]);
});

test("firstLogo: failures, throws and non-images fall through to the next", async () => {
  const warned: string[] = [];
  const got = await firstLogo(
    ["a", "b", "c", "d"],
    async (u) => {
      if (u === "a") throw new Error("network");
      if (u === "b") return "";
      return `data:image/png;base64,${u}`;
    },
    { warn: (m) => warned.push(m) },
  );
  assert.equal(got, "data:image/png;base64,c");
  assert.equal(warned.length, 2);
});

test("firstLogo: a slow download times out and the default is used", async () => {
  let aborted = false;
  const got = await firstLogo(
    ["slow", "default"],
    (u, signal) =>
      u === "slow"
        ? new Promise<string>((resolve) => {
            signal?.addEventListener("abort", () => {
              aborted = true;
              resolve("data:image/png;base64,LATE");
            });
          })
        : Promise.resolve("data:image/png;base64,DEF"),
    { timeoutMs: 30 },
  );
  assert.equal(got, "data:image/png;base64,DEF");
  assert.equal(aborted, true);
});

test("firstLogo: nothing works → empty", async () => {
  assert.equal(await firstLogo(["a"], async () => "", { timeoutMs: 30 }), "");
  assert.equal(await firstLogo([], async () => "x"), "");
});
