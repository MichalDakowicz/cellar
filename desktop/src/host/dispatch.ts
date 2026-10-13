import type { ControlReceipt, QueuedMessage, RunControl, RunQueue } from '@/lib/deskDispatch';
import type { ManagedRuns } from './managedRuns.ts';
import type { ControlStore } from './controlStore.ts';
import { DeskError } from './claudeRuns.ts';
import type { DeskStart } from '@/lib/deskProtocol';

/** Serialize queue mutation and provider effects per chat. Other chats keep running. */
export class Dispatch {
  private locks = new Map<string, Promise<unknown>>();
  constructor(readonly store: ControlStore, readonly runtime: ManagedRuns,
    private readonly prepare: (item: QueuedMessage, start: DeskStart) => Promise<string> = async (item) => item.text) {
    runtime.onIdle = (owner, id) => { void this.serial(id, () => this.drain(owner, id)).catch(() => {}); };
  }
  serial<T>(id: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(work);
    this.locks.set(id, current);
    void current.finally(() => { if (this.locks.get(id) === current) this.locks.delete(id); }).catch(() => {});
    return current;
  }
  queue(owner: string, runId: string): RunQueue {
    const live = this.runtime.get(owner, runId);
    return { runId, available: !!live, busy: live?.session.busy() ?? false,
      items: this.store.items(owner, runId).filter((item) => !['delivered', 'cancelled'].includes(item.state)),
      ...(!live ? { reason: 'Original provider chat unavailable. Legacy, restarted and externally opened sessions cannot continue here; start a new task.' } : {}) };
  }
  async action(owner: string, request: RunControl): Promise<ControlReceipt> {
    return this.serial(request.runId!, async () => {
      const claim = this.store.begin(owner, request);
      if (!claim.fresh) return claim.receipt;
      let receipt = claim.receipt;
      try {
        const live = this.runtime.get(owner, request.runId!);
        if (!live) throw new DeskError('Original provider chat unavailable; nothing dispatched.', 409);
        let item: QueuedMessage;
        if (request.action === 'send') {
          item = { id: request.commandId, runId: request.runId!, text: request.text!, revision: 0, createdAt: Date.now(), source: request.source,
            settings: { agent: live.start.agent as 'claude' | 'codex', mode: live.start.mode ?? 'ask', model: 'provider default', effort: 'provider default' }, state: 'queued' };
          this.store.transaction(() => {
            this.store.saveItem(owner, item); this.store.saveReceipt(owner, { ...receipt, state: 'confirmed', item });
          });
          // Acceptance is durable even if the agent disappears before delivery.
          await this.drain(owner, item.runId);
          receipt = { ...receipt, state: 'confirmed', item: this.store.item(owner, item.runId, item.id)! };
          if (receipt.item!.state === 'unknown') receipt = { ...receipt, state: 'unknown', error: receipt.item!.error };
        } else {
          const found = this.store.item(owner, request.runId!, request.itemId!);
          if (!found || found.revision !== request.revision || found.state !== 'queued') throw new DeskError('Queued message changed or already dispatched. Refresh its original item.', 409);
          item = found;
          if (request.action === 'edit') item = { ...item, text: request.text!, revision: item.revision + 1 };
          else if (request.action === 'cancel') item = { ...item, state: 'cancelled', revision: item.revision + 1 };
          else if (request.action === 'promote') {
            // Mark before interruption. An ambiguous interruption cannot promote twice.
            item = { ...item, state: 'dispatching', revision: item.revision + 1 };
            this.store.saveItem(owner, item);
            try { await live.session.interrupt(); const text = await this.prepare(item, live.start); await live.session.send(text, item.id, item.text); item = { ...item, state: 'delivered' }; }
            catch (error) { item = { ...item, state: 'unknown', error: String(error) }; }
          } else throw new DeskError('Invalid queue action.');
          this.store.saveItem(owner, item);
          receipt = { ...receipt, item, state: item.state === 'unknown' ? 'unknown' : 'confirmed', error: item.error };
        }
      } catch (error) { receipt = { ...receipt, state: 'failed', error: error instanceof Error ? error.message : String(error) }; }
      this.store.saveReceipt(owner, receipt); return receipt;
    });
  }
  private async drain(owner: string, runId: string) {
    const live = this.runtime.get(owner, runId);
    const rows = this.store.items(owner, runId);
    // An uncertain message blocks later FIFO work until the user starts another chat.
    if (!live || live.session.busy() || rows.some((row) => ['dispatching', 'unknown'].includes(row.state))) return;
    const first = rows.find((row) => row.state === 'queued');
    if (!first) return;
    let item: QueuedMessage = { ...first, state: 'dispatching' }; this.store.saveItem(owner, item);
    try { const text = await this.prepare(item, live.start); await live.session.send(text, item.id, item.text); item = { ...item, state: 'delivered' }; }
    catch (error) { item = { ...item, state: 'unknown', error: String(error) }; }
    this.store.saveItem(owner, item);
  }
  async stop(owner: string, id: string, stop: () => Promise<void>) {
    return this.serial(id, async () => {
      await stop();
      this.store.transaction(() => { for (const item of this.store.items(owner, id)) if (item.state === 'queued') this.store.saveItem(owner, { ...item, state: 'cancelled', error: 'PC confirmed run stopped.' }); });
    });
  }
}
