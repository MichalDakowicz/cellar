import { randomUUID } from 'node:crypto';
import { readRunControl, type ControlReceipt, type HostStop, type RunControl, type StopResult } from '@/lib/deskDispatch';
import type { HostDeps } from './api.ts';
import { hostRuns } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import type { Dispatch } from './dispatch.ts';

/** One command vocabulary for HTTP, IPC, tray and existing account mailbox. */
export class Controls {
  constructor(readonly deps: HostDeps, readonly dispatch: Dispatch) {}
  private owner() {
    const owner = this.deps.account.current?.userId;
    if (!owner) throw new DeskError('Sign in on the PC for run controls.', 409);
    return owner;
  }
  queue(id: string) { return this.dispatch.queue(this.owner(), id); }
  async receipt(id: string): Promise<ControlReceipt | null> {
    const owner = this.owner();
    const receipt = this.dispatch.store.receipt(owner, id);
    if (!receipt || receipt.action !== 'stopAll' || !receipt.hosts?.some((host) => host.state === 'pending')) return receipt;
    return this.refresh(owner, receipt);
  }
  async run(raw: unknown): Promise<ControlReceipt> {
    const owner = this.owner(); const request = readRunControl(raw);
    if (!request) throw new DeskError('Invalid run control.');
    if (!['stop', 'stopAll'].includes(request.action)) return this.dispatch.action(owner, request);
    const claim = this.dispatch.store.begin(owner, request);
    if (!claim.fresh) return (await this.receipt(request.commandId))!;
    let receipt = claim.receipt;
    if (request.action === 'stop') {
      const result = await this.stopOne(owner, request.runId!);
      receipt = { ...receipt, state: result.state, runs: [result], error: result.error };
    } else {
      this.deps.orchestrations?.stopQueued();
      const identity = this.deps.identity();
      const local: HostStop = { id: identity.id, name: identity.name, commandId: request.commandId, state: 'pending' };
      let hosts = [local]; let inventoryError: string | undefined;
      if (request.scope === 'account') {
        try {
          if (!this.deps.account.configured) throw new Error('Account host inventory unavailable. Only this PC could be checked.');
          const rows = await this.deps.account.client().from('cellar_desks').select('id,name');
          if (rows.error) throw new Error(rows.error.message);
          hosts = [...hosts, ...(rows.data ?? []).filter((row) => row.id !== identity.id).map((row) => ({ id: String(row.id), name: String(row.name), commandId: randomUUID(), state: 'pending' as const }))];
        } catch (error) { inventoryError = String(error); }
      }
      receipt = { ...receipt, hosts, error: inventoryError };
      this.dispatch.store.saveReceipt(owner, receipt);
      try {
        const candidates = [];
        for (const run of await hostRuns(this.deps)) if (['running', 'waiting', 'unknown'].includes(run.state)
          && (run.origin === 'phone' || await this.deps.account.allows(run.cwd))) candidates.push(run);
        local.runs = await Promise.all(candidates.map((run) => this.stopOne(owner, run.id, run.name)));
        local.state = local.runs.every((run) => run.state === 'confirmed') ? 'confirmed' : 'failed';
      } catch (error) { local.state = 'unknown'; local.error = String(error); }
      this.dispatch.store.saveReceipt(owner, receipt);
      receipt = await this.refresh(owner, receipt);
    }
    this.dispatch.store.saveReceipt(owner, receipt); return receipt;
  }
  private async stopOne(owner: string, id: string, name = id): Promise<StopResult> {
    try {
      await this.dispatch.stop(owner, id, async () => {
        if (this.deps.jobs?.has(id)) await this.deps.jobs.stop(id);
        else {
          for (const job of this.deps.jobs?.list().filter((row) => row.parentRunId === id && ['running', 'waiting'].includes(row.state)) ?? []) await this.dispatch.stop(owner, job.id, () => this.deps.jobs!.stop(job.id));
          await this.deps.runs.stop(id);
        }
      });
      return { id, name, state: 'confirmed' };
    } catch (error) { return { id, name, state: error instanceof DeskError ? 'failed' : 'unknown', error: String(error) }; }
  }
  private async refresh(owner: string, receipt: ControlReceipt): Promise<ControlReceipt> {
    const hosts = receipt.hosts ?? [];
    for (const host of hosts) {
      if (host.id === this.deps.identity().id || host.state !== 'pending') continue;
      try {
        if (!this.deps.account.configured) throw new Error('Account mailbox unavailable.');
        const client = this.deps.account.client();
        const existing = await client.from('cellar_desk_requests').select('state,error,receipt,payload,desk_id').eq('id', host.commandId).maybeSingle();
        if (existing.error) throw new Error(existing.error.message);
        const payload: RunControl = { commandId: host.commandId, action: 'stopAll', scope: 'host', runId: null, source: 'pc' };
        if (!existing.data) {
          const inserted = await client.from('cellar_desk_requests').insert({ id: host.commandId, desk_id: host.id, kind: 'stop', run_id: '*', payload });
          if (inserted.error && inserted.error.code !== '23505') throw new Error(inserted.error.message);
          host.error = 'Waiting for this host to pick up Stop all.';
        } else {
          if (existing.data.desk_id !== host.id || JSON.stringify(existing.data.payload) !== JSON.stringify(payload)) {
            // JSONB key order is not significant.
            const saved = readRunControl(existing.data.payload);
            if (existing.data.desk_id !== host.id || !saved || JSON.stringify(saved) !== JSON.stringify(readRunControl(payload))) throw new Error('Mailbox control identity differs.');
          }
          const result = existing.data.receipt as ControlReceipt | null;
          if (result?.commandId === host.commandId && result.action === 'stopAll' && ['confirmed', 'failed', 'unknown'].includes(result.state)) {
            host.state = result.state as HostStop['state']; host.runs = result.runs ?? result.hosts?.flatMap((row) => row.runs ?? []); host.error = result.error;
          } else if (existing.data.state === 'failed') { host.state = 'failed'; host.error = existing.data.error ?? 'Host rejected Stop all.'; }
          else host.error = existing.data.state === 'taken' ? 'Host claimed Stop all; interruption is unconfirmed.' : 'Waiting for host pickup.';
        }
      } catch (error) { host.error = String(error); }
    }
    const pending = hosts.some((host) => host.state === 'pending');
    const state = pending ? 'pending' : receipt.error || hosts.some((host) => host.state === 'unknown') ? 'unknown'
      : hosts.some((host) => host.state === 'failed') ? 'failed' : 'confirmed';
    const updated: ControlReceipt = { ...receipt, hosts, state, runs: hosts.flatMap((host) => host.runs ?? []) };
    this.dispatch.store.saveReceipt(owner, updated); return updated;
  }
}
