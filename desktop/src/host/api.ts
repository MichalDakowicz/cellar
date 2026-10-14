import type { RunEvents } from './runEvents.ts';
import { searchKeys } from './keySearch.ts';
import { previewKey } from './keyPreview.ts';
import type { Approvals } from './approvals.ts';
import type { Controls } from './controls.ts';
import { realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import type { DeskInfo } from '@/lib/deskProtocol';
import { parseDeskStart } from '@/lib/deskProtocol';

import type { Account } from './account.ts';
import { findApks } from './apks.ts';
import { DeskError } from './claudeRuns.ts';
import type { Identity } from './identity.ts';
import { readPorts } from './ports.ts';
import { trustFolder } from './trust.ts';
import type { Proxies } from './proxy.ts';
import type { Runs } from './runs.ts';
import type { Ticket, Tickets } from './tickets.ts';
import { installedAgents } from './tools.ts';
import type { Commands } from './commands.ts';
import type { Jobs } from './jobs.ts';
import { sortRuns } from '@/lib/deskProtocol';
import type { Receipts } from './receipts.ts';
import { startTask } from './startTask.ts';
import type { Worktrees } from './worktrees.ts';
import type { WorktreeRequest, WorktreeAction } from '@/lib/deskWorktrees';
import type { Previews } from './previews.ts';
import type { HostNotifications } from './notifications.ts';
import type { Checkpoints } from './checkpoints.ts';
import type { Automation } from './automation.ts';
import type { ProviderAccounts } from './providerAccounts.ts';
import { runUsage } from './usage.ts';
import type { ScreenControl } from './screenControl.ts';
import type { Phones } from './phones.ts';
import type { Orchestrations } from './orchestrations.ts';
import { readHostDocument } from './documents.ts';

/**
 * Everything a paired phone can ask, as one function from request to answer.
 *
 * The LAN server and the desktop window's bridge both call this — the window
 * over IPC, the phone over HTTP with its key — so there is one list of what the
 * pc will do and one place each request is checked. What only a browser can
 * open (a page, the screen, a download) is not here: those go through a ticket,
 * which is here, and are served by the LAN server.
 */

export type ApiRequest = { method: string; path: string; body?: unknown; source?: 'phone' | 'pc'; address?: string };
export type ApiResponse = { status: number; body: unknown };

export type HostDeps = {
  phoneServerFile?: string;
  orchestrations?: Orchestrations;
  screenControl?: ScreenControl;
  phones?: Phones;
  providerAccounts?: ProviderAccounts;
  automation?: Automation;
  checkpoints?: Checkpoints;
  notifications?: HostNotifications;
  previews?: Previews;
  controls?: Controls;
  approvals?: Approvals;
  events?: RunEvents;
  identity: () => Identity;
  account: Account;
  runs: Runs;
  tickets: Tickets;
  proxies: Proxies;
  lanHost: () => string | null;
  version: string;
  commands?: Commands;
  jobs?: Jobs;
  receipts?: Receipts;
  worktrees?: Worktrees;
};

const ok = (body: unknown): ApiResponse => ({ status: 200, body });

export async function hostRuns(deps: HostDeps) {
  return sortRuns([...(await deps.runs.list()), ...(deps.jobs?.list() ?? [])]);
}

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
    capabilities: { commands: !!deps.commands, previews: true, screen: true, downloads: true,
      worktrees: !!deps.worktrees, events: !!deps.events, approvals: !!deps.approvals, dispatch: !!deps.controls },
    ...(deps.receipts ? { taskProtocol: 2 as const } : {}),
    ...(deps.worktrees ? { worktrees: true as const } : {}),
    ...(deps.events ? { eventProtocol: 1 as const } : {}),
    ...(deps.approvals ? { approvalProtocol: 1 as const } : {}),
    ...(deps.controls ? { dispatchProtocol: 1 as const } : {}),
    keysProtocol: 1,
    ...(deps.previews ? { previewProtocol: 1 as const } : {}),
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
  if (deps.receipts) return deps.receipts.start(deps.account.current.userId, parsed.value, () => startTask(deps, parsed.value));
  const cwd = realFolder(parsed.value.cwd);
  if (!(await deps.account.allows(cwd))) throw new DeskError(`${cwd} is not a project folder in your cellar`, 403);
  return deps.runs.start({ ...parsed.value, cwd });
}

/**
 * Claude's trust prompt, answered from the phone. Only for a folder a start is
 * allowed in, checked the same way, and only after the phone has shown what
 * trusting means — `desktop/src/host/trust.ts`.
 */
