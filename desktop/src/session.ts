import type { DeskSession } from './host/account.ts';

/** What the window says the session is, checked before the host trusts it. Null signs the host out. */
export function readSession(raw: unknown): DeskSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const { accessToken, userId } = raw as Record<string, unknown>;
  if (typeof accessToken !== 'string' || accessToken.length < 20) return null;
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  return { accessToken, userId };
}
