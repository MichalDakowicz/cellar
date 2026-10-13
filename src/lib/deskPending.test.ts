import { settleTaskStart } from './deskPending';
import type { DeskStart } from './deskProtocol';

const task = (commandId: string, entryId: string): DeskStart => ({ commandId, agent: 'codex', cwd: 'C:/repo', prompt: entryId, name: null, entryId, entryIds: [entryId] });

test('partial batch retains only unconfirmed tasks across persistence and retry', () => {
  const tasks = [task('first', 'a'), task('second', 'b'), task('third', 'c')];
  const remainder = settleTaskStart(tasks, 'confirmed', () => 'unused');
  const restored: DeskStart[] = JSON.parse(JSON.stringify(remainder));
  expect(settleTaskStart(restored, 'unknown', () => 'unsafe')).toEqual([tasks[1], tasks[2]]);
  expect(settleTaskStart(restored, 'confirmed', () => 'unused')).toEqual([tasks[2]]);
});

test('proven refusal changes only failed task ID and preserves payload and later IDs', () => {
  const tasks = [task('failed', 'b'), task('later', 'c')];
  expect(settleTaskStart(tasks, 'failed', () => 'new')).toEqual([{ ...tasks[0], commandId: 'new' }, tasks[1]]);
  expect(tasks[0].commandId).toBe('failed');
});
