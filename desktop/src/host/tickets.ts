import { randomBytes } from 'node:crypto';

/**
 * How a browser on the phone is let into something the pc serves.
 *
 * A web page, the screen view and an APK download are all opened in the
 * phone's browser, which cannot send the bearer key the app carries. So the app
 * asks for a ticket over the authenticated API, opens a link with it, and the
 * ticket is spent on the first use — for a page, by setting a cookie that lets
 * the page's own scripts, images and sockets through for a while; for a
 * download, by sending the file.
 *
 * A ticket lives a minute. A link that leaks into a history or a screenshot is
 * worth nothing by the time anyone reads it. The session it opens is bound to
 * the address that redeemed it: the LAN is plain HTTP, and a cookie lifted off
 * the air is no use from another machine.
 */

export type Ticket =
  | { kind: 'view'; port: number }
  | { kind: 'screen' }
  | { kind: 'apk'; app: string };

const TICKET_MS = 60_000;
const SESSION_MS = 4 * 60 * 60_000;

export const VIEW_COOKIE = '__cellar_desk';

export class Tickets {
  private readonly tickets = new Map<string, { ticket: Ticket; expires: number }>();
  private readonly sessions = new Map<string, { expires: number; from: string }>();

  constructor(private readonly now: () => number = Date.now) {}

  issue(ticket: Ticket): string {
    const token = randomBytes(24).toString('base64url');
    this.tickets.set(token, { ticket, expires: this.now() + TICKET_MS });
    return token;
  }

  /** The ticket, once. A second redemption — or a late one — is null. */
  redeem(token: string): Ticket | null {
    const found = this.tickets.get(token);
    this.tickets.delete(token);
    if (!found || found.expires < this.now()) return null;
    return found.ticket;
  }

  openSession(from: string): string {
    const token = randomBytes(24).toString('base64url');
    this.sessions.set(token, { expires: this.now() + SESSION_MS, from });
    return token;
  }

  validSession(token: string | null, from: string): boolean {
    if (!token) return false;
    const session = this.sessions.get(token);
    if (!session) return false;
    if (session.expires < this.now()) {
      this.sessions.delete(token);
      return false;
    }
    return session.from === from;
  }

  /** Forget every browser at once — what "forget paired phones" also means for pages left open. */
  clear(): void {
    this.tickets.clear();
    this.sessions.clear();
  }
}

/** Our cookie out of a Cookie header. */
export function viewCookie(header: string | undefined): string | null {
  for (const part of (header ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === VIEW_COOKIE) return value.join('=') || null;
  }
  return null;
}

/** The Cookie header with ours taken out, so the page being proxied never sees it. */
export function withoutViewCookie(header: string | undefined): string | undefined {
  if (!header) return header;
  const kept = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${VIEW_COOKIE}=`));
  return kept.length ? kept.join('; ') : undefined;
}

export function sessionCookie(token: string): string {
  return `${VIEW_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}
