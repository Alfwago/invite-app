import { isAccountPendingError } from "@/src/pendingAccount";
import Constants from "expo-constants";

/**
 * Base URL of the invite-server. Resolution order:
 *   1. EXPO_PUBLIC_API_URL   (set via .env.local for dev / test builds)
 *   2. app.json > expo.extra.apiUrl   (the baked-in production default)
 */
const RAW_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "https://invites.falcon83.com";

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown, message?: string) {
    super(message ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }

  /** Best-effort human-readable message pulled from a DRF error body. */
  get detail(): string {
    const p = this.payload as Record<string, unknown> | string | null;
    if (typeof p === "string" && p) {
      // An HTML error page (Django 404/500) isn't worth showing verbatim.
      if (/^\s*<(!doctype|html)/i.test(p)) {
        return this.status === 404
          ? "That endpoint doesn't exist on this server — check the API URL / that the server is up to date."
          : `Server error (${this.status}).`;
      }
      return p;
    }
    if (p && typeof p === "object") {
      if (typeof p.detail === "string") return p.detail;
      const firstKey = Object.keys(p)[0];
      const val = firstKey ? (p as Record<string, unknown>)[firstKey] : undefined;
      if (Array.isArray(val) && typeof val[0] === "string") return val[0];
      if (typeof val === "string") return val;
    }
    return this.message;
  }
}

type TokenProvider = () => string | null;

let getToken: TokenProvider = () => null;

/** Wired up once by the AuthProvider so every request can attach the token. */
export function setTokenProvider(fn: TokenProvider) {
  getToken = fn;
}

let onUnauthorized: (() => void) | null = null;

/** Called (by the AuthProvider) when the server rejects the token a request
 *  carried with a 401 — signed out on another device, token revoked. The
 *  handler signs the app out; see src/api/retryPolicy.ts for why. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

let onAccountPending: (() => void) | null = null;

/** Called (by the AuthProvider) when the server answers 403 "account_pending"
 *  (server 0.39.2): the account isn't approved/verified, so it reloads /me/
 *  and the navigator moves to the Pending screen. */
export function setAccountPendingHandler(fn: (() => void) | null) {
  onAccountPending = fn;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** A FormData body — sent as-is, letting fetch set the multipart boundary. */
  form?: FormData;
  /** Skip the Authorization header (used by the login call). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, anonymous = false, signal } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let sentToken: string | null = null;
  if (!anonymous) {
    sentToken = getToken();
    // Signed out: don't ask the server — it can only answer 401. (Before
    // 1.6.2 the login screen's background Home query did, over and over.)
    if (!sentToken) throw new ApiError(401, { detail: "You're signed out." });
    headers["Authorization"] = `Token ${sentToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal,
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    // Only when the token we sent is still the current one — a late reply
    // to a request from before a fresh sign-in mustn't sign that out.
    if (res.status === 401 && sentToken && sentToken === getToken()) onUnauthorized?.();
    if (sentToken && sentToken === getToken() && isAccountPendingError(res.status, data)) onAccountPending?.();
    throw new ApiError(res.status, data ?? text);
  }
  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
