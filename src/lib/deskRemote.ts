export type ScreenInput =
  | { kind: 'click'; right?: boolean }
  | { kind: 'tap'; x: number; y: number; right?: boolean }
  | { kind: 'move'; x: number; y: number }
  | { kind: 'scroll'; amount: number }
  | { kind: 'key'; key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }
  | { kind: 'text'; text: string };

export const REMOTE_KEYS = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Space'] as const;
export function screenInput(raw: unknown): ScreenInput {
  const v = raw as ScreenInput;
  if (!v || typeof v !== 'object') throw new Error('Invalid screen input.');
  const number = (n: unknown, limit: number) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= limit;
  if (v.kind === 'click' && (v.right === undefined || typeof v.right === 'boolean')) return { kind: 'click', right: v.right === true };
  if (v.kind === 'tap' && number(v.x, 1) && number(v.y, 1) && v.x >= 0 && v.y >= 0 && (v.right === undefined || typeof v.right === 'boolean')) return { kind: v.kind, x: v.x, y: v.y, right: v.right === true };
  if (v.kind === 'move' && number(v.x, 1) && number(v.y, 1)) return { kind: v.kind, x: v.x, y: v.y };
  if (v.kind === 'scroll' && number(v.amount, 1200)) return { kind: v.kind, amount: Math.round(v.amount) };
  if (v.kind === 'text' && typeof v.text === 'string' && v.text.length > 0 && v.text.length <= 2000 && !v.text.includes('\0')) return { kind: v.kind, text: v.text };
  if (v.kind === 'key' && typeof v.key === 'string' && ((REMOTE_KEYS as readonly string[]).includes(v.key) || /^[a-z0-9]$/i.test(v.key)) && [v.ctrl, v.alt, v.shift].every((x) => x === undefined || typeof x === 'boolean')) return { kind: v.kind, key: v.key, ctrl: v.ctrl === true, alt: v.alt === true, shift: v.shift === true };
  throw new Error('Invalid screen input.');
}

/** Coordinates in a contained image; taps on letterboxing never reach the host. */
export function screenPoint(x: number, y: number, width: number, height: number, aspect: number) {
  if (![x, y, width, height, aspect].every(Number.isFinite) || width <= 0 || height <= 0 || aspect <= 0) return null;
  const w = Math.min(width, height * aspect); const h = w / aspect;
  const left = (width - w) / 2; const top = (height - h) / 2;
  if (x < left || x > left + w || y < top || y > top + h) return null;
  return { x: (x - left) / w, y: (y - top) / h };
}

/** Natural touch scrolling: drag content up -> negative Windows wheel delta. */
export function screenScroll(startY: number, endY: number) { return Math.max(-1200, Math.min(1200, Math.round((endY - startY) * 3))); }

export type ScreenDisplay = { id: string; name: string; aspect: number; primary: boolean };
export type ScreenAccess = { id: string; expiresAt: number; aspect: number; controls: boolean; displayId?: string; displays?: ScreenDisplay[] };
export type PhoneDevice = { serial: string; state: string; model: string };
export type PhoneState = { devices: PhoneDevice[]; driver: 'watch' | 'you' | 'agent'; agentAccess: boolean; taps: { x: number; y: number; at: number }[]; video: boolean };
export type PhoneAction = { serial: string; action: 'driver' | 'agentAccess' | 'tap' | 'swipe' | 'key' | 'text' | 'link' | 'install' | 'toggle'; value?: string; enabled?: boolean; x?: number; y?: number; x2?: number; y2?: number; frameSize?: { width: number; height: number }; runId?: string; actor?: 'you' | 'agent' };
