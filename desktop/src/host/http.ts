import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { handle, type HostDeps } from './api.ts';
import { apkPath, findApks, sendApk } from './apks.ts';
import { pairPage } from './pairPage.ts';
import { screenPage, type ScreenFeed } from './screen.ts';
import { sessionCookie, viewCookie } from './tickets.ts';
import { Signatures } from './verify.ts';

/**
 * The pc on the LAN.
 *
 * Three doors. `/pair` is open, and says nothing: it is a page whose script
 * reads the secret out of the fragment the browser kept. `/t/<ticket>` and
 * `/screen` are for the phone's browser, which holds a ticket or the cookie a
 * ticket set — bound to the address it was redeemed from. Everything else is the
 * API, and wants every request signed with the paired key (`src/lib/deskSign.ts`)
 * — the key itself never crosses the network.
 */

const BODY_MAX = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readText(req: IncomingMessage): Promise<string> {
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
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function from(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? '';
}

async function redeem(deps: HostDeps, token: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const cookie = sessionCookie(deps.tickets.openSession(from(req)));
  const where = ticket.kind === 'screen' ? '/screen' : `http://${deps.lanHost()}:${await deps.proxies.open(ticket.port)}/`;
  res.writeHead(302, { 'set-cookie': cookie, location: where, 'cache-control': 'no-store' }).end();
}

export function lanServer(deps: HostDeps, screen: ScreenFeed | null): Server {
  const signatures = new Signatures();

  return createServer((req, res) => {
    void (async () => {
      const url = req.url ?? '/';
      const path = url.split('?')[0];
      const method = req.method ?? 'GET';

      if (method === 'GET' && (path === '/pair' || path === '/pair/')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return void res.end(pairPage(deps.identity().name));
      }
      const ticket = /^\/t\/([A-Za-z0-9_-]{16,})$/.exec(path);
      if (method === 'GET' && ticket) return redeem(deps, ticket[1], req, res);

      if (method === 'GET' && (path === '/screen' || path === '/screen/stream')) {
        if (!screen || !deps.tickets.validSession(viewCookie(req.headers.cookie), from(req))) {
          return void res.writeHead(403, { 'content-type': 'text/plain' }).end('open the screen from cellar on your phone');
        }
        if (path === '/screen/stream') return screen.watch(res);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return void res.end(screenPage(deps.identity().name));
      }

      let text: string;
      try {
        text = method === 'POST' ? await readText(req) : '';
      } catch (error) {
        return send(res, 400, { error: (error as Error).message });
      }
      const signed = signatures.verify({
        header: req.headers.authorization,
        method,
        path: url,
        body: text,
        key: deps.identity().key,
      });
      if (!signed) return send(res, 401, { error: 'not paired with this pc' });

      let body: unknown;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        return send(res, 400, { error: 'not json' });
      }
      const answer = await handle(deps, { method, path, body });
      send(res, answer.status, answer.body);
    })().catch((error) => {
      if (!res.headersSent) send(res, 500, { error: String(error) });
    });
  });
}

/** Listen on the configured port, or the next free one of the ten after it. */
export function listen(server: Server, port: number, host = '0.0.0.0'): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryPort = (candidate: number) => {
      const onError = (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && attempt < 10) {
          attempt += 1;
          tryPort(candidate + 1);
        } else reject(error);
      };
      server.once('error', onError);
      server.listen(candidate, host, () => {
        // Bound: the retry handler must not swallow the server's later errors.
        server.removeListener('error', onError);
        resolve(candidate);
      });
    };
    tryPort(port);
  });
}
