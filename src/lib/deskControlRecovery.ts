import type { ControlReceipt, RunControl } from './deskDispatch';

export type SavedControl = { request: RunControl; receipt?: ControlReceipt };

/** A known local stop result must not let an offline host disable later emergency stops. */
export function canStartNewStopAll(receipt: ControlReceipt | undefined, hostId: string | undefined): boolean {
  if (receipt?.action !== 'stopAll' || receipt.state !== 'pending' || !hostId) return false;
  const local = receipt.hosts?.find((host) => host.id === hostId);
  return !!local && ['confirmed', 'failed'].includes(local.state) && Array.isArray(local.runs)
    && local.runs.every((run) => ['confirmed', 'failed'].includes(run.state));
}

/** Background recovery always reads the original UUID. Only an explicit new Stop all may replace it. */
export function shouldRecoverControl(saved: SavedControl | undefined, action: RunControl['action'] | undefined, hostId?: string): boolean {
  if (!saved || (saved.receipt && !['pending', 'unknown'].includes(saved.receipt.state))) return false;
  return action !== 'stopAll' || !canStartNewStopAll(saved.receipt, hostId);
}
