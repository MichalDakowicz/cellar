import type { RealtimeChannel } from '@supabase/supabase-js';

import type { DeskRun } from '@/lib/deskProtocol';
import { isStaleRequest } from '@/lib/deskProtocol';

import type { DeskSession } from './account.ts';
import { deskInfo, startRun, type HostDeps } from './api.ts';

/**
 * The way in when the phone is not on the same network: through the cellar.
 *
 * The phone writes a row into `cellar_desk_requests`; this pc hears it over
 * realtime, claims it with a conditional update so two windows never run the
 * same start, and writes back what happened. The same account owns both ends,
 * and the row is checked exactly as a LAN request is — same parser, same
 * project-folder rule — because it reaches the same `startRun`.
 *
 * It also beats: every 30 s it writes `cellar_desks` with where it is on the
 * LAN and what it is running, which is how a phone that is away sees the runs,
 * and how a phone whose saved address went stale finds the new one.
 *
 * A start older than ten minutes is refused rather than run. A request sent
 * while the pc slept must not fire hours later into whatever the repo has
 * become since.
 *
 * Until `supabase/schema.sql` has been run, the two tables do not exist; the
 * first failure turns this off quietly and `/desk` says why.
 */

type RequestRow = {
  id: string;
  desk_id: string;
  kind: 'start' | 'stop';
  agent: string | null;
  prompt: string | null;
  cwd: string | null;
  name: string | null;
  entry_id: string | null;
  run_id: string | null;
  state: string;
  created_at: string;
};

const BEAT_MS = 30_000;

export class CellarFallback {
  private channel: RealtimeChannel | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  status: 'off' | 'on' | 'missing schema' | 'signed out' = 'signed out';

  constructor(private readonly deps: HostDeps) {
    deps.account.onChange((session) => this.restart(session));
  }

  private restart(session: DeskSession | null): void {
    this.stop();
    if (!session || !this.deps.account.configured) {
      this.status = 'signed out';
      return;
    }
    const client = this.deps.account.client();
    const deskId = this.deps.identity().id;
    this.channel = client
      .channel(`desk:${deskId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cellar_desk_requests', filter: `user_id=eq.${session.userId}` },
        (payload) => void this.take(payload.new as RequestRow),
      )
      .subscribe();
    this.status = 'on';
    void this.tick();
    this.beat = setInterval(() => void this.tick(), BEAT_MS);
  }

  stop(): void {
    if (this.beat) clearInterval(this.beat);
    this.beat = null;
    if (this.channel) void this.deps.account.client().removeChannel(this.channel);
    this.channel = null;
  }

  /** Heartbeat, plus anything queued while the socket was away. */
  async tick(runs?: DeskRun[]): Promise<void> {
    if (this.status !== 'on') return;
    const client = this.deps.account.client();
    const identity = this.deps.identity();
    const info = await deskInfo(this.deps);
    const { error } = await client.from('cellar_desks').upsert(
      {
        id: identity.id,
        name: identity.name,
        host: this.deps.lanHost(),
        port: identity.port,
        agents: info.agents.filter((agent) => agent.installed).map((agent) => agent.id),
        runs: (runs ?? (await this.deps.runs.list())).slice(0, 20),
        seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,id' },
    );
    if (error) return this.fail(error);

    const queued = await client
      .from('cellar_desk_requests')
      .select('*')
      .eq('desk_id', identity.id)
      .eq('state', 'queued')
      .order('created_at');
    if (queued.error) return this.fail(queued.error);
    for (const row of (queued.data ?? []) as RequestRow[]) await this.take(row);
  }

  private fail(error: { code?: string; message: string }): void {
    // 42P01 from Postgres, PGRST205 from PostgREST: the table is not there yet.
    if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message)) {
      this.status = 'missing schema';
      this.stop();
    }
  }

  private async take(row: RequestRow): Promise<void> {
    if (row.desk_id !== this.deps.identity().id || row.state !== 'queued') return;
    const client = this.deps.account.client();
    const claimed = await client
      .from('cellar_desk_requests')
      .update({ state: 'taken', taken_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('state', 'queued')
      .select('id');
    if (claimed.error || !claimed.data?.length) return;

    const settle = (patch: Record<string, unknown>) => client.from('cellar_desk_requests').update(patch).eq('id', row.id);
    if (isStaleRequest(row.created_at, Date.now())) {
      await settle({ state: 'failed', error: 'too old to run — send it again' });
      return;
    }
    try {
      if (row.kind === 'stop' && row.run_id) {
        await this.deps.runs.stop(row.run_id);
        await settle({ state: 'done' });
      } else {
        const run = await startRun(this.deps, {
          agent: row.agent,
          prompt: row.prompt,
          cwd: row.cwd,
          name: row.name,
          entryId: row.entry_id,
        });
        await settle({ state: 'done', run_id: run.id });
      }
      void this.tick();
    } catch (error) {
      await settle({ state: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }
}
