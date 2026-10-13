import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DeskStart, DeskRun } from '@/lib/deskProtocol';
import { repoKey } from '@/lib/repoLink';
import { finishedWorktreeRun, worktreeSlug, type DeskProjectWorktrees, type DeskWorktree, type WorktreeAction, type WorktreeRequest, type WorktreeReview } from '@/lib/deskWorktrees';
import type { Account } from './account.ts';
import { DeskError } from './claudeRuns.ts';
import { ancestor, clean, git, gitTrees, managedPath, repository } from './worktreeGit.ts';
import { WorktreeReceipts } from './worktreeReceipts.ts';

type Managed = { id: string; owner: string; projectId: string; root: string; path: string; branch: string; kept: boolean; task: string };
const refused = (message: string): never => { throw new DeskError(message, 409, { notStarted: true }); };

/** Git is the workspace source of truth; JSON binds managed folders to account/project/start. */
export class Worktrees {
  readonly receipts: WorktreeReceipts;
  private readonly file: string;
  private readonly dir: string;
  private readonly records: Managed[];
  private readonly locks = new Map<string, Promise<unknown>>();
  constructor(dir: string, private readonly account: Account, private readonly runs: () => Promise<DeskRun[]>, managedDir = join(dir, 'worktrees')) {
    this.dir = managedDir; mkdirSync(this.dir, { recursive: true });
    this.file = join(dir, 'worktrees.json');
    this.records = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : [];
    this.receipts = new WorktreeReceipts(dir);
  }
  private save() {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.records)); renameSync(`${this.file}.tmp`, this.file);
  }
  private owner() {
    return this.account.current?.userId ?? refused('Sign in to Cellar on the PC.');
  }
  private unchanged(owner: string) { if (this.owner() !== owner) refused('Account changed; action refused.'); }
  async exclusive<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(projectId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(work);
    this.locks.set(projectId, next);
    try { return await next; } finally { if (this.locks.get(projectId) === next) this.locks.delete(projectId); }
  }
  private async root(projectId: string, owner: string) {
    const project = (await this.account.commandProjects()).find((row) => row.projectId === projectId);
    this.unchanged(owner);
    if (!project) refused('Project is not linked to this account on the PC.');
    return repository(project!.path);
  }
  async list(): Promise<DeskProjectWorktrees[]> {
    const owner = this.owner();
    const projects = await this.account.commandProjects();
    const result = await Promise.all(projects.map(async (project): Promise<DeskProjectWorktrees> => {
      try {
        const root = await repository(project.path);
        const rows = await gitTrees(root);
        const worktrees = await Promise.all(rows.map(async (tree): Promise<DeskWorktree> => {
          const managed = this.records.find((row) => row.owner === owner && row.projectId === project.projectId
            && repoKey(row.root) === repoKey(root) && repoKey(row.path) === repoKey(tree.path) && row.branch === tree.branch);
          let dirty: boolean | null = null;
          let unavailable: string | null = null;
          try { dirty = !(await clean(tree.path)); }
          catch (error) { unavailable = error instanceof Error ? error.message : String(error); }
          return { ...tree, projectId: project.projectId, id: managed?.id ?? null,
            main: repoKey(tree.path) === repoKey(root), dirty, unavailable, kept: managed?.kept ?? false };
        }));
        return { projectId: project.projectId, base: 'main', available: true, reason: null, worktrees };
      } catch (error) {
        return { projectId: project.projectId, base: 'main', available: false,
          reason: error instanceof Error ? error.message : String(error), worktrees: [] };
      }
    }));
    this.unchanged(owner);
    return result;
  }
  async create(start: DeskStart): Promise<Managed> {
    const owner = this.owner();
    const root = await this.root(start.projectId!, owner);
    const id = start.worktreeId ?? start.commandId!;
    const { commandId: _commandId, ...choices } = start;
    const task = JSON.stringify(choices);
    const old = this.records.find((row) => row.owner === owner && row.id === id);
    if (old) {
      if (old.projectId !== start.projectId || repoKey(old.root) !== repoKey(root) || old.task !== task) refused('Worktree ID belongs to another task.');
      await this.checked(old, owner);
      if ((await this.runs()).some((run) => run.worktreeId === id || repoKey(run.cwd) === repoKey(old.path))) refused('This worktree already has a run. Recover its original task receipt.');
      return old;
    }
    const ownerDir = createHash('sha256').update(owner).digest('hex');
    const path = managedPath(this.dir, join(this.dir, ownerDir.slice(0, 16), start.projectId!.slice(0, 8), id.replace(/-/g, '')));
    mkdirSync(join(path, '..'), { recursive: true });
    const parent = managedPath(realpathSync.native(this.dir), realpathSync.native(join(path, '..')));
    if (repoKey(parent) !== repoKey(join(path, '..'))) refused('Managed workspace parent was redirected.');
    const row: Managed = { id, owner, projectId: start.projectId!, root, path, task,
      branch: `wt/${worktreeSlug(start.name ?? start.prompt.split(/\r?\n/)[0], id)}`, kept: false };
    this.records.push(row); this.save(); // Persist identity before Git changes anything.
    this.unchanged(owner);
    await git(root, 'worktree', 'add', '-b', row.branch, path, 'refs/heads/main');
    await this.checked(row, owner);
    return row;
  }
  private async checked(row: Managed, owner: string) {
    if (row.owner !== owner) refused('No managed worktree for this account.');
    const root = await this.root(row.projectId, owner);
    if (repoKey(root) !== repoKey(row.root)) refused('Project folder changed; inspect the old worktree at the PC.');
    const expected = managedPath(realpathSync.native(this.dir), realpathSync.native(row.path));
    if (repoKey(expected) !== repoKey(row.path)) refused('Managed worktree folder was redirected.');
    const tree = (await gitTrees(root)).find((item) => repoKey(item.path) === repoKey(row.path));
    if (!tree || tree.branch !== row.branch) refused('Managed worktree is missing or its branch changed.');
    return tree!;
  }
  private record(id: string, owner: string) {
    return this.records.find((row) => row.id === id && row.owner === owner) ?? refused('No managed worktree for this account.');
  }
  async allows(path: string): Promise<boolean> {
    const owner = this.owner();
    const row = this.records.find((item) => item.owner === owner && repoKey(item.path) === repoKey(path));
    if (!row) return false;
    await this.checked(row, owner);
    return true;
  }
  /** Search must bind all three identities, not merely accept any owned path. */
  async searchPath(id: string, projectId: string, cwd: string): Promise<string> {
    const owner = this.owner();
    const row = this.record(id, owner);
    if (row.projectId !== projectId || repoKey(row.path) !== repoKey(cwd)) refused('Run worktree scope does not match.');
    await this.checked(row, owner);
    this.unchanged(owner);
    return row.path;
  }
  private async inspect(row: Managed, action: WorktreeAction, owner: string): Promise<WorktreeReview> {
    const tree = await this.checked(row, owner);
    const trees = await gitTrees(row.root);
    const targetTree = trees.find((item) => item.branch === 'main');
    const target = await git(row.root, 'rev-parse', 'refs/heads/main');
    const dirty = !(await clean(row.path));
    const targetDirty = targetTree ? !(await clean(targetTree.path)) : true;
    const allRuns = await this.runs();
    const inside = (cwd: string, path: string) => repoKey(cwd) === repoKey(path) || (repoKey(cwd) ?? '').startsWith(`${repoKey(path)}/`);
    const related = allRuns.filter((run) => inside(run.cwd, row.path));
    const targetRuns = targetTree ? allRuns.filter((run) => inside(run.cwd, targetTree.path)) : [];
    const finished = related.length > 0 && related.every((run) => finishedWorktreeRun(run.state));
    let reason = !finished ? 'Every run in this worktree must have a confirmed finished state.' : null;
    if (action !== 'keep') {
      reason ??= tree.locked ? 'Worktree is locked in Git.' : dirty ? 'Worktree has uncommitted or untracked files. Keep it or commit them at the PC.' : null;
      if (action === 'merge') reason ??= !targetTree ? 'Check out main on the PC first.' : targetTree.locked ? 'Main worktree is locked.'
        : targetDirty ? 'Main has local changes. Commit or stash them on the PC first.'
          : targetRuns.some((run) => !finishedWorktreeRun(run.state)) ? 'Main has an active or unconfirmed run. Finish it first.'
          : !(await ancestor(row.root, target, tree.head)) ? 'Main diverged. Merge this branch manually at the PC.' : null;
      if (action === 'remove') reason ??= !(await ancestor(row.root, tree.head, target)) ? 'Branch contains unmerged commits. Merge or keep it first.' : null;
    }
    const summary = await git(row.root, 'diff', '--stat', `${target}..${tree.head}`);
    const token = createHash('sha256').update(JSON.stringify({ id: row.id, action, head: tree.head, target,
      dirty, targetDirty, targetPath: targetTree?.path, locked: trees.map((item) => item.locked), related, targetRuns })).digest('hex');
    this.unchanged(owner);
    return { worktreeId: row.id, action, token, branch: row.branch, target: targetTree?.path ?? row.root,
      sourceHead: tree.head, targetHead: target,
      summary: summary || 'No committed file changes against main.', allowed: reason === null, reason };
  }
  async review(id: string, action: WorktreeAction) {
    const owner = this.owner();
    return this.inspect(this.record(id, owner), action, owner);
  }
  async act(request: WorktreeRequest) {
    const owner = this.owner();
    return this.receipts.execute(owner, request, (mutating) => {
      const row = this.record(request.worktreeId, owner);
      return this.exclusive(row.projectId, async () => {
        const review = await this.inspect(row, request.action, owner);
        if (!review.allowed) refused(review.reason!);
        if (review.token !== request.token) refused('Workspace changed since review. Review it again before confirming.');
        this.unchanged(owner);
        mutating();
        if (request.action === 'keep') { row.kept = true; this.save(); }
        if (request.action === 'merge') {
          if (await git(review.target, 'rev-parse', 'HEAD') !== review.targetHead || await git(review.target, 'branch', '--show-current') !== 'main') throw new Error('Main changed before merge.');
          await git(review.target, 'merge', '--ff-only', '--no-overwrite-ignore', review.sourceHead);
          if (await git(review.target, 'rev-parse', 'HEAD') !== review.sourceHead) throw new Error('Merge result could not be verified.');
          row.kept = true; this.save();
        }
        if (request.action === 'remove') {
          managedPath(realpathSync.native(this.dir), realpathSync.native(row.path));
          await git(row.root, 'worktree', 'remove', row.path);
          if ((await gitTrees(row.root)).some((item) => repoKey(item.path) === repoKey(row.path))) throw new Error('Removal could not be verified.');
          // Branch and commits remain recoverable. Never use --force or delete a branch.
        }
        return { action: request.action, worktreeId: row.id,
          message: request.action === 'keep' ? 'Worktree kept on the PC.' : request.action === 'merge' ? 'Main fast-forwarded; worktree kept.' : 'Worktree folder removed; Git branch retained.' };
      });
    });
  }
}