async function trust(deps: HostDeps, body: unknown): Promise<string> {
  const raw = (body ?? {}) as { cwd?: unknown };
  if (typeof raw.cwd !== 'string' || !raw.cwd.trim()) throw new DeskError('which folder?');
  if (!deps.account.current) throw new DeskError('cellar is signed out on the pc — open it there and sign in', 409);
  const cwd = realFolder(raw.cwd);
  if (!(await deps.account.allows(cwd)) && !(await deps.worktrees?.allows(cwd))) throw new DeskError(`${cwd} is not a project folder in your cellar`, 403);
  trustFolder(cwd);
  return cwd;
}

async function ticket(deps: HostDeps, body: unknown, source: 'phone' | 'pc' = 'phone', address?: string): Promise<string> {
  const raw = (body ?? {}) as { kind?: string; port?: unknown; app?: unknown; accessId?: string };
  let wanted: Ticket;
  if (raw.kind === 'screen') {
    if (!deps.screenControl || !raw.accessId || !deps.screenControl.valid(raw.accessId)) throw new DeskError('Request screen consent on the PC first.', 403);
    wanted = { kind: 'screen', accessId: raw.accessId };
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
  const host = source === 'pc' ? '127.0.0.1' : address ?? deps.lanHost();
  if (!host) throw new DeskError('this pc is not on a network the phone can reach', 409);
  return `http://${host}:${deps.identity().port}/t/${deps.tickets.issue(wanted)}`;
}

export async function handle(deps: HostDeps, req: ApiRequest): Promise<ApiResponse> {
  const parts = req.path.split('?')[0].split('/').filter(Boolean);
  const route = `${req.method.toUpperCase()} /${parts.map((part, i) => (['runs', 'commands', 'requests', 'worktrees', 'worktree-requests', 'approval-answers', 'run-controls'].includes(parts[0]) && i === 1 ? ':id' : part)).join('/')}`;
  try {
    switch (route) {
      case 'POST /phone-video-ticket': {
        const serial = (req.body as { serial?: unknown })?.serial;
        const owner = deps.account.current?.userId;
        if (req.source !== 'pc' || !owner || typeof serial !== 'string' || !deps.phones || !(await deps.phones.list()).devices.some((d) => d.serial === serial && d.state === 'device')) throw new DeskError('Choose an authorized phone on the desktop.', 403);
        const identity = deps.identity();
        return ok({ url: `ws://127.0.0.1:${identity.port}/phone-video/${deps.tickets.issue({ kind: 'phone-video', owner, key: identity.key, serial })}` });
      }
      case 'POST /documents':
        return ok(await readHostDocument(deps, req.body));
      case 'GET /orchestrations':
        if (!deps.orchestrations) throw new DeskError('Update the PC for races, night and group runs.', 409);
        return ok({ plans: await deps.orchestrations.list() });
      case 'POST /orchestrations':
        if (!deps.orchestrations) throw new DeskError('Update the PC for run plans.', 409);
        return ok(await deps.orchestrations.create(req.body));
      case 'POST /orchestration-actions':
        if (!deps.orchestrations) throw new DeskError('Update the PC for run plans.', 409);
        return ok(await deps.orchestrations.act(req.body, req.source ?? 'phone'));
      case 'POST /screen-access':
        if (!deps.screenControl) throw new DeskError('Screen control unavailable.', 409);
        return ok(await deps.screenControl.open(req.source ?? 'phone'));
      case 'POST /screen-input':
        if (!deps.screenControl) throw new DeskError('Screen control unavailable.', 409);
        return ok(await deps.screenControl.input(req.body));
      case 'POST /screen-display':
        if (!deps.screenControl) throw new DeskError('Screen control unavailable.', 409);
        return ok(await deps.screenControl.select(req.body));
      case 'POST /screen-release': {
        const id = (req.body as { id?: unknown })?.id;
        if (typeof id === 'string') deps.screenControl?.release(id);
        return ok({ released: true });
      }
      case 'POST /screen-revoke':
        if (req.source !== 'pc') throw new DeskError('Revoke screen trust on the PC.', 403);
        deps.screenControl?.forget(); return ok({ revoked: true });
      case 'GET /phones':
        if (!deps.phones || req.source !== 'pc') throw new DeskError('Open phone tools on the desktop.', 403);
        return ok(await deps.phones.list());
      case 'POST /phone-frame':
      case 'POST /phone-logs': {
        const raw = req.body as { serial?: string; packageName?: string };
        if (!deps.phones || req.source !== 'pc' || typeof raw?.serial !== 'string') throw new DeskError('Choose a phone on the desktop.', 403);
        return ok(route === 'POST /phone-frame' ? await deps.phones.frame(raw.serial) : await deps.phones.logs(raw.serial, raw.packageName ?? ''));
      }
      case 'POST /phone-action':
        if (!deps.phones) throw new DeskError('ADB unavailable.', 409);
        return ok(await deps.phones.act(req.body, req.source ?? 'phone'));
      case 'GET /provider-accounts':
        if (!deps.providerAccounts) throw new DeskError('Provider accounts unavailable.', 409);
        return ok({ accounts: deps.providerAccounts.list() });
      case 'POST /provider-accounts':
        if (!deps.providerAccounts || req.source !== 'pc') throw new DeskError('Enter credentials on this PC only.', 403);
        return ok({ accounts: deps.providerAccounts.save(req.body) });
      case 'POST /usage':
      case 'POST /compact': {
        const runId = (req.body as { runId?: unknown })?.runId;
        if (typeof runId !== 'string') throw new DeskError('Choose a provider run.');
        return ok(await runUsage(deps, runId, route === 'POST /compact'));
      }
      case 'GET /automation':
        if (!deps.automation) throw new DeskError('Recipes unavailable.', 409);
        return ok(deps.automation.read());
      case 'POST /automation':
        if (!deps.automation) throw new DeskError('Recipes unavailable.', 409);
        return ok(await deps.automation.save(req.body));
      case 'POST /rules-review':
      case 'POST /rules-apply': {
        const raw = req.body as { projectId?: string; token?: string };
        if (!deps.automation || typeof raw?.projectId !== 'string') throw new DeskError('Select a project.');
        if (route === 'POST /rules-review') { const { cwd: _cwd, ...review } = await deps.automation.review(raw.projectId); return ok(review); }
        if (typeof raw.token !== 'string') throw new DeskError('Review the rules diff first.');
        return ok(await deps.automation.apply(raw.projectId, raw.token));
      }
      case 'POST /checkpoints': {
        const raw = req.body as { runId?: string; checkpointId?: string };
        if (!deps.checkpoints || typeof raw?.runId !== 'string') throw new DeskError('Checkpoints unavailable.', 409);
        return ok(raw.checkpointId ? await deps.checkpoints.review(raw.runId, raw.checkpointId) : { checkpoints: await deps.checkpoints.list(raw.runId) });
      }
      case 'POST /checkpoint-rollback':
        if (!deps.checkpoints) throw new DeskError('Checkpoints unavailable.', 409);
        return ok({ receipt: await deps.checkpoints.rollback(req.body) });
      case 'POST /checkpoint-receipt':
        if (!deps.checkpoints) throw new DeskError('Checkpoints unavailable.', 409);
        return ok({ receipt: deps.checkpoints.receipt(req.body) });
      case 'GET /notice-deliveries':
        if (req.source !== 'pc' || !deps.notifications) throw new DeskError('Desktop notifications require local renderer.', 403);
        return ok({ deliveries: await deps.notifications.deliveries(), error: deps.notifications.error });
      case 'POST /notice-ack':
        if (req.source !== 'pc' || !deps.notifications) throw new DeskError('Desktop notifications require local renderer.', 403);
        return ok(await deps.notifications.ack(req.body));
      case 'GET /previews':
        if (!deps.previews) throw new DeskError('Update the PC for managed previews.', 409);
        return ok({ previews: deps.previews.list() });
      case 'POST /preview-actions':
        if (!deps.previews) throw new DeskError('Update the PC for managed previews.', 409);
        return ok({ receipt: await deps.previews.act(req.body) });
      case 'POST /preview-receipt':
        if (!deps.previews || typeof (req.body as { commandId?: unknown })?.commandId !== 'string') throw new DeskError('Invalid preview receipt request.');
        return ok({ receipt: deps.previews.receipt((req.body as { commandId: string }).commandId) });
      case 'POST /keys-search':
        return ok(await searchKeys(deps, req.body));
      case 'POST /keys-preview':
        return ok(await previewKey(deps, req.body));
      case 'POST /run-controls':
        if (!deps.controls) throw new DeskError('Update Cellar on the PC for chat controls.', 409);
        return ok({ receipt: await deps.controls.run(req.body && typeof req.body === 'object' ? { ...req.body, source: req.source ?? 'phone' } : req.body) });
      case 'GET /run-controls/:id':
        if (!deps.controls) throw new DeskError('Update Cellar on the PC for chat controls.', 409);
        return ok({ receipt: await deps.controls.receipt(parts[1]) });
      case 'GET /runs/:id/queue':
        if (!deps.controls) throw new DeskError('Update Cellar on the PC for chat controls.', 409);
        return ok({ queue: deps.controls.queue(parts[1]) });
      case 'POST /approval-answers':
        if (!deps.approvals || !deps.account.current) throw new DeskError('Sign in and update Cellar on the PC for approvals.', 409);
        return ok({ receipt: await deps.approvals.answer(deps.account.current.userId,
          req.body && typeof req.body === 'object' ? { ...req.body, source: req.source ?? 'phone' } : req.body) });
      case 'GET /approval-answers/:id':
        if (!deps.approvals || !deps.account.current) throw new DeskError('Sign in and update Cellar on the PC for approvals.', 409);
        return ok({ receipt: deps.approvals.receipt(deps.account.current.userId, parts[1]) });
      case 'GET /desk':
        return ok(await deskInfo(deps));
      case 'POST /event-ticket': {
        if (!deps.events || !deps.account.current) throw new DeskError('Sign in and update Cellar on the PC for live events.', 409);
        const host = req.source === 'pc' ? '127.0.0.1' : req.address ?? deps.lanHost() ?? '127.0.0.1';
        const token = deps.tickets.issue({ kind: 'events', owner: deps.account.current.userId, key: deps.identity().key });
        return ok({ url: 'ws://' + host + ':' + deps.identity().port + '/events/' + token });
      }
      case 'GET /runs':
        return ok({ runs: await hostRuns(deps) });
      case 'GET /requests/:id': {
        if (!deps.account.current || !deps.receipts) throw new DeskError('Sign in and update Cellar on the PC.', 409);
        return ok({ receipt: deps.receipts.get(deps.account.current.userId, parts[1]) });
      }
      case 'GET /commands':
        if (!deps.commands) throw new DeskError('update cellar on the pc for project commands', 409);
        return ok({ projects: await deps.commands.list() });
      case 'GET /worktrees':
        if (!deps.worktrees) throw new DeskError('Update Cellar on the PC for worktrees.', 409);
        return ok({ projects: await deps.worktrees.list() });
      case 'GET /worktree-requests/:id':
        if (!deps.worktrees || !deps.account.current) throw new DeskError('Sign in and update Cellar on the PC.', 409);
        return ok({ receipt: deps.worktrees.receipts.get(deps.account.current.userId, parts[1]) });
      case 'POST /worktrees/:id/review': {
        const action = (req.body as { action?: unknown } | null)?.action;
        if (!deps.worktrees || !['keep', 'merge', 'remove'].includes(String(action))) throw new DeskError('Select a worktree action.', 409);
        return ok({ review: await deps.worktrees.review(parts[1], action as WorktreeAction) });
      }
      case 'POST /worktrees/:id': {
        const raw = req.body as Partial<WorktreeRequest> | null;
        if (!deps.worktrees || !raw || raw.worktreeId !== parts[1] || !['keep', 'merge', 'remove'].includes(String(raw.action))
          || typeof raw.commandId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(raw.commandId)
          || typeof raw.token !== 'string' || !/^[a-f0-9]{64}$/.test(raw.token)) throw new DeskError('Invalid worktree action.', 409);
        return ok({ receipt: await deps.worktrees.act(raw as WorktreeRequest) });
      }
      case 'POST /commands': {
        if (!deps.commands || !deps.jobs) throw new DeskError('update cellar on the pc for jobs', 409);
        const body = req.body as { projectId?: unknown; command?: unknown } | null;
        if (typeof body?.projectId !== 'string' || typeof body.command !== 'string') throw new DeskError('pick a project command');
        return ok({ run: await deps.jobs.start(await deps.commands.plan(body.projectId, body.command), body.command) });
      }
      case 'POST /commands/:id/settings':
        if (!deps.commands) throw new DeskError('update cellar on the pc for project commands', 409);
        await deps.commands.save(parts[1], (req.body as { commands?: unknown } | null)?.commands);
        return ok({ saved: true });
      case 'POST /runs':
        return ok({ run: await startRun(deps, req.body) });
      case 'POST /runs/:id/stop':
        if (deps.jobs?.has(parts[1])) await deps.jobs.stop(parts[1]);
        else await deps.runs.stop(parts[1]);
        return ok({ stopped: parts[1] });
      case 'GET /runs/:id/log':
        return ok({ lines: deps.jobs?.has(parts[1]) ? await deps.jobs.log(parts[1]) : await deps.runs.log(parts[1]) });
      case 'GET /ports':
        return ok({ ports: await readPorts(await hiddenPorts(deps)) });
      case 'GET /apks':
        return ok({ apks: await findApks(deps.identity().workspace) });
      case 'POST /tickets':
        return ok({ url: await ticket(deps, req.body, req.source, req.address) });
      case 'POST /trust':
        return ok({ trusted: await trust(deps, req.body) });
      default:
        return { status: 404, body: { error: `no ${route}` } };
    }
  } catch (error) {
    const status = error instanceof DeskError ? error.status : 500;
    const extra = error instanceof DeskError ? error.extra : {};
    return { status, body: { error: error instanceof Error ? error.message : String(error), ...extra } };
  }
}
