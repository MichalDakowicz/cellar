import { approvalNote, questionNote, runNote } from '@/lib/deskNotify';
import type { NoticePayload } from '@/lib/deskNotificationRouting';
import type { HostDeps } from './api.ts';
import { hostRuns } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { isStaleRequest } from '@/lib/deskProtocol';

export type DeskActivity = { idleSeconds: number; locked: boolean };
export class HostNotifications {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private readonly startedAt = Date.now();
  private readonly observed = new Set<string>();
  error: string | null = null;
  constructor(private readonly deps: HostDeps, private readonly activity: () => DeskActivity) {}
  start() { if (!this.timer) { this.timer = setInterval(() => void this.tick(), 10_000); void this.tick(); } }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  private owner() {
    const owner = this.deps.account.current?.userId;
    if (!owner) throw new DeskError('Sign in for desk notifications.', 409); return owner;
  }
  async tick() {
    if (this.busy || !this.deps.account.current || !this.deps.account.configured) return;
    this.busy = true;
    const owner = this.owner(), client = this.deps.account.client(), deskId = this.deps.identity().id;
    const current = () => { if (this.deps.account.current?.userId !== owner) throw new Error('Notification account changed.'); };
    try {
      const activity = this.activity();
      const device = await client.from('cellar_notice_devices').upsert({ user_id: owner, id: `desk:${deskId}`, kind: 'desk', seen_at: new Date().toISOString(), idle_seconds: activity.idleSeconds, locked: activity.locked, enabled: true }, { onConflict: 'user_id,id' });
      if (device.error) throw device.error; current();
      const runs = await hostRuns(this.deps); current();
      const approvals = this.deps.approvals?.list(owner) ?? [];
      const entries = [...new Set(runs.flatMap((r) => r.entryIds ?? (r.entryId ? [r.entryId] : [])))];
      const questions = entries.length ? await client.from('cellar_entry_questions').select('id,entry_id,question,options,agent').in('entry_id', entries).is('answered_at', null).is('dismissed_at', null).order('created_at') : { data: [], error: null };
      if (questions.error) throw questions.error; current();
      for (const run of runs) {
        const id = `run:${deskId}:${run.id}`;
        if (['running', 'waiting'].includes(run.state)) this.observed.add(id);
        const ask = approvals.find((r) => r.runId === run.id && r.state === 'pending');
        const question = questions.data?.find((q) => (run.entryIds ?? (run.entryId ? [run.entryId] : [])).includes(q.entry_id)
          && runs.find((r) => (r.entryIds ?? (r.entryId ? [r.entryId] : [])).includes(q.entry_id))?.id === run.id);
        let payload: NoticePayload;
        if (ask) {
          const note = approvalNote({ id: ask.id, agent: ask.agent, what: ask.what, subject: ask.subject, where: run.cwd });
          payload = { kind: 'approval', active: true, route: `/desk/run/${run.id}`, requestId: ask.id, deskId, runId: run.id,
            note: { ...note, id, actions: ask.always ? note.actions : note.actions.filter((a) => a.id !== 'always') } };
        } else if (question) {
          const note = questionNote({ id: question.id, agent: question.agent, where: this.deps.identity().name, question: question.question, options: question.options });
          payload = { kind: 'question', active: true, route: `/desk/run/${run.id}`, requestId: question.id, entryId: question.entry_id, deskId, runId: run.id, note: { ...note, id } };
        } else {
          const note = runNote({ id, title: run.name, host: this.deps.identity().name, doing: run.state, plan: null, stoppable: false });
          payload = { kind: run.agent === 'job' && run.state === 'failed' ? 'checksFailed' : 'finished', active: ['done', 'failed'].includes(run.state) && (run.startedAt >= this.startedAt || this.observed.has(id)), route: `/desk/run/${run.id}`, deskId, runId: run.id,
            note: { ...note, id, head: `cellar · ${run.state} · ${this.deps.identity().name}` } };
        }
        current(); const result = await client.rpc('cellar_publish_notice', { p_id: id, p_payload: payload }); if (result.error) throw result.error;
      }
      const actions = await client.from('cellar_notice_actions').select('*').eq('desk_id', deskId).order('created_at');
      if (actions.error) throw actions.error;
      for (const row of actions.data ?? []) {
        current();
        if (row.receipt) {
          if (row.receipt.state !== 'pending') continue;
          const receipt = this.deps.approvals?.receipt(owner, row.id) ?? { state: 'unknown', error: 'Host restarted before recording the notification decision. It will not replay.' };
          await client.from('cellar_notice_actions').update({ receipt }).eq('id', row.id).eq('user_id', owner); continue;
        }
        const taken = await client.from('cellar_notice_actions').update({ receipt: { state: 'pending' } }).eq('id', row.id).eq('user_id', owner).is('receipt', null).select('id');
        if (taken.error) throw taken.error; if (!taken.data?.length) continue;
        current();
        let receipt: unknown;
        try {
          if (isStaleRequest(row.created_at, Date.now())) throw new Error('Notification decision expired before the PC received it.');
          if (!this.deps.approvals) throw new Error('Host approvals unavailable.');
          receipt = await this.deps.approvals.answer(owner, { ...row.payload, commandId: row.id, source: 'phone' });
        } catch (e) { receipt = { state: 'failed', error: String(e) }; }
        const result = await client.from('cellar_notice_actions').update({ receipt }).eq('id', row.id).eq('user_id', owner); if (result.error) throw result.error;
      }
      this.error = null;
    } catch (error) { this.error = String(error); } finally { this.busy = false; }
  }
  async deliveries() {
    const owner = this.owner(), client = this.deps.account.client(), deviceId = `desk:${this.deps.identity().id}`;
    const result = await client.from('cellar_notices').select('id,generation,phase,payload,lease_until').eq('target', deviceId);
    if (result.error) throw result.error;
    const deliveries = [];
    for (const row of result.data ?? []) {
      if (this.deps.account.current?.userId !== owner) throw new Error('Notification account changed.');
      const delivery = await client.functions.invoke('desk-push', { body: { kind: 'desk-delivery', deviceId, id: row.id, generation: row.generation } });
      if (delivery.error) throw delivery.error;
      deliveries.push({ id: row.id, generation: row.generation, ...delivery.data });
    }
    return deliveries;
  }
  async ack(raw: unknown) {
    this.owner();
    const row = raw as { id?: unknown; generation?: unknown; ack?: unknown };
    if (typeof row?.id !== 'string' || !Number.isInteger(row.generation) || !['shown', 'dismissed'].includes(String(row.ack))) throw new DeskError('Invalid notification acknowledgment.');
    const result = await this.deps.account.client().functions.invoke('desk-push', { body: { kind: 'desk-ack', deviceId: `desk:${this.deps.identity().id}`, ...row } });
    if (result.error) throw result.error; return result.data;
  }
}
