import type { DeskPair } from '@/lib/deskPair';

/**
 * The pc's side, as Cellar's own window sees it inside the desktop app.
 *
 * `window.cellarDesk` exists only there — the desktop preload puts it on the
 * page (desktop/src/preload.ts; change both together). Its `request` is the
 * same API a paired phone reaches over the LAN, answered in-process, so the
 * screens never care which of the two they are talking to.
 */

/** Where the desktop app listens for Google's answer — desktop/src/oauth.ts. On Supabase's redirect list. */
export const DESKTOP_OAUTH_CALLBACK = 'http://127.0.0.1:54545/callback';

export type DeskPairing = { url: string; pair: DeskPair } | { url: null; reason: string };

export type DeskBridge = {
  version: number;
  request: (method: string, path: string, body?: unknown) => Promise<{ status: number; body: unknown }>;
  pairing: () => Promise<DeskPairing>;
  setSession: (session: { accessToken: string; userId: string } | null) => Promise<void>;
  forgetPhones: () => Promise<void>;
  rename: (name: string) => Promise<boolean>;
  status: () => Promise<{ fallback: 'off' | 'on' | 'missing schema' | 'signed out' }>;
  /** Opens Google's sign-in in the real browser and resolves with the code that lands on the loopback. */
  googleSignIn: (authorizeUrl: string) => Promise<{ code: string } | { error: string }>;
};

/** The bridge, or null anywhere but the desktop app's window. */
export function deskBridge(): DeskBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { cellarDesk?: DeskBridge }).cellarDesk;
  return bridge && typeof bridge.request === 'function' ? bridge : null;
}
