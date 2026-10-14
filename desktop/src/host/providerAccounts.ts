import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { DeskStart } from '@/lib/deskProtocol';
import { DeskError } from './claudeRuns.ts';

export type SecretVault = { available: () => boolean; encrypt: (text: string) => Buffer; decrypt: (value: Buffer) => string };
export type ProviderAccount = { id: string; agent: 'codex' | 'claude'; label: string; policy: 'ask me'; kind: 'api' };
type Stored = ProviderAccount & { owner: string; secret: string };
export class ProviderAccounts {
  private rows: Stored[] = [];
  private file: string;
  constructor(private dir: string, private owner: () => string | null, private vault?: SecretVault) {
    this.file = join(dir, 'provider-accounts.json');
    try { this.rows = JSON.parse(readFileSync(this.file, 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  private user() { const owner = this.owner(); if (!owner) throw new DeskError('Sign in on the PC.', 403); return owner; }
  list() { const owner = this.user(); return this.rows.filter((r) => r.owner === owner).map(({ id, agent, label, policy, kind }) => ({ id, agent, label, policy, kind })); }
  save(raw: unknown) {
    const owner = this.user(); const row = raw as { agent?: string; label?: string; key?: string };
    if (!this.vault?.available()) throw new DeskError('OS credential encryption unavailable; no key saved.', 409);
    if (!row || !['codex', 'claude'].includes(row.agent ?? '') || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 80 || typeof row.key !== 'string' || row.key.length < 12 || row.key.length > 500 || /\s/.test(row.key)) throw new DeskError('Enter agent, account name and API key.');
    this.rows.push({ id: randomUUID(), agent: row.agent as Stored['agent'], label: row.label.trim(), kind: 'api', policy: 'ask me', owner, secret: this.vault.encrypt(row.key).toString('base64') });
    writeFileSync(this.file + '.tmp', JSON.stringify(this.rows)); renameSync(this.file + '.tmp', this.file); return this.list();
  }
  environment(start: DeskStart, runId: string, base: NodeJS.ProcessEnv) {
    if (!start.accountId) return base;
    const owner = this.user(); const row = this.rows.find((r) => r.owner === owner && r.id === start.accountId && r.agent === start.agent);
    if (!row || !this.vault?.available()) throw new DeskError('Selected agent account unavailable; nothing started.', 409, { notStarted: true });
    if (!/^[a-f0-9]{6,16}$/.test(runId)) throw new Error('Invalid run identity.');
    const path = join(this.dir, 'provider-runs', createHash('sha256').update(owner).digest('hex'), row.id, runId);
    mkdirSync(path, { recursive: true });
    const env = { ...base }; delete env.OPENAI_API_KEY; delete env.ANTHROPIC_API_KEY; delete env.CLAUDE_CODE_OAUTH_TOKEN; delete env.CODEX_API_KEY; delete env.CODEX_ACCESS_TOKEN;
    const key = this.vault.decrypt(Buffer.from(row.secret, 'base64'));
    return row.agent === 'codex' ? { ...env, CODEX_HOME: path, OPENAI_API_KEY: key, CELLAR_API_ACCOUNT: '1' } : { ...env, CLAUDE_CONFIG_DIR: path, ANTHROPIC_API_KEY: key };
  }
}
