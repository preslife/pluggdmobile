/** One short-lived, in-memory return destination. No professional details are stored. */
type PendingSplit = { path: string; expiresAt: number };
let pending: PendingSplit | null = null;
const MAX_AGE_MS = 15 * 60 * 1000;

export function rememberSplitJoinReturn(token: string, source: string = 'link'): boolean {
  pending = null;
  if (!/^[a-f0-9]{48}$/i.test(token)) return false;
  const safeSource = source === 'qr' ? 'qr' : 'link';
  pending = { path: `/split/join/${token}?source=${safeSource}`, expiresAt: Date.now() + MAX_AGE_MS };
  return true;
}

export function rememberSplitApprovalReturn(approvalId: string): boolean {
  pending = null;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(approvalId)) return false;
  pending = { path: `/split/approve/${approvalId}`, expiresAt: Date.now() + MAX_AGE_MS };
  return true;
}

/** Consume after successful sign-in, replacing the usual home navigation. Review only. */
export function consumePendingSplitReturn(): string | null {
  const saved = pending;
  pending = null;
  return saved && saved.expiresAt > Date.now() ? saved.path : null;
}

/** Clear on explicit sign-out/account switching. */
export function clearPendingSplitReturn(): void { pending = null; }
