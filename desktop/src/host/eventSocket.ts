import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { StreamMessage } from '@/lib/deskEvents';
import type { HostDeps } from './api.ts';

const MAX_BUFFER = 4 * 1024 * 1024;
/** One ticket, one client socket. Every push rechecks account and paired-key identity. */
export function eventSockets(server: Server, deps: HostDeps): void {
  if (!deps.events) return;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/events/')) return;
    const token = /^\/events\/([A-Za-z0-9_-]{16,})$/.exec(request.url ?? '')?.[1];
    const ticket = token ? deps.tickets.redeem(token) : null;
    if (!ticket || ticket.kind !== 'events' || ticket.owner !== deps.account.current?.userId || ticket.key !== deps.identity().key) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      let subscribed = false; let runId: string | null = null; let cursor = 0; let busy = false; let approvals = false;
      let lastHeartbeat = 0; let alive = true;
      const valid = () => deps.account.current?.userId === ticket.owner && deps.identity().key === ticket.key;
      const send = (message: StreamMessage) => {
        if (!valid()) { ws.close(1008, 'account or pairing changed'); return; }
        if (ws.bufferedAmount > MAX_BUFFER) { ws.close(1013, 'resume after slow connection'); return; }
        // Keep the existing epoch/sequence protocol usable by phones predating W8.
        if (!approvals && message.type === 'event' && message.event.kind === 'approvals') {
          message = { type: 'event', event: { ...message.event, kind: 'catalog', runs: deps.events!.store.snapshot(ticket.owner, null).runs } };
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      };
      const pump = async () => {
        if (busy || !subscribed || ws.readyState !== WebSocket.OPEN) return;
        busy = true;
        try {
          if (!valid()) { ws.close(1008, 'account or pairing changed'); return; }
          await deps.events!.refresh();
          if (deps.events!.error) { send({ type: 'error', error: deps.events!.error }); ws.close(1011, 'run read failed'); return; }
          const events = deps.events!.store.replay(ticket.owner, cursor);
          for (const event of events) { send({ type: 'event', event }); cursor = event.sequence; }
          if (Date.now() - lastHeartbeat >= 10_000) {
            send({ type: 'heartbeat', at: Date.now() }); lastHeartbeat = Date.now();
            if (!alive) { ws.terminate(); return; } alive = false; ws.ping();
          }
        } catch (error) { send({ type: 'error', error: String(error) }); ws.close(1011, 'event read failed'); }
        finally { busy = false; }
      };
      ws.on('pong', () => { alive = true; });
      ws.on('error', () => {});
      ws.on('message', (data) => {
        if (busy) { ws.close(1008, 'subscription already loading'); return; }
        void (async () => {
          busy = true;
          try {
            const raw = JSON.parse(data.toString());
            if (raw.type !== 'subscribe' || !(raw.runId === null || typeof raw.runId === 'string')
              || !Number.isSafeInteger(raw.afterSequence) || raw.afterSequence < 0 || typeof raw.epoch !== 'string') throw new Error('Invalid event subscription.');
            await deps.events!.refresh();
            if (deps.events!.error) throw new Error(deps.events!.error);
            const snapshot = deps.events!.store.snapshot(ticket.owner, raw.runId);
            approvals = raw.approvals === true;
            runId = raw.runId;
            if (runId && !snapshot.runs.some((run) => run.id === runId) && !snapshot.items.length) throw new Error('This run has no saved history on the PC.');
            const after = raw.epoch === snapshot.epoch && raw.afterSequence <= snapshot.sequence && snapshot.sequence - raw.afterSequence < 2000 ? raw.afterSequence : snapshot.sequence;
            send({ type: 'snapshot', snapshot });
            let replayCursor = after;
            while (replayCursor < snapshot.sequence) {
              const batch = deps.events!.store.replay(ticket.owner, replayCursor, snapshot.sequence);
              if (!batch.length) throw new Error('Stored event gap; reload the PC history.');
              for (const event of batch) send({ type: 'event', event });
              replayCursor = batch.at(-1)!.sequence;
              // Let backpressure/close events run during a large replay.
              await new Promise<void>((resolve) => setImmediate(resolve));
              if (ws.readyState !== WebSocket.OPEN) return;
            }
            cursor = snapshot.sequence; subscribed = true;
            send({ type: 'synchronized', sequence: cursor });
          } catch (error) { send({ type: 'error', error: error instanceof Error ? error.message : String(error) }); ws.close(1008, 'subscription refused'); }
          finally { busy = false; }
        })();
      });
      const timer = setInterval(() => { void pump(); }, 400); timer.unref();
      const timeout = setTimeout(() => { if (!subscribed) ws.close(1008, 'subscribe timed out'); }, 30_000); timeout.unref();
      ws.on('close', () => { clearInterval(timer); clearTimeout(timeout); });
    });
  });
  server.on('close', () => { for (const ws of wss.clients) ws.terminate(); wss.close(); });
}
