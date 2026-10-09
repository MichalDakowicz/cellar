import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { projectForPath } from '@/lib/repoLink';

/**
 * The account this pc acts for — borrowed from Cellar's own window.
 *
 * The window is Cellar, signed in the ordinary way, and its client refreshes
 * the session on its own. The main process does not hold a second session: two
 * holders of one refresh token rotate it out from under each other, and
 * Supabase answers a reused refresh token by revoking the whole family. So the
 * window hands over each access token as it gets one (`setSession`), and this
 * client only ever reads the latest.
 *
 * Signed out means no folder can be checked against a project, so nothing is
 * started — over the LAN or the cellar.
 */

export type DeskSession = { accessToken: string; userId: string };

type ProjectRow = { id: string; name: string; repoPath: string | null };

const PROJECTS_MS = 60_000;

export class Account {
  private session: DeskSession | null = null;
  private supabase: SupabaseClient | null = null;
  private projectCache: { at: number; rows: ProjectRow[] } | null = null;
  private readonly listeners = new Set<(session: DeskSession | null) => void>();

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
  ) {}

  get configured(): boolean {
    return Boolean(this.url && this.anonKey);
  }

  get current(): DeskSession | null {
    return this.session;
  }

  setSession(next: DeskSession | null): void {
    const changedUser = next?.userId !== this.session?.userId;
    this.session = next;
    if (changedUser) this.projectCache = null;
    if (next && this.supabase) this.supabase.realtime.setAuth(next.accessToken);
    if (changedUser) for (const listener of this.listeners) listener(next);
  }

  /** Called when the signed-in account changes — not on every token refresh. */
  onChange(listener: (session: DeskSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  client(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(this.url, this.anonKey, {
        accessToken: async () => this.session?.accessToken ?? null,
        realtime: { params: { eventsPerSecond: 5 } },
      });
    }
    return this.supabase;
  }

  async projects(): Promise<ProjectRow[]> {
    if (!this.session || !this.configured) return [];
    if (this.projectCache && Date.now() - this.projectCache.at < PROJECTS_MS) return this.projectCache.rows;
    const { data, error } = await this.client().from('cellar_projects').select('id, name, repo_path');
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string, repoPath: row.repo_path as string | null }));
    this.projectCache = { at: Date.now(), rows };
    return rows;
  }

  /**
   * The project a folder belongs to, or null. A run may only start inside a
   * checkout the cellar knows about — the one check that keeps "start on pc"
   * from being "run anything, anywhere" for whoever holds the key.
   */
  async projectFor(cwd: string): Promise<ProjectRow | null> {
    return projectForPath(cwd, await this.projects());
  }
}
