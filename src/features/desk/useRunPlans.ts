import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';
import { useCellar } from '@/features/cellar/useCellar';
import type { OrchestrationRequest } from '@/lib/deskOrchestration';
import type { DeskAgent } from '@/lib/deskProtocol';
import { useDeskLink } from './useDeskLink';

const local = (at: number) => { const d = new Date(at); return new Date(at - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' '); };
export function useRunPlans(kind: OrchestrationRequest['kind']) {
  const link = useDeskLink(); const { projects, shelves } = useCellar(); const calls = link.can.local ? link.calls : null;
  const query = useQuery({ queryKey: ['desk-plans', link.ownerId, link.info?.id], queryFn: () => calls!.orchestrations(), enabled: !!calls, refetchInterval: 5000, retry: false });
  const [prompt, setPrompt] = useState(''); const [selected, setSelected] = useState<string[]>([]);
  const [agent, setAgent] = useState<DeskAgent>('codex'); const [second, setSecond] = useState<DeskAgent>('codex');
  const [startsAt, setStartsAt] = useState(() => local(Date.now() + 60_000)); const [endsAt, setEndsAt] = useState(() => local(Date.now() + 3 * 3600_000)); const [cap, setCap] = useState('3'); const [reserve, setReserve] = useState('20');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [follow, setFollow] = useState('');
  const pending = useRef<OrchestrationRequest | null>(null);
  async function act(work: () => Promise<unknown>) { if (!calls || busy) return; setBusy(true); setMessage(''); try { await work(); await query.refetch(); } catch (e) { setMessage(String(e)); } finally { setBusy(false); } }
  const folders = projects.filter((p) => !!p.repoPath);
  return { prompt, setPrompt, agent, setAgent, second, setSecond, startsAt, setStartsAt, endsAt, setEndsAt, cap, setCap, reserve, setReserve, message: message || (query.error ? String(query.error) : !calls ? 'Connect directly to the PC to create or read run plans.' : ''), busy, enabled: !!calls,
    projects: folders.map((p) => ({ id: p.id, name: p.name, selected: selected.includes(p.id) })),
    shelves, selectShelf: (id: string) => setSelected(folders.filter((p) => p.shelfId === id).map((p) => p.id)),
    pick: (id: string) => setSelected(kind === 'race' ? [id] : selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]),
    plans: calls && !query.error ? (query.data ?? []).filter((p) => p.kind === kind) : [], follow, setFollow,
    create: () => act(async () => {
      const request = pending.current ?? { commandId: Crypto.randomUUID(), kind, prompt, projectIds: selected, agents: kind === 'race' ? [agent, second] : [agent], mode: 'ask' as const,
        ...(kind === 'night' ? { startsAt: new Date(startsAt.replace(' ', 'T')).getTime(), endsAt: new Date(endsAt.replace(' ', 'T')).getTime(), maxRuns: Number(cap), reservePercent: Number(reserve) } : {}) };
      pending.current = request; await calls!.orchestrate(request); pending.current = null; setPrompt(''); setMessage('Plan saved on PC.');
    }),
    action: (id: string, action: 'pick' | 'keep' | 'toss' | 'stop' | 'follow', runId?: string) => act(async () => { const receipt = await calls!.orchestrationAction({ commandId: Crypto.randomUUID(), id, action, runId, ...(action === 'follow' ? { text: follow } : {}) }); setMessage(receipt.error ?? receipt.state); }),
  };
}
