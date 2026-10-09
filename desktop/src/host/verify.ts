import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { parseDeskAuth, SIGN_WINDOW_MS, signingString } from '@/lib/deskSign';

/**
 * The pc's half of `src/lib/deskSign.ts`: rebuild the signed string, recompute
 * the HMAC with the paired key, and refuse anything stale or seen before.
 *
 * Nonces are remembered for twice the clock window, which is as long as a
 * captured request could still pass the timestamp check — after that the
 * timestamp refuses it on its own.
 */
export class Signatures {
  private readonly seen = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  verify(input: { header: string | undefined; method: string; path: string; body: string; key: string }): boolean {
    const auth = parseDeskAuth(input.header);
    if (!auth) return false;
    const now = this.now();
    if (Math.abs(now - auth.ts) > SIGN_WINDOW_MS) return false;

    this.prune(now);
    if (this.seen.has(auth.nonce)) return false;

    const bodyHash = createHash('sha256').update(input.body, 'utf8').digest('hex');
    const expected = createHmac('sha256', input.key)
      .update(signingString(input.method, input.path, auth.ts, auth.nonce, bodyHash))
      .digest();
    const given = Buffer.from(auth.sig, 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

    this.seen.set(auth.nonce, now + 2 * SIGN_WINDOW_MS);
    return true;
  }

  private prune(now: number): void {
    for (const [nonce, expires] of this.seen) if (expires < now) this.seen.delete(nonce);
  }
}
