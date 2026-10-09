import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

import { DESK_PORT } from '@/lib/deskPair';

/**
 * Who this pc is to a phone: an id, a name, the port it listens on, and the
 * one secret a paired phone carries.
 *
 * Kept in the app's own data folder, never in a repo. Rotating the key is how
 * every paired phone is forgotten at once — there is no per-phone list to prune,
 * because a phone that holds the key is all "paired" means.
 */
export type Identity = {
  id: string;
  key: string;
  name: string;
  port: number;
  /** The folder whose apps' release builds can be dropped to the phone. */
  workspace: string;
};

const FILE = 'desk.json';

function defaultWorkspace(): string {
  // Run from source, the repo sits in the workspace (C:\ping\cellar\desktop);
  // installed, there is no repo to climb out of, so the common layout is the guess.
  const fromSource = join(__dirname, '..', '..', '..');
  if (existsSync(join(fromSource, 'cellar', 'app.json'))) return fromSource;
  return process.platform === 'win32' ? 'C:\\ping' : join(process.env.HOME ?? '.', 'ping');
}

function fresh(): Identity {
  return {
    id: randomBytes(8).toString('hex'),
    key: randomBytes(24).toString('base64url'),
    name: hostname().slice(0, 40) || 'pc',
    port: DESK_PORT,
    workspace: defaultWorkspace(),
  };
}

function write(dir: string, identity: Identity): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, FILE), `${JSON.stringify(identity, null, 2)}\n`, { mode: 0o600 });
}

export function loadIdentity(dir: string): Identity {
  try {
    const stored = JSON.parse(readFileSync(join(dir, FILE), 'utf8')) as Partial<Identity>;
    if (stored.id && stored.key && stored.port) {
      return { ...fresh(), ...stored } as Identity;
    }
  } catch {
    // First run, or a file someone broke by hand: either way, start clean.
  }
  const identity = fresh();
  write(dir, identity);
  return identity;
}

export function saveIdentity(dir: string, identity: Identity): void {
  write(dir, identity);
}

/** A new secret: every phone that paired before has to scan again. */
export function rotateKey(dir: string, identity: Identity): Identity {
  const next = { ...identity, key: randomBytes(24).toString('base64url') };
  write(dir, next);
  return next;
}
