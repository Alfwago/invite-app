/**
 * How the app reacts to failed API calls (1.6.2).
 *
 * Before 1.6.2 every query retried once on ANY error, including 401 — and
 * nothing signed the app out when the server stopped accepting its token
 * (e.g. the user logged out on another device). Each screen that mounted,
 * every return to the foreground and every invalidation sent another
 * doomed request, which on 2026-10-09 added up to ~1,000 requests in 30 s
 * from one phone and exhausted the server's database connections.
 *
 * Rules:
 *   - 401 (token missing/rejected): never retried; the AuthProvider signs
 *     the app out and shows the login screen (see client.ts
 *     `setUnauthorizedHandler`).
 *   - other 4xx (403 forbidden, 404, 400…): never retried — asking again
 *     gives the same answer.
 *   - 408 / 429 / 5xx / network failures: retried at most twice, with
 *     exponential backoff + jitter so many phones don't retry in lockstep.
 *
 * Pure (no React Native imports) so `npm test` can cover it.
 */

/** Retries after the first failure, for errors worth retrying. */
export const MAX_RETRIES = 2;

/** HTTP status of an ApiError-like error, or null for network errors etc. */
export function errorStatus(error: unknown): number | null {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

/** True when the server rejected (or we never had) a sign-in token. */
export function isAuthFailure(error: unknown): boolean {
  return errorStatus(error) === 401;
}

/** Worth asking again? Only transient failures are. */
export function isRetryable(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === null) return true; // network error / timeout
  if (status === 408 || status === 429) return true;
  return status >= 500;
}

/** React Query `retry` option. React Query passes 0 after the first
 *  failure, 1 after the second… (same as its numeric `retry: n`). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryable(error);
}

/** React Query `retryDelay`: 1 s, 2 s, 4 s … capped at 30 s, minus up to
 *  half of it at random so retries from many phones spread out. */
export function retryDelay(attemptIndex: number, random: () => number = Math.random): number {
  const base = Math.min(30_000, 1_000 * 2 ** attemptIndex);
  return Math.round(base * (0.5 + random() * 0.5));
}
