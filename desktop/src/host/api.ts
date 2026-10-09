import { realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import type { DeskInfo } from '@/lib/deskProtocol';
import { parseDeskStart } from '@/lib/deskProtocol';

import type { Account } from './account.ts';
import { findApks } from './apks.ts';
import { DeskError } from './claudeRuns.ts';
import type { Identity } from './identity.ts';
import { readPorts } from './ports.ts';
import type { Proxies } from './proxy.ts';
import type { Runs } from './runs.ts';
import type { Ticket, Tickets } from './tickets.ts';
import { installedAgents } from './tools.ts';

/**
 * Everything a paired phone can ask, as one function from request to answer.
 *
 * The LAN server and the desktop window's bridge both call this — the window
 * over IPC, the phone over HTTP with its key — so there is one list of what the
 * pc will do and one place each request is checked. What only a browser can
 * open (a page, the screen, a download) is not here: those go through a ticket,
 * which is here, and are served by the LAN server.
 */

export type ApiRequest = { method: string; path: string; body?: unknown };
export type ApiResponse = { status: number; body: unknown };

export type HostDeps = {
  identity: () => Identity;
  account: Account;
  runs: Runs;
  tickets: Tickets;
  proxies: Proxies;
  lanHost: () => string | null;
  version: string;
};

const ok = (body: unknown): ApiResponse => ({ status: 200, body });

export async function hiddenPorts(deps: HostDeps): Promise<Set<number>> {
  return new Set([deps.identity().port, ...(await deps.proxies.ports())]);
}

export async function deskInfo(deps: HostDeps): Promise<DeskInfo> {
  const identity = deps.identity();
  return {
    id: identity.id,
    name: identity.name,
    version: deps.version,
    agents: await installedAgents(),
    signedIn: deps.account.current !== null,
  };
}

/**
 * The folder as the filesystem has it: `..` resolved, junctions and links
 * followed. The project check is a prefix match, and `C:\ping\cellar\..\..`
 * starts with `C:\ping\cellar` — so the check runs on the real folder, and the
 * agent is started in that same real folder, never in the string it was sent.
 */
function realFolder(cwd: string): string {
  try {
    const real = realpathSync.native(resolve(cwd));
    if (!statSync(real).isDirectory()) throw new Error('not a folder');
    return real;
  } catch {
    throw new DeskError(`${cwd} is not a folder on this pc`, 404);
  }
}

export async function startRun(deps: HostDeps, body: unknown) {
  const parsed = parseDeskStart(body);
  if (!parsed.ok) throw new DeskError(parsed.error);
  if (!deps.account.current) throw new DeskError('cellar is signed out on the pc — open it there and sign in', 409);
  const cwd = realFolder(parsed.value.cwd);
  const project = await deps.account.projectFor(cwd);
  if (!project) throw new DeskError(`${cwd} is not a project folder in your cellar`, 403);
  return deps.runs.start({ ...parsed.value, cwd });
}

async function ticket(deps: HostDeps, body: unknown): Promise<string> {
  const raw = (body ?? {}) as { kind?: string; port?: unknown; app?: unknown };
  let wanted: Ticket;
  if (raw.kind === 'screen') {
    wanted = { kind: 'screen' };
  } else if (raw.kind === 'view' && typeof raw.port === 'number') {
    const listening = await readPorts(await hiddenPorts(deps));
    if (!listening.some((port) => port.port === raw.port)) throw new DeskError(`nothing is listening on ${raw.port}`, 404);
    wanted = { kind: 'view', port: raw.port };
  } else if (raw.kind === 'apk' && typeof raw.app === 'string') {
    const apks = await findApks(deps.identity().workspace);
    if (!apks.some((apk) => apk.app === raw.app)) throw new DeskError(`no release build of ${raw.app}`, 404);
    wanted = { kind: 'apk', app: raw.app };
  } else {
    throw new DeskError('what is the ticket for?');
  }
  const host = deps.lanHost();
  if (!host) throw new DeskError('this pc is not on a network the phone can reach', 409);
  return `http://${host}:${deps.identity().port}/t/${deps.tickets.issue(wanted)}`;
}

export async function handle(deps: HostDeps, req: ApiRequest): Promise<ApiResponse> {
  const parts = req.path.split('?')[0].split('/').filter(Boolean);
  const route = `${req.method.toUpperCase()} /${parts.map((part, i) => (parts[0] === 'runs' && i === 1 ? ':id' : part)).join('/')}`;
  try {
    switch (route) {
      case 'GET /desk':
        return ok(await deskInfo(deps));
      case 'GET /runs':
        return ok({ runs: await deps.runs.list() });
      case 'POST /runs':
        return ok({ run: await startRun(deps, req.body) });
      case 'POST /runs/:id/stop':
        await deps.runs.stop(parts[1]);
        return ok({ stopped: parts[1] });
      case 'GET /runs/:id/log':
        return ok({ lines: await deps.runs.log(parts[1]) });
      case 'GET /ports':
        return ok({ ports: await readPorts(await hiddenPorts(deps)) });
      case 'GET /apks':
        return ok({ apks: await findApks(deps.identity().workspace) });
      case 'POST /tickets':
        return ok({ url: await ticket(deps, req.body) });
      default:
        return { status: 404, body: { error: `no ${route}` } };
    }
  } catch (error) {
    const status = error instanceof DeskError ? error.status : 500;
    return { status, body: { error: error instanceof Error ? error.message : String(error) } };
  }
}
