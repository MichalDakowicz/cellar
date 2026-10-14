import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { HostDeps } from './api.ts';

/** Phone video is local-only, ticketed by the desktop renderer and detached from run events. */
export function phoneVideoSockets(server: Server, deps: HostDeps) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/phone-video/')) return;
    const token = /^\/phone-video\/([A-Za-z0-9_-]{16,})$/.exec(request.url)?.[1];
    const ticket = token ? deps.tickets.redeem(token) : null;
    const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '');
    if (!loopback || !deps.phones || ticket?.kind !== 'phone-video' || ticket.owner !== deps.account.current?.userId || ticket.key !== deps.identity().key) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    wss.handleUpgrade(request, socket, head, (ws) => {
      const valid = () => deps.account.current?.userId === ticket.owner && deps.identity().key === ticket.key;
      let close: (() => Promise<void>) | null = null;
      let taps = '';
      const timer = setInterval(() => {
        if (!valid()) { ws.close(1008, 'Account or pairing changed.'); return; }
        const next = JSON.stringify(deps.phones!.tapSnapshot());
        if (next !== taps && ws.readyState === WebSocket.OPEN) { taps = next; ws.send(`{"taps":${next}}`); }
      }, 150); timer.unref();
      ws.on('message', () => ws.close(1008, 'Video socket accepts no input.'));
      ws.on('error', () => {});
      ws.on('close', () => { clearInterval(timer); void close?.(); });
      void deps.phones!.video(ticket.serial, (packet) => {
        if (!valid()) { ws.close(1008); return; }
        if (ws.bufferedAmount > 256 * 1024) { ws.close(1013, 'Reconnect for a fresh video frame.'); return; }
        if (ws.readyState === WebSocket.OPEN) ws.send(packet);
      }, (error) => { if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ error })); ws.close(1011); } }).then((stop) => { close = stop; if (ws.readyState !== WebSocket.OPEN) void stop(); }).catch((e) => { if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ error: String(e) })); ws.close(1011); } });
    });
  });
}
