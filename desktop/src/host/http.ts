import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { bearerToken, sameSecret } from '@/lib/deskProtocol';

import { handle, type HostDeps } from './api.ts';
import { apkPath, findApks, sendApk } from './apks.ts';
import { pairPage } from './pairPage.ts';
import { screenPage, streamScreen, type FrameSource } from './screen.ts';
import { sessionCookie, viewCookie } from './tickets.ts';

/**
 * The pc on the LAN.
 *
 * Three doors. `/pair` is open, and says nothing: it is a page whose script
 * reads the secret out of the fragment the browser kept. `/t/<ticket>` and
 * `/screen` are for the phone's browser, which holds a ticket or the cookie a
 * ticket set. Everything else is the API, and wants the paired key as a bearer.
 */

const BODY_MAX = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > BODY_MAX) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(text ? JSON.parse(text) : undefined);
      } catch {
        reject(new Error('not json'));
      }
    });
    req.on('error', reject);
  });
}

async function redeem(deps: HostDeps, token: string, res: ServerResponse): Promise<void> {
  const ticket = deps.tickets.redeem(token);
  if (!ticket) {
    res.writeHead(410, { 'content-type': 'text/plain' }).end('this link was used or is too old — open it again from cellar');
    return;
  }
  if (ticket.kind === 'apk') {
    const workspace = deps.identity().workspace;
    const apk = (await findApks(workspace)).find((candidate) => candidate.app === ticket.app);
    if (!apk) return void res.writeHead(404).end();
    return sendApk(res, apkPath(workspace, apk), apk);
  }
  const cookie = sessionCookie(deps.tickets.openSession());
  const host = deps.lanHost();
  const where =
    ticket.kind === 'screen' ? '/screen' : `http://${host}:${await deps.proxies.open(ticket.port)}/`;
  res.writeHead(302, { 'set-cookie': cookie, location: where, 'cache-control': 'no-store' }).end();
}

export function lanServer(deps: HostDeps, frames: FrameSource | null): Server {
  return createServer((req, res) => {
    void (async () => {
      const path = (req.url ?? '/').split('?')[0];
      const method = req.method ?? 'GET';

      if (method === 'GET' && (path === '/pair' || path === '/pair/')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return void res.end(pairPage(deps.identity().name));
      }
      const ticket = /^\/t\/([A-Za-z0-9_-]{16,})$/.exec(path);
      if (method === 'GET' && ticket) return redeem(deps, ticket[1], res);

      if (method === 'GET' && (path === '/screen' || path === '/screen/stream')) {
        if (!frames || !deps.tickets.validSession(viewCookie(req.headers.cookie))) {
          return void res.writeHead(403, { 'content-type': 'text/plain' }).end('open the screen from cellar on your phone');
        }
        if (path === '/screen/stream') return streamScreen(res, frames);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return void res.end(screenPage(deps.identity().name));
      }

      if (!sameSecret(bearerToken(req.headers.authorization), deps.identity().key)) {
        return send(res, 401, { error: 'not paired with this pc' });
      }
      let body: unknown;
      try {
        body = method === 'POST' ? await readBody(req) : undefined;
      } catch (error) {
        return send(res, 400, { error: (error as Error).message });
      }
      const answer = await handle(deps, { method, path, body });
      send(res, answer.status, answer.body);
    })().catch((error) => {
      if (!res.headersSent) send(res, 500, { error: String(error) });
    });
  });
}

/** Listen on the configured port, or the next free one of the ten after it. */
export function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryPort = (candidate: number) => {
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && attempt < 10) {
          attempt += 1;
          tryPort(candidate + 1);
        } else reject(error);
      });
      server.listen(candidate, '0.0.0.0', () => resolve(candidate));
    };
    tryPort(port);
  });
}
