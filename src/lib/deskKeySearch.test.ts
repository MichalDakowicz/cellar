import { LatestKeySearch, keyNavigation, keySearchScope, keySearchView, parseKeySearch, readKeySearch, type KeySearchState } from './deskKeySearch';
import { applySuggestion, keyPlan, keySuggestions, tokenAt, type KeySources } from './deskKeys';
import { appCapabilities } from './deskAppRole';

const request = { key: '@' as const, query: 'src:42', projectId: '00000000-0000-4000-8000-000000000010', runId: 'abcdef01', agent: 'codex' as const };
const empty = { suggestions: [], notice: null };
const sources: KeySources = { files: [{ path: 'src/old.ts', changed: false }, { path: 'src/new file.ts', changed: true }, { path: 'src/', changed: true }], skills: [], commands: [], projects: [], entries: [] };
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { resolve, reject, promise }; };

test('changed files and folders precede unchanged files, preserving quoted line references and surrounding text', () => {
  const token = tokenAt('fix @src:42 please', 11)!;
  const results = keySuggestions(token, sources);
  expect(results.map((row) => row.insert)).toEqual(['@"src/new file.ts":42', '@src/', '@src/old.ts:42']);
  expect(results[1].keepOpen).toBe(true);
  const next = applySuggestion('fix @src:42 please', token, results[0]);
  expect(next).toEqual({ text: 'fix @"src/new file.ts":42 please', caret: 26 });
  expect(tokenAt(next.text, 16)).toEqual({ key: '@', query: 'src/new file.ts:42', start: 4, end: 25 });
  expect(keyPlan(next.text, sources)).toEqual([{ key: '@', token: '@"src/new file.ts":42', says: 'hands the agent that file first, at line 42' }]);
});

test('request validates agent, project and run without accepting arbitrary roots', () => {
  expect(parseKeySearch({ ...request, cwd: 'C:/other' })).toEqual(request);
  for (const patch of [{ agent: 'other' }, { projectId: '../' }, { runId: '../' }, { key: '#' }, { query: 'a\0b' }, { query: 'x'.repeat(257) }]) expect(() => parseKeySearch({ ...request, ...patch })).toThrow();
  expect(() => readKeySearch({ suggestions: [{ insert: '@leak' }], notice: null })).toThrow();
});

test('changed identity hides old matches immediately before the next effect starts', () => {
  const before = keySearchScope('owner:host:lan:true', request);
  const state: KeySearchState = { scope: before, phase: 'ready', result: { suggestions: keySuggestions(tokenAt('@')!, sources), notice: null } };
  for (const after of [keySearchScope('other:host:lan:true', request), keySearchScope('owner:other:lan:true', request), keySearchScope('owner:host:none:false', request), keySearchScope('owner:host:lan:true', { ...request, runId: '12345678' }), keySearchScope('owner:host:lan:true', { ...request, agent: 'claude' }), keySearchScope('owner:host:lan:true', { ...request, query: 'different' })]) {
    expect(keySearchView(after, state).suggestions).toEqual([]);
    expect(keySearchView(after, state).notice).toContain('Search changed');
  }
});

test('late success and failure cannot overwrite a newer search', async () => {
  const runner = new LatestKeySearch();
  const old = deferred<typeof empty>();
  const states: KeySearchState[] = [];
  const pending = runner.run('old', () => old.promise, (state) => states.push(state));
  await runner.run('new', async () => ({ ...empty, notice: 'current' }), (state) => states.push(state));
  old.reject(new Error('old failed')); await pending;
  expect(states.at(-1)?.result.notice).toBe('current');
  const late = deferred<typeof empty>();
  const cancelled = runner.run('gone', () => late.promise, (state) => states.push(state));
  runner.cancel(); late.resolve(empty); await cancelled;
  expect(states.at(-1)?.phase).toBe('loading');
});

test('keyboard wraps, Tab inserts, Escape closes, Enter keeps existing send semantics', () => {
  expect(keyNavigation('ArrowUp', 0, 3).index).toBe(2);
  expect(keyNavigation('ArrowDown', 2, 3).index).toBe(0);
  expect(keyNavigation('Tab', 1, 3).pick).toBe(true);
  expect(keyNavigation('Escape', 0, 0).close).toBe(true);
  expect(keyNavigation('Tab', 0, 0).handled).toBe(false);
  expect(keyNavigation('Enter', 0, 3).handled).toBe(false);
});

test('host search advertisement never grants browser local discovery', () => {
  const info = { keysProtocol: 1 as const } as Parameters<typeof appCapabilities>[2];
  expect(appCapabilities('phone-controller', 'lan', info).keys).toBe(true);
  expect(appCapabilities('desktop-host', 'bridge', info).keys).toBe(true);
  for (const via of ['none', 'lan', 'bridge', 'cellar'] as const) expect(appCapabilities('web-controller', via, info).keys).toBe(false);
});
