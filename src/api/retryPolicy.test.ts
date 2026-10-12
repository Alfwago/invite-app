import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_RETRIES,
  errorStatus,
  isAuthFailure,
  isRetryable,
  retryDelay,
  shouldRetry,
} from "./retryPolicy.ts";

const http = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
const network = new TypeError("Network request failed");

test("errorStatus: ApiError-like errors carry a status, network errors don't", () => {
  assert.equal(errorStatus(http(401)), 401);
  assert.equal(errorStatus(network), null);
  assert.equal(errorStatus(null), null);
  assert.equal(errorStatus(undefined), null);
});

test("isAuthFailure: only 401 signs the app out (403 is 'not allowed', not 'signed out')", () => {
  assert.equal(isAuthFailure(http(401)), true);
  assert.equal(isAuthFailure(http(403)), false);
  assert.equal(isAuthFailure(http(500)), false);
  assert.equal(isAuthFailure(network), false);
});

test("shouldRetry: never retries 401 or 403 — the 2026-10-09 burst", () => {
  for (let n = 0; n < 5; n++) {
    assert.equal(shouldRetry(n, http(401)), false);
    assert.equal(shouldRetry(n, http(403)), false);
  }
});

test("shouldRetry: other 4xx aren't retried either", () => {
  for (const s of [400, 404, 405, 409, 410, 422]) assert.equal(shouldRetry(0, http(s)), false, String(s));
});

test("shouldRetry: network errors, 5xx, 408 and 429 retry at most MAX_RETRIES times", () => {
  for (const e of [network, http(500), http(502), http(503), http(408), http(429)]) {
    assert.equal(isRetryable(e), true);
    for (let n = 0; n < MAX_RETRIES; n++) assert.equal(shouldRetry(n, e), true);
    assert.equal(shouldRetry(MAX_RETRIES, e), false);
  }
  assert.equal(MAX_RETRIES, 2);
});

test("retryDelay: exponential backoff, capped at 30 s, with jitter", () => {
  const hi = () => 0.999999; // ~full delay
  const lo = () => 0; // half delay
  assert.equal(retryDelay(0, hi), 1000);
  assert.equal(retryDelay(1, hi), 2000);
  assert.equal(retryDelay(2, hi), 4000);
  assert.equal(retryDelay(10, hi), 30000);
  assert.equal(retryDelay(0, lo), 500);
  assert.equal(retryDelay(10, lo), 15000);
  for (let i = 0; i < 50; i++) {
    const d = retryDelay(1);
    assert.ok(d >= 1000 && d <= 2000, String(d));
  }
});
