import { DeskStream } from './deskStream';

class Socket {
  static OPEN = 1; static all: Socket[] = [];
  readyState = 0; onopen: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null; onerror: (() => void) | null = null; sent: string[] = [];
  constructor(readonly url: string) { Socket.all.push(this); }
  send(text: string) { this.sent.push(text); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.(); }
  message(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }); }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => { jest.useFakeTimers(); Socket.all = []; });
afterEach(() => { jest.useRealTimers(); });
test('one client shares one socket; synchronization gates output and changed views subscribe after sync', async () => {
  const ticket = jest.fn(async () => 'ws://pc/events/ticket'); const save = jest.fn();
  const client = new DeskStream(ticket, { epoch: 'old', sequence: 12 }, save, Socket as unknown as typeof WebSocket);
  const offHome = client.acquire({}, null); const offChat = client.acquire({}, 'run1');
  await flush(); expect(ticket).toHaveBeenCalledTimes(1); expect(Socket.all).toHaveLength(1);
  const socket = Socket.all[0]; socket.open();
  expect(JSON.parse(socket.sent[0])).toMatchObject({ runId: 'run1', approvals: true, epoch: 'old', afterSequence: 12 });
  const offNext = client.acquire({}, 'run2'); expect(socket.sent).toHaveLength(1);
  socket.message({ type: 'snapshot', snapshot: { epoch: 'new', sequence: 15, at: 1, runs: [], runId: 'run1', items: [] } });
  expect(client.state.phase).toBe('connecting'); expect(save).not.toHaveBeenCalled();
  socket.message({ type: 'synchronized', sequence: 15 });
  expect(JSON.parse(socket.sent[1])).toMatchObject({ runId: 'run2', afterSequence: 15 });
  expect(client.state.phase).toBe('connecting');
  socket.message({ type: 'snapshot', snapshot: { epoch: 'new', sequence: 15, at: 2, runs: [], runId: 'run2', items: [] } });
  socket.message({ type: 'synchronized', sequence: 15 }); expect(client.state.phase).toBe('live');
  offNext(); offChat(); offHome(); expect(client.state.phase).toBe('disconnected');
});
test('disconnect hides live state and resumes original cursor; malformed/gapped data fails', async () => {
  const client = new DeskStream(async () => 'ws://pc/events/ticket', { epoch: '', sequence: 0 }, () => {}, Socket as unknown as typeof WebSocket);
  const off = client.acquire({}, 'run'); await flush(); let socket = Socket.all[0]; socket.open();
  socket.message({ type: 'snapshot', snapshot: { epoch: 'db', sequence: 5, at: 1, runs: [], runId: 'run', items: [] } });
  socket.message({ type: 'synchronized', sequence: 5 });
  socket.onclose?.(); expect(client.state.phase).toBe('disconnected');
  jest.advanceTimersByTime(1000); await flush(); socket = Socket.all[1]; socket.open();
  expect(JSON.parse(socket.sent[0])).toMatchObject({ epoch: 'db', afterSequence: 5 });
  socket.message({ type: 'snapshot', snapshot: { epoch: 'db', sequence: 5, at: 2, runs: [], runId: 'run', items: [] } });
  socket.message({ type: 'event', event: { sequence: 7, at: 2, runId: null, kind: 'catalog', runs: [] } });
  expect(client.state.phase).toBe('failed'); off();
});
