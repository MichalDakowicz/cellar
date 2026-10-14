import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { screenInput, type ScreenAccess, type ScreenInput, type ScreenDisplay } from '@/lib/deskRemote';
import { DeskError } from './claudeRuns.ts';

export type ScreenAdapter = { displays?: () => ScreenDisplay[]; answer?: (id: string, offer: { type: 'offer'; sdp: string }, displayId?: string) => Promise<{ type: 'answer'; sdp: string }>; closePeer?: (id: string) => void; prepare?: () => Promise<void>; close?: () => void; aspect: () => number; input: (input: ScreenInput, displayId?: string) => Promise<void>; confirm: () => Promise<'once' | 'trust' | 'deny'>; locked: () => boolean };
type Lease = ScreenAccess & { owner: string; key: string; sequence: number };
/** Consent belongs to the account and paired key. Leases never survive restart. */
export class ScreenControl {
  private leases = new Map<string, Lease>();
  private expiry = new Map<string, ReturnType<typeof setTimeout>>();
  private trusted: string[];
  private pending = false;
  private queue: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(dir: string, private identity: () => { owner: string | null; key: string }, private adapter: ScreenAdapter, private now = Date.now) {
    this.file = join(dir, 'screen-trust.json');
    this.trusted = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : [];
  }
  private who() { const who = this.identity(); if (!who.owner || this.adapter.locked()) throw new DeskError('Sign in and unlock the PC to share its screen.', 403); return who as { owner: string; key: string }; }
  private trustKey(who: { owner: string; key: string }) { return createHash('sha256').update(JSON.stringify([who.owner, who.key])).digest('hex'); }
  async open(source: 'pc' | 'phone'): Promise<ScreenAccess> {
    const who = this.who();
    for (const [id, lease] of this.leases) if (lease.expiresAt <= this.now()) this.leases.delete(id);
    if (this.pending || this.leases.size >= 8) throw new DeskError('Screen request already open. Close it or try again.', 409);
    if (source !== 'pc' && !this.trusted.includes(this.trustKey(who))) {
      this.pending = true;
      let decision: 'once' | 'trust' | 'deny';
      try { decision = await this.adapter.confirm(); } finally { this.pending = false; }
      if (JSON.stringify(this.who()) !== JSON.stringify(who)) throw new DeskError('Account or pairing changed.', 409);
      if (decision === 'deny') throw new DeskError('Screen request declined on the PC.', 403);
      if (decision === 'trust') { this.trusted.push(this.trustKey(who)); this.save(); }
    }
    await this.adapter.prepare?.();
    if (JSON.stringify(this.who()) !== JSON.stringify(who)) throw new DeskError('Account or pairing changed.', 409);
    for (const [id, lease] of this.leases) if (lease.expiresAt <= this.now()) this.leases.delete(id);
    const displays = this.adapter.displays?.(); const display = displays?.find((d) => d.primary) ?? displays?.[0];
    const lease: Lease = { ...who, id: randomUUID(), expiresAt: this.now() + 10 * 60_000, aspect: display?.aspect ?? this.adapter.aspect(), controls: true, sequence: 0, displayId: display?.id, displays };
    this.leases.set(lease.id, lease);
    const expiry = setTimeout(() => this.release(lease.id), 10 * 60_000); expiry.unref(); this.expiry.set(lease.id, expiry);
    return this.view(lease);
  }
  private view(lease: Lease): ScreenAccess { const { id, expiresAt, aspect, controls, displayId, displays } = lease; return { id, expiresAt, aspect, controls, displayId, displays }; }
  private displayValid(lease: Lease) { if (lease.displayId && !this.adapter.displays?.().some((d) => d.id === lease.displayId)) throw new DeskError('Display disconnected. Reopen the screen.', 409); }
  async select(raw: unknown) {
    const row = raw as { id?: string; displayId?: string };
    const apply = () => {
      if (!row || typeof row.id !== 'string' || !this.valid(row.id)) throw new DeskError('Screen consent expired or revoked.', 403);
      const displays = this.adapter.displays?.(); const display = displays?.find((d) => d.id === row.displayId);
      if (!display) throw new DeskError('Display unavailable.', 409);
      const lease = this.leases.get(row.id)!; this.adapter.closePeer?.(row.id);
      lease.displayId = display.id; lease.aspect = display.aspect; lease.displays = displays;
      return this.view(lease);
    };
    const next = this.queue.catch(() => {}).then(apply); this.queue = next; return next;
  }
  valid(id: string): boolean {
    const lease = this.leases.get(id); const who = this.identity();
    return !!lease && !this.adapter.locked() && lease.owner === who.owner && lease.key === who.key && lease.expiresAt > this.now();
  }
  async input(raw: unknown) {
    const row = raw as { id?: string; sequence?: number; input?: unknown };
    if (!row || typeof row.id !== 'string' || !Number.isSafeInteger(row.sequence) || row.sequence! < 1) throw new DeskError('Invalid screen session.');
    const input = screenInput(row.input);
    const apply = async () => {
      if (!this.valid(row.id!)) throw new DeskError('Screen consent expired or revoked. Open the screen again.', 403);
      const lease = this.leases.get(row.id!)!;
      if (row.sequence! <= lease.sequence) throw new DeskError('Screen input already handled or superseded.', 409);
      lease.sequence = row.sequence!; // A failed or lost input is never replayed.
      this.displayValid(lease); await this.adapter.input(input, lease.displayId);
      return { applied: true };
    };
    const next = this.queue.catch(() => {}).then(apply); this.queue = next;
    return next;
  }
  async answer(id: string, raw: unknown) {
    const offer = raw as { type: 'offer'; sdp: string };
    if (!this.valid(id) || !this.adapter.answer) throw new DeskError('Screen consent expired or video unavailable.', 403);
    if (!offer || offer.type !== 'offer' || typeof offer.sdp !== 'string' || offer.sdp.length > 60000 || !offer.sdp.startsWith('v=0')) throw new DeskError('Invalid video offer.');
    const lease = this.leases.get(id)!; this.displayValid(lease); const displayId = lease.displayId;
    const answer = await this.adapter.answer(id, offer, displayId);
    if (!this.valid(id) || this.leases.get(id)?.displayId !== displayId) { this.adapter.closePeer?.(id); throw new DeskError('Screen consent or display changed.', 403); }
    return answer;
  }
  release(id: string) { clearTimeout(this.expiry.get(id)); this.expiry.delete(id); this.adapter.closePeer?.(id); this.leases.delete(id); if (!this.leases.size) this.adapter.close?.(); }
  revoke() { for (const timer of this.expiry.values()) clearTimeout(timer); this.expiry.clear(); this.leases.clear(); this.adapter.close?.(); }
  forget() { this.revoke(); this.trusted = []; this.save(); }
  private save() { writeFileSync(this.file + '.tmp', JSON.stringify(this.trusted)); renameSync(this.file + '.tmp', this.file); }
}
