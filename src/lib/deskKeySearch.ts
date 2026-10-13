import { isDeskAgent, type DeskAgent } from './deskProtocol';
import type { DeskKey, KeySuggestion, KeyToken } from './deskKeys';

/** Read-only search; no client-supplied filesystem root or process arguments. */
export type KeySearchRequest = { key: DeskKey; query: string; projectId: string; runId?: string; agent: DeskAgent };
export type KeySearchResult = { suggestions: KeySuggestion[]; notice: string | null };
export type KeyPreviewRequest = KeySearchRequest & { path: string; line: number };
export function keyPreviewRequest(request: KeySearchRequest, pick: KeySuggestion): KeyPreviewRequest | null {
  if (request.key !== '@' || !pick.id.startsWith('file:') || pick.id.endsWith('/')) return null;
  return { ...request, path: pick.id.slice(5), line: Number(/:(\d+)$/.exec(pick.insert)?.[1] ?? 1) };
}
export type KeySearchState = { scope: string; phase: 'loading' | 'ready' | 'failed'; result: KeySearchResult };
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function parseKeySearch(raw: unknown): KeySearchRequest {
  const row = raw as Partial<KeySearchRequest> | null;
  if (!row || !['@', '/', '$'].includes(String(row.key)) || typeof row.query !== 'string'
    || row.query.length > 256 || [...row.query].some((char) => char.charCodeAt(0) < 32) || !isDeskAgent(row.agent)
    || typeof row.projectId !== 'string' || !UUID.test(row.projectId)
    || (row.runId !== undefined && (typeof row.runId !== 'string' || !/^[\da-f]{6,16}$/.test(row.runId)))) {
    throw new Error('Invalid keys search scope.');
  }
  return { key: row.key!, query: row.query, projectId: row.projectId, agent: row.agent,
    ...(row.runId ? { runId: row.runId } : {}) };
}

export function readKeySearch(raw: unknown): KeySearchResult {
  const row = raw as KeySearchResult | null;
  if (!row || !Array.isArray(row.suggestions) || row.suggestions.length > 8
    || (row.notice !== null && typeof row.notice !== 'string') || row.suggestions.some((pick) =>
      !pick || ['id', 'insert', 'label', 'detail'].some((key) => typeof pick[key as keyof KeySuggestion] !== 'string')
      || typeof pick.mono !== 'boolean' || typeof pick.keepOpen !== 'boolean'
      || (pick.group !== null && typeof pick.group !== 'string'))) throw new Error('Invalid PC keys response.');
  return row;
}

/** Include owner, host, connection, workspace, agent and token. Old results never become current. */
export function keySearchScope(identity: string, request: KeySearchRequest | null): string {
  return JSON.stringify([identity, request]);
}

export function keySearchView(scope: string, state: KeySearchState | null): KeySearchResult {
  if (!state || state.scope !== scope) return { suggestions: [], notice: state ? 'Search changed · refreshing results…' : 'Searching PC…' };
  return state.result;
}

/** Shared keyboard rule. Enter retains the composer's existing delivery behavior. */
export function keyNavigation(key: string, index: number, count: number): { handled: boolean; index: number; pick: boolean; close: boolean } {
  const handled = ['ArrowUp', 'ArrowDown', 'Tab', 'Escape'].includes(key);
  const next = count ? (index + (key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0) + count) % count : 0;
  return { handled: handled && (count > 0 || key === 'Escape'), index: next, pick: key === 'Tab' && count > 0, close: key === 'Escape' };
}

export function tokenIdentity(token: KeyToken | null): string {
  return JSON.stringify(token);
}

/** Pure lifetime guard, used by both platform hooks. Late failures are stale too. */
export class LatestKeySearch {
  private revision = 0;
  cancel() { this.revision++; }
  async run(scope: string, load: () => Promise<KeySearchResult>, publish: (state: KeySearchState) => void) {
    const revision = ++this.revision;
    publish({ scope, phase: 'loading', result: { suggestions: [], notice: 'Searching PC…' } });
    try {
      const result = await load();
      if (revision === this.revision) publish({ scope, phase: 'ready', result });
    } catch (error) {
      if (revision === this.revision) publish({ scope, phase: 'failed', result: { suggestions: [], notice: error instanceof Error ? error.message : String(error) } });
    }
  }
}
