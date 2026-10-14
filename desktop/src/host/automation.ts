import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { EMPTY_AUTOMATION, parseAutomation, managedRules, scopedRules, type DeskAutomation } from '@/lib/deskRecipes';
import { instructionDiff } from '@/lib/deskRuleDocument';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';

export class Automation {
  private data: Record<string, DeskAutomation> = {};
  private file: string;
  private locked = false;
  constructor(dir: string, private deps: HostDeps) {
    this.file = join(dir, 'automation.json');
    try { this.data = JSON.parse(readFileSync(this.file, 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  private owner() { const owner = this.deps.account.current?.userId; if (!owner) throw new DeskError('Sign in on the PC.', 403); return owner; }
  read() { return this.data[this.owner()] ?? EMPTY_AUTOMATION; }
  async save(raw: unknown) {
    const owner = this.owner(); const config = parseAutomation(raw);
    await this.deps.account.ruleContext(config.rules.map((r) => r.entryId));
    if (this.owner() !== owner) throw new DeskError('Account changed.', 409);
    this.data[owner] = config; writeFileSync(this.file + '.tmp', JSON.stringify(this.data)); renameSync(this.file + '.tmp', this.file);
    return config;
  }
  async review(projectId: string) {
    const owner = this.owner(); const config = this.read();
    const context = await this.deps.account.ruleContext(config.rules.map((r) => r.entryId));
    const project = context.projects.find((p) => p.id === projectId);
    if (!project?.repoPath) throw new DeskError('Project has no owned checkout.', 403);
    const cwd = await realpath(project.repoPath);
    if (cwd.toLowerCase() !== project.repoPath.replace(/\//g, '\\').toLowerCase() && process.platform === 'win32') throw new DeskError('Rule folder redirected.', 403);
    const lines = scopedRules(config.rules, context.entries, project);
    const files = await Promise.all(['AGENTS.md', 'CLAUDE.md'].map(async (name) => {
      const path = join(cwd, name); let before = '';
      try { const stat = await lstat(path); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 200_000) throw new Error('Instruction file is linked, special or too large.'); before = await readFile(path, 'utf8'); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      const after = managedRules(before, lines);
      return { name, before, after, diff: instructionDiff(name, before, after) };
    }));
    if (this.owner() !== owner) throw new DeskError('Account changed.', 409);
    const token = createHash('sha256').update(JSON.stringify([owner, cwd, config, files])).digest('hex');
    return { projectId, token, files, cwd };
  }
  async apply(projectId: string, token: string) {
    if (this.locked) throw new DeskError('Rules sync in progress.', 409); this.locked = true;
    try {
      const owner = this.owner(); const review = await this.review(projectId);
      if (review.token !== token) throw new DeskError('Rules or files changed; review again.', 409);
      for (const file of review.files) {
        if (this.owner() !== owner) throw new DeskError('Account changed during rules sync.', 409);
        writeFileSync(join(review.cwd, file.name), file.after);
      }
      return { applied: true };
    } finally { this.locked = false; }
  }
}
