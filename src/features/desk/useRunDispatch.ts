import { useQuery } from '@tanstack/react-query';
import { controlMessage, type QueuedMessage, type RunControl } from '@/lib/deskDispatch';
import type { DeskLink } from './useDeskLink';
import { useRunControl } from './useRunControl';

export function useRunDispatch(link: DeskLink, id: string, live: boolean, draft: string, onDraft: (text: string) => void) {
  const connected = live && !!link.calls && link.info?.dispatchProtocol === 1;
  const action = useRunControl(link, `chat:${id}`, connected);
  const stop = useRunControl(link, `stop:${id}`, connected);
  const queue = useQuery({ queryKey: ['desk', 'queue', link.ownerId, link.info?.id, id], queryFn: () => link.calls!.queue(id),
    enabled: connected, refetchInterval: 1500, staleTime: 0, refetchOnMount: 'always', retry: false });
  const current = connected && queue.isSuccess && queue.isFetchedAfterMount ? queue.data : null;
  const submit = async (input?: Omit<RunControl, 'commandId' | 'source'>) => {
    const result = await action.submit(input);
    if (result?.receipt.state === 'confirmed' && result.request.action === 'send' && draft.trim() === result.request.text?.trim()) onDraft('');
    void queue.refetch();
  };
  const change = (item: QueuedMessage, kind: 'promote' | 'cancel' | 'edit', text?: string) => void submit({ action: kind, runId: id, itemId: item.id, revision: item.revision, ...(text !== undefined ? { text } : {}) });
  return {
    queued: current?.items ?? [],
    queueBusy: action.busy || action.pending || !connected,
    onPromote: (item: QueuedMessage) => change(item, 'promote'),
    onCancel: (item: QueuedMessage) => change(item, 'cancel'),
    onEdit: (item: QueuedMessage, text: string) => change(item, 'edit', text),
    disabledReason: !connected ? 'Reconnect to an updated PC for chat delivery.' : action.busy ? 'PC is confirming your message…'
      : action.pending ? 'Check the original receipt before another message.' : !draft.trim() ? 'Write a message.'
        : queue.isError ? 'PC queue unavailable. Reconnect before sending.' : !current ? 'Reading PC queue…' : !current.available ? current.reason ?? 'Original provider chat unavailable.' : null,
    onSend: () => void submit({ action: 'send', runId: id, text: draft.trim() }),
    onRecover: action.pending && connected && !action.busy ? () => void submit() : undefined,
    deliveryMessage: action.message,
    stopping: stop.busy,
    stopPending: stop.pending,
    stopMessage: stop.message,
    stop: async () => { const result = await stop.submit({ action: 'stop', runId: id }); if (result) return controlMessage(result.receipt); return null; },
  };
}
