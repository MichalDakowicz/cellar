import { readDeskReceipt } from './deskReceipt';

test('starts settle only original UUID and an actual host run', () => {
  const run = { id: 'run', name: 'task', cwd: 'C:/work', agent: 'codex', state: 'running', startedAt: 1, origin: 'phone', entryId: null };
  expect(readDeskReceipt({ commandId: 'id', state: 'confirmed', run }, 'id')?.run).toEqual(run);
  expect(() => readDeskReceipt({ commandId: 'other', state: 'confirmed', run }, 'id')).toThrow();
  expect(() => readDeskReceipt({ commandId: 'id', state: 'confirmed' }, 'id')).toThrow();
  expect(readDeskReceipt({ commandId: 'id', state: 'unknown' }, 'id')?.state).toBe('unknown');
  expect(readDeskReceipt(null, 'id')).toBeNull();
});
