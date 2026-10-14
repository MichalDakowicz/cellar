import { writablePicture, type NewPicture } from './entryPicture';
export type DebugCrash = { owner: string | null; signature: string; stack: string; log: string; count: number; at: number; picture?: NewPicture };
export function readDebugCrashes(raw: string): DebugCrash[] {
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length > 10) throw new Error('Invalid local crash queue.');
  return rows.map((r) => {
    if (!r || !/^[a-f0-9]{64}$/.test(r.signature) || typeof r.stack !== 'string' || r.stack.length > 32000 || typeof r.log !== 'string' || r.log.length > 32000 || !Number.isInteger(r.count) || r.count < 1 || !Number.isFinite(r.at)) throw new Error('Invalid crash report.');
    return { owner: typeof r.owner === 'string' ? r.owner : null, signature: r.signature, stack: r.stack, log: r.log, count: r.count, at: r.at, ...(r.picture && writablePicture(r.picture) ? { picture: r.picture } : {}) };
  });
}
export function redactCrash(text: string) {
  return text.replace(/(authorization)\s*[:=]\s*(?:Bearer\s+)?[^\s,]+/gi, '$1=[redacted]').replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*[^\s,]+/gi, '$1=[redacted]')
    .replace(/\b(?:sk-|eyJ)[A-Za-z0-9_.-]{12,}/g, '[redacted]').slice(0, 32000);
}
export function crashUuid(hash: string) { return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`; }
