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

/**
 * Where a signed-out session may stay: the login screen, and both ends of a
 * sibling sign-in (lib/pingApps). Those two leave on their own once they have
 * answered — and bouncing the returning one to login would race the very
 * verifyOtp that is about to sign this session in.
 */
const SIGNED_OUT_ROUTES = new Set<string>(['login', SHARE_ROUTE, RETURN_ROUTE]);

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
