import { useEffect, useMemo, useState } from 'react';
import { LatestKeySearch, keySearchScope, keySearchView, keyPreviewRequest, type KeySearchRequest, type KeySearchState } from '@/lib/deskKeySearch';
import type { KeyToken, KeySuggestion } from '@/lib/deskKeys';
import { isDeskAgent } from '@/lib/deskProtocol';
import type { DeskLink } from './useDeskLink';

export type KeyScope = { link: DeskLink; projectId: string | null | undefined; runId?: string; sample?: boolean };
export function useKeySearch(token: KeyToken | null, agent: string, context: KeyScope) {
  const { link, projectId, runId } = context;
  const request: KeySearchRequest | null = token && projectId && isDeskAgent(agent)
    ? { key: token.key, query: token.query, projectId, runId, agent } : null;
  const scope = keySearchScope(`${link.ownerId}:${link.info?.id ?? link.pair?.id}:${link.via}:${link.can.keys}`, request);
  const runner = useMemo(() => new LatestKeySearch(), []);
  const [state, setState] = useState<KeySearchState | null>(null);
  const unavailable = context.sample ? 'Sample desk · no filesystem search.'
    : link.role === 'web-controller' ? 'Browser mailbox transport does not support PC files, skills or commands.'
      : !link.calls ? 'Reconnect to the paired PC to search files, skills and commands.'
        : !link.can.keys ? 'Update Cellar on the PC for keys search.'
          : !projectId ? 'Select a linked project before searching PC sources.'
            : !isDeskAgent(agent) ? 'This run has no agent skill source.' : null;
  // JSON scope captures all request fields, avoiding fresh object dependencies on each keystroke.
  useEffect(() => {
    if (unavailable || !request) return;
    const timer = setTimeout(() => void runner.run(scope, () => link.calls!.keys(request), setState), 120);
    return () => { clearTimeout(timer); runner.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, unavailable, runner]);
  return { ...(unavailable ? { suggestions: [], notice: unavailable } : keySearchView(scope, state)), scope,
    preview: async (pick: KeySuggestion) => {
      const wanted = request && keyPreviewRequest(request, pick);
      if (unavailable || !wanted || !link.calls) throw new Error('File preview unavailable.');
      return link.calls.document({ projectId: wanted.projectId, runId: wanted.runId, agent: wanted.agent, path: wanted.path });
    } };
}
