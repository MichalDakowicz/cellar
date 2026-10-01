/**
 * Where a session belongs.
 *
 * The tabs navigator redirects a signed-out session itself, but settings,
 * search, an entry and a project are all pushed *out* of the tabs — so signing
 * out on one of them left the screen sitting there, signed out, until something
 * else navigated. This is the rule the whole app runs, above the navigator.
 */
import { RETURN_ROUTE, SHARE_ROUTE } from './pingApps';

export const LOGIN_ROUTE = '/login';

/** The QR scanner: how a signed-out device is let in by a signed-in phone (PING.md §9.14). */
export const QR_SCAN_ROUTE = 'qr-scan';

/**
 * Where a signed-out session may stay: the login screen, the QR scanner, and both ends of a
 * sibling sign-in (lib/pingApps). Those two leave on their own once they have
 * answered — and bouncing the returning one to login would race the very
 * verifyOtp that is about to sign this session in.
 */
const SIGNED_OUT_ROUTES = new Set<string>(['login', SHARE_ROUTE, RETURN_ROUTE, QR_SCAN_ROUTE]);

type SessionRoute = {
  /** Auth has not resolved yet — nothing has mounted, so nothing moves. */
  loading: boolean;
  signedIn: boolean;
  /** First segment of the current route, `undefined` on the capture screen. */
  segment: string | undefined;
};

/** The route to send this session to, or null to leave it where it is. */
export function redirectForSession({ loading, signedIn, segment }: SessionRoute): string | null {
  if (loading || signedIn) return null;
  if (segment && SIGNED_OUT_ROUTES.has(segment)) return null;
  return LOGIN_ROUTE;
}
