import { useEffect, useMemo, useRef, useState } from 'react';
import { applySuggestion, keySuggestions, tokenAt, type KeySources } from '@/lib/deskKeys';
import { LatestKeySearch, keyNavigation, keySearchScope, keySearchView, keyPreviewRequest, tokenIdentity, type KeySearchRequest, type KeySearchState } from '@/lib/deskKeySearch';
import { isDeskAgent } from '@/lib/deskProtocol';
import type { Host } from './useHost';
import type { Cellar } from './useCellar';
import { calls } from './client';
import { SAMPLE_FILES, SAMPLE_SKILLS } from '@/lib/deskSample';

export function useKeys(text: string, write: (text: string) => void, host: Host, cellar: Pick<Cellar, 'projects' | 'entries'> | undefined, projectId: string | undefined, agent: string, runId?: string) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [dismissed, dismiss] = useState('');
  const [highlight, setHighlight] = useState({ token: '', index: 0 });
  const token = tokenAt(text, caret === null || caret > text.length ? text.length : caret);
  const identity = tokenIdentity(token);
  const request: KeySearchRequest | null = token && projectId && isDeskAgent(agent) ? { key: token.key, query: token.query, projectId, agent, runId } : null;
  const scope = keySearchScope(`${host.key}:${host.live}:${host.can.keys}`, request);
  const runner = useMemo(() => new LatestKeySearch(), []);
  const [state, setState] = useState<KeySearchState | null>(null);
  const sample = !!runId?.startsWith('sample-');
  const unavailable = sample ? 'Sample references · no host operations.'
    : !host.live ? 'Reconnect to the PC to search files, skills and commands.'
      : !host.can.keys ? 'Update host for keys search.'
        : !projectId ? 'Select a linked project before searching PC sources.'
          : !isDeskAgent(agent) ? 'This run has no agent skill source.' : null;
  useEffect(() => {
    if (unavailable || !request) return;
    const timer = setTimeout(() => void runner.run(scope, () => calls.keys(request), setState), 120);
    return () => { clearTimeout(timer); runner.cancel(); };
    // Request is captured in scope; object identity must not restart search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, unavailable, runner]);
  const remote = unavailable ? { suggestions: [], notice: unavailable } : keySearchView(scope, state);
  const sources: KeySources = { projects: cellar?.projects ?? [], entries: cellar?.entries ?? [], commands: sample ? ['test', 'apk'] : [], files: sample ? SAMPLE_FILES : [], skills: sample ? SAMPLE_SKILLS.codex : [] };
  const local = token && (token.key === '$' || sample) ? keySuggestions(token, sources) : [];
  const suggestions = [...remote.suggestions, ...local.filter((pick) => !remote.suggestions.some((row) => row.id === pick.id))].slice(0, 8);
  const selected = highlight.token === identity ? Math.min(highlight.index, Math.max(0, suggestions.length - 1)) : 0;
  const open = !!token && dismissed !== identity;
  const pick = (id: string) => {
    const chosen = suggestions.find((row) => row.id === id);
    if (!chosen || !token || !open) return;
    const next = applySuggestion(text, token, chosen);
    write(next.text); setCaret(next.caret); dismiss('');
    requestAnimationFrame(() => { field.current?.focus(); field.current?.setSelectionRange(next.caret, next.caret); });
  };
  return { field, list: open && token ? { key: token.key, suggestions, selected, notice: remote.notice, onPick: pick, scope,
    preview: async (id: string) => {
      const chosen = suggestions.find((row) => row.id === id);
      const wanted = request && chosen && keyPreviewRequest(request, chosen);
      if (unavailable || !wanted) throw new Error('File preview unavailable.');
      return calls.document({ projectId: wanted.projectId, runId: wanted.runId, agent: wanted.agent, path: wanted.path });
    } } : null,
    edit: (value: string) => { dismiss(''); write(value); },
    select: (end: number) => setCaret(end),
    keyboard: (key: string) => {
      if (!open) return false;
      const next = keyNavigation(key, selected, suggestions.length);
      if (next.close) dismiss(identity);
      if (next.pick) pick(suggestions[selected].id);
      setHighlight({ token: identity, index: next.index });
      return next.handled;
    },
  };
}
export type Keys = ReturnType<typeof useKeys>;
