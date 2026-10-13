import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { folderAllowed } from '@/lib/deskFolders';

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

type ProjectRow = { id: string; name: string; repoPath: string | null; groupId: string | null; groupHome: boolean };
type GroupRow = { id: string; repoPath: string | null };

const PROJECTS_MS = 60_000;

export class Account {
  private session: DeskSession | null = null;
  private supabase: SupabaseClient | null = null;
  private projectCache: { at: number; rows: ProjectRow[]; groups: GroupRow[] } | null = null;
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

  private async places(): Promise<{ rows: ProjectRow[]; groups: GroupRow[] }> {
    if (!this.session || !this.configured) return { rows: [], groups: [] };
    if (this.projectCache && Date.now() - this.projectCache.at < PROJECTS_MS) return this.projectCache;
    const [projects, groups] = await Promise.all([
      this.client().from('cellar_projects').select('id, name, repo_path, group_id, group_home'),
      this.client().from('cellar_groups').select('id, repo_path'),
    ]);
    if (projects.error) throw new Error(projects.error.message);
    if (groups.error) throw new Error(groups.error.message);
    const rows = (projects.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      repoPath: row.repo_path as string | null,
      groupId: (row.group_id as string | null) ?? null,
      groupHome: row.group_home === true,
    }));
    const housed = (groups.data ?? []).map((row) => ({ id: row.id as string, repoPath: row.repo_path as string | null }));
    this.projectCache = { at: Date.now(), rows, groups: housed };
    return this.projectCache;
  }

  /**
   * Whether a run may start in this folder: inside a project's checkout, or
   * exactly a group's root (`src/lib/deskFolders.ts`, the same rule the phone
   * offers folders by). The one check that keeps "start on pc" from being "run
   * anything, anywhere" for whoever holds the key.
   */
  async allows(cwd: string): Promise<boolean> {
    const { rows, groups } = await this.places();
    return folderAllowed(cwd, rows, groups);
  }
}
