import { EMPTY_STREAM, readStreamMessage, reduceStream, type StreamState } from '@/lib/deskEvents';

type Cursor = { epoch: string; sequence: number };
/** One shared socket per client/PC/account. All views consume the same synchronized state. */
export class DeskStream {
  state: StreamState = { ...EMPTY_STREAM };
  private listeners = new Set<() => void>();
  private interests = new Map<object, string | null>();
  private socket: WebSocket | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private delay = 1000;
  private lastRun: string | null = null;
  private cursor: Cursor;
  private opening = false;
  constructor(private ticket: () => Promise<string>, cursor: Cursor,
    private readonly save: (state: StreamState) => void, private readonly Socket: typeof WebSocket = WebSocket) { this.cursor = cursor; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  snapshot = () => this.state;
  setTicket(ticket: () => Promise<string>) { this.ticket = ticket; }
  acquire(token: object, runId: string | null): () => void {
    this.interests.set(token, runId);
    if (!this.socket && !this.retry && !this.opening) void this.connect();
    else this.selectRun();
    return () => {
      this.interests.delete(token);
      if (!this.interests.size) this.disconnect(); else this.selectRun();
    };
  }
  reconnect = () => { this.disconnect(); if (this.interests.size) void this.connect(); };
  pause = () => { this.disconnect(); };
  private emit(state: StreamState) { this.state = state; for (const listener of this.listeners) listener(); }
  private selectedRun() { return [...this.interests.values()].filter((id) => id !== null).at(-1) ?? null; }
  private selectRun() {
    const runId = this.selectedRun();
    if (this.socket?.readyState !== this.Socket.OPEN || this.state.phase === 'connecting' || (runId === this.lastRun && this.state.phase !== 'disconnected')) return;
    this.lastRun = runId;
    this.emit({ ...this.state, phase: 'connecting', error: null });
    this.socket.send(JSON.stringify({ type: 'subscribe', runId, approvals: true, ...{ afterSequence: this.cursor.sequence, epoch: this.cursor.epoch } }));
  }
  private disconnect() {
    this.generation++; if (this.retry) clearTimeout(this.retry); if (this.watchdog) clearTimeout(this.watchdog);
    this.retry = null; this.watchdog = null;
    this.opening = false;
    const socket = this.socket; this.socket = null; socket?.close();
    this.emit({ ...this.state, phase: 'disconnected', error: null });
  }
  private async connect() {
    const generation = ++this.generation;
    this.opening = true;
    this.emit({ ...this.state, phase: 'connecting', error: null });
    try {
      const url = await this.ticket();
      if (generation !== this.generation || !this.interests.size) return;
      const socket = new this.Socket(url); this.socket = socket;
      this.lastRun = null;
      const alive = () => { if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = setTimeout(() => { socket.close(); this.lost(generation, 'PC stream timed out.'); }, 25_000); };
      socket.onopen = () => {
        if (generation !== this.generation) return;
        const runId = this.selectedRun(); this.lastRun = runId;
        socket.send(JSON.stringify({ type: 'subscribe', runId, approvals: true, afterSequence: this.cursor.sequence, epoch: this.cursor.epoch })); alive();
      };
      socket.onmessage = (event) => {
        if (generation !== this.generation) return;
        try {
          const message = readStreamMessage(JSON.parse(String(event.data)));
          if (!message) throw new Error('Invalid PC event response.');
          const next = reduceStream(this.state, message); this.emit(next); alive();
          if (next.phase === 'failed') { socket.close(); this.lost(generation, next.error); return; }
          if (next.phase === 'live') { this.delay = 1000; this.cursor = { epoch: next.epoch, sequence: next.sequence }; this.save(next); this.selectRun(); }
        } catch (error) { socket.close(); this.lost(generation, (error as Error).message); }
      };
      socket.onerror = () => { socket.close(); this.lost(generation, 'PC live stream failed.'); };
      socket.onclose = () => this.lost(generation, this.state.error);
    } catch (error) { this.lost(generation, (error as Error).message); }
    finally { if (generation === this.generation) this.opening = false; }
  }
  private lost(generation: number, error: string | null) {
    if (generation !== this.generation) return;
    this.generation++; this.opening = false; this.socket = null; if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null;
    this.emit({ ...this.state, phase: error ? 'failed' : 'disconnected', error });
    if (this.interests.size) {
      this.retry = setTimeout(() => { this.retry = null; void this.connect(); }, this.delay);
      this.delay = Math.min(this.delay * 2, 15_000);
    }
  }
}
