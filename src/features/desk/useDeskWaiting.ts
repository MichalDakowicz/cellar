import { useDeskStatus } from './DeskStatusProvider';

/**
 * What the desk plate is badged with: everything waiting on you.
 *
 * Unknown totals have no numeric badge. Sample cards never enter this source.
 */
export function useDeskWaiting(): number {
  return useDeskStatus().counts.waiting ?? 0;
}
