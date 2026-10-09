import { createServer, request, type IncomingMessage, type Server } from 'node:http';
import { connect, type AddressInfo, type Socket } from 'node:net';

import { viewCookie, withoutViewCookie, type Tickets } from './tickets.ts';

/**
 * A page on the pc, shown on the phone.
 *
 * Each target port gets its own listener on the LAN, because a dev server's
 * page is full of root-relative paths — `/_expo/static/…`, `/@vite/client` — and
 * those only resolve if the page is served from the root of an origin. Putting
 * them under `/view/8081/` would break every one of them.
 *
 * The cookie the ticket set is checked on every request and every socket
 * upgrade (hot reload rides a websocket), then stripped before forwarding. The
 * Host and Origin are rewritten to `localhost`, because Vite and friends refuse
 * a Host they do not recognise and a LAN address is exactly that.
 */

export class Proxies {
  private readonly servers = new Map<number, Promise<number>>();

  constructor(private readonly tickets: Tickets) {}

  /** The LAN port that shows `target`, opened on first use. */
  open(target: number): Promise<number> {
    let opened = this.servers.get(target);
    if (!opened) {
      opened = this.listen(target);
      this.servers.set(target, opened);
      opened.catch(() => this.servers.delete(target));
    }
    return opened;
  }

  /** Ports this desk itself listens on, to keep them out of the list of pages. */
  async ports(): Promise<number[]> {
    const settled = await Promise.allSettled(this.servers.values());
    return settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  }

  private listen(target: number): Promise<number> {
    const server: Server = createServer((req, res) => {
      if (!this.tickets.validSession(viewCookie(req.headers.cookie))) {
        res.writeHead(403, { 'content-type': 'text/plain' }).end('open this page from cellar on your phone');
        return;
      }
      const upstream = request(
        {
          host: '127.0.0.1',
          port: target,
          method: req.method,
          path: req.url,
          headers: rewrite(req, target),
        },
        (answer) => {
          res.writeHead(answer.statusCode ?? 502, answer.headers);
          answer.pipe(res);
        },
      );
      upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
        res.end(`nothing answered on port ${target}`);
      });
      req.pipe(upstream);
    });

    server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
      if (!this.tickets.validSession(viewCookie(req.headers.cookie))) {
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }
      const upstream = connect(target, '127.0.0.1', () => {
        const headers = rewrite(req, target);
        const lines = Object.entries(headers).flatMap(([name, value]) =>
          value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((one) => `${name}: ${one}`),
        );
        upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${lines.join('\r\n')}\r\n\r\n`);
        if (head.length) upstream.write(head);
        upstream.pipe(socket).pipe(upstream);
      });
      upstream.on('error', () => socket.destroy());
      socket.on('error', () => upstream.destroy());
    });

    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '0.0.0.0', () => resolve((server.address() as AddressInfo).port));
    });
  }
}

function rewrite(req: IncomingMessage, target: number): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = { ...req.headers };
  headers.host = `localhost:${target}`;
  if (headers.origin) headers.origin = `http://localhost:${target}`;
  if (typeof headers.referer === 'string') headers.referer = headers.referer.replace(/^https?:\/\/[^/]+/, `http://localhost:${target}`);
  headers.cookie = withoutViewCookie(req.headers.cookie);
  if (headers.cookie === undefined) delete headers.cookie;
  return headers;
}
