/**
 * Preview before deploy (docs/desk/screens.md, `Preview.dc.html`): a page the
 * pc serves, shown on the phone at the size it will be used at, with the checks
 * that say whether it is fit to ship and the deploy that ships it.
 *
 * Pure: the phone's preview screen and the desktop's right rail draw the same
 * frame and the same check rows off these.
 */

export type PreviewSize = 'phone' | 'tablet' | 'desktop';

export const PREVIEW_SIZES: { id: PreviewSize; label: string; width: number }[] = [
  { id: 'phone', label: 'phone', width: 390 },
  { id: 'tablet', label: 'tablet', width: 820 },
  { id: 'desktop', label: 'desktop', width: 1280 },
];

export type PreviewFrame = {
  /** The width the page lays itself out at. */
  width: number;
  /** The height it gets, before scaling — so the scaled page fills the frame. */
  height: number;
  /** Shrinks it into the room on screen; never grows it. */
  scale: number;
};

/**
 * How a page at `size` fits into `room` points across and `height` down.
 *
 * Wider than the room, it lays out at its own width and is scaled down to fit,
 * which is the whole point of picking tablet on a phone. Where the room is
 * narrower than a phone, "phone" lays out at the room's width: that is a phone.
 */
export function previewFrame(size: PreviewSize, room: number, height: number): PreviewFrame {
  const wanted = PREVIEW_SIZES.find((candidate) => candidate.id === size)?.width ?? PREVIEW_SIZES[0].width;
  const width = size === 'phone' ? Math.min(wanted, room) : wanted;
  const scale = room > 0 && width > room ? room / width : 1;
  return { width, height: Math.round(height / scale), scale };
}

export type PreviewLoad = 'connecting' | 'live' | 'gone';

export const PREVIEW_LOAD_LABEL: Record<PreviewLoad, string> = {
  connecting: 'connecting',
  live: 'live',
  gone: 'not answering',
};

/** The address bar: where the page is served from, the way you would type it. */
export function previewAddress(host: string, port: number, path = ''): string {
  const tail = path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${host} · lan :${port}${tail}`;
}

/** The path of a page's address, for the address bar: no scheme, no host, no query. */
export function pagePath(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '').split(/[?#]/)[0] || '/';
}

export type PreviewCheckState = 'passed' | 'failed' | 'running' | 'measure';

/** One line under "checks": a project's check command, or a figure it measures. */
export type PreviewCheck = {
  label: string;
  /** A command reads as a command; a figure ("bundle 2.1 mb") as words. */
  command: boolean;
  state: PreviewCheckState;
  detail: string;
};

/** "2 of 3 passed" — the one line a collapsed checks list, or a notification, says. */
export function checksSummary(checks: readonly PreviewCheck[]): string {
  const graded = checks.filter((check) => check.state !== 'measure');
  if (graded.length === 0) return 'no checks';
  if (graded.some((check) => check.state === 'running')) return 'checking…';
  const failed = graded.filter((check) => check.state === 'failed').length;
  if (failed > 0) return failed === 1 ? '1 check failed' : `${failed} checks failed`;
  return graded.length === 1 ? 'the check passed' : `all ${graded.length} checks passed`;
}

/** Deploy's button and the line under it. */
export type PreviewDeploy =
  | { kind: 'ready'; target: string }
  | { kind: 'deploying'; command: string; seconds: number }
  | { kind: 'blocked'; reason: string };

export function deployLine(deploy: PreviewDeploy): { label: string; meta: string; enabled: boolean } {
  switch (deploy.kind) {
    case 'ready':
      return { label: 'deploy', meta: `${deploy.target} · replaces what is live`, enabled: true };
    case 'deploying':
      return {
        label: 'deploying…',
        meta: `${deploy.command} · ${deploy.seconds}s so far · you can leave this screen`,
        enabled: false,
      };
    case 'blocked':
      return { label: 'deploy', meta: deploy.reason, enabled: false };
  }
}
