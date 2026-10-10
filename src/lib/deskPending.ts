import type { DeskStart } from './deskProtocol';

/** Only confirmed tasks leave a batch; only proven refusals get a new ID. */
export function settleTaskStart(tasks: DeskStart[], state: 'confirmed' | 'failed' | 'unknown', newId: () => string): DeskStart[] {
  if (!tasks.length || state === 'unknown') return tasks;
  if (state === 'confirmed') return tasks.slice(1);
  return [{ ...tasks[0], commandId: newId() }, ...tasks.slice(1)];
}
