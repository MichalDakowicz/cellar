import { copyFileSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Saying yes to claude's "do you trust this folder?" — from the phone.
 *
 * `claude --bg` will not start in a folder whose trust prompt was never
 * accepted, and the prompt only exists in an interactive session at the pc.
 * Accepting it there writes one flag into `~/.claude.json`:
 * `projects["C:/ping/bazaar"].hasTrustDialogAccepted = true`. This writes the
 * same flag, and only after the person on the phone has read what trusting
 * means and tapped yes — the start that was refused says which folder, the
 * phone asks, and only then is this called.
 *
 * The file is claude's own and other sessions write it too, so it is read,
 * changed in that one key and written aside then renamed over — never edited
 * in place — with a copy of what was there first.
 */

export const CLAUDE_CONFIG = join(homedir(), '.claude.json');

/** `C:\ping\bazaar` → `C:/ping/bazaar`, the shape claude keys its projects by. */
export function trustKey(folder: string): string {
  return folder.replace(/\\/g, '/').replace(/\/+$/, '');
}

type Config = { projects?: Record<string, Record<string, unknown>> } & Record<string, unknown>;

export function isTrusted(config: Config, folder: string): boolean {
  return config.projects?.[trustKey(folder)]?.hasTrustDialogAccepted === true;
}

/** The config with this one folder trusted and nothing else touched. */
export function withTrust(config: Config, folder: string): Config {
  const key = trustKey(folder);
  const projects = { ...(config.projects ?? {}) };
  projects[key] = { ...(projects[key] ?? {}), hasTrustDialogAccepted: true };
  return { ...config, projects };
}

export function trustFolder(folder: string, file = CLAUDE_CONFIG, backup = `${file}.cellar-backup`): void {
  const raw = readFileSync(file, 'utf8');
  const config = JSON.parse(raw) as Config;
  if (isTrusted(config, folder)) return;
  copyFileSync(file, backup);
  writeFileSync(`${file}.cellar-tmp`, `${JSON.stringify(withTrust(config, folder), null, 2)}\n`);
  renameSync(`${file}.cellar-tmp`, file);
}
