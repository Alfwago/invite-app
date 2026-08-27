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
    if (typeof p === "string" && p) return p;
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

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Skip the Authorization header (used by the login call). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, anonymous = false, signal } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!anonymous) {
    const token = getToken();
    if (token) headers["Authorization"] = `Token ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
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
