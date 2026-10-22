// Pending accounts (app 1.8.1 / server 0.39.2, owner 2026-10-22): until a
// director approves the account and its email is verified, it can only see
// its profile, resend the verification email, delete the account and sign
// out. The server enforces it (403 code "account_pending"); the app shows
// the Pending screen instead of tabs it can't use. Mirrors the server's
// account_gate.pending_reason: directors always pass.

export type PendingReason = "approval" | "verify";

interface MeLike {
  is_director: boolean;
  director_approved: boolean;
  email_verified: boolean;
}

export function pendingReason(me: MeLike | null | undefined): PendingReason | null {
  if (!me || me.is_director) return null;
  if (!me.director_approved) return "approval";
  if (!me.email_verified) return "verify";
  return null;
}

/** Routes a pending account may still open (expo-router segments). */
export function allowedWhilePending(segments: readonly string[]): boolean {
  const [first, second] = segments;
  if (first === "pending" || first === "delete-account" || first === "login" || first === "signup") return true;
  return first === "(tabs)" && second === "profile";
}

/** The server's 403 for a pending account (0.39.2). */
export function isAccountPendingError(status: number, data: unknown): boolean {
  return status === 403 && !!data && typeof data === "object" && (data as { code?: unknown }).code === "account_pending";
}

export const PENDING_COPY: Record<PendingReason, { title: string; body: string }> = {
  approval: {
    title: "Awaiting director approval",
    body: "Your account is waiting for a director to approve it. We'll email you when it's approved. Until then you can update your profile, resend the verification email, or delete your account.",
  },
  verify: {
    title: "Verify your email",
    body: "You're approved. Open the link we emailed you to finish setting up your account, then tap Check again.",
  },
};
