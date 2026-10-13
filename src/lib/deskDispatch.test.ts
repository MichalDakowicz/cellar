import { controlMessage, readControlReceipt, readQueuedMessage, readRunControl, readRunQueue, type QueuedMessage, type RunControl } from './deskDispatch';

const id = '11111111-1111-4111-8111-111111111111';
const request: RunControl = { commandId: id, action: 'send', runId: 'abcdef01', text: 'hello', source: 'phone' };
const item: QueuedMessage = { id, runId: 'abcdef01', text: 'hello', revision: 0, createdAt: 100, source: 'phone', state: 'queued',
  settings: { agent: 'codex', mode: 'ask', model: 'provider default', effort: 'provider default' } };
test('controls require bound identity and reject empty/oversize messages and arbitrary provider RPC', () => {
  expect(readRunControl(request)).toEqual(request);
  for (const patch of [{ commandId: 'sample' }, { runId: 'other' }, { text: '' }, { text: 'x'.repeat(8001) }, { action: 'turn/steer' }]) expect(readRunControl({ ...request, ...patch })).toBeNull();
  expect(readRunControl({ ...request, action: 'promote', itemId: id, revision: 0 })).toEqual({ commandId: id, action: 'promote', runId: 'abcdef01', itemId: id, revision: 0, source: 'phone' });
  expect(readRunControl({ ...request, action: 'cancel', itemId: id, revision: -1 })).toBeNull();
});
test('receipts bind original command/run/item and distinguish acceptance from execution', () => {
  const receipt = { commandId: id, action: 'send', runId: item.runId, state: 'confirmed', item };
  expect(controlMessage(readControlReceipt(receipt, request))).toMatch(/Queued on PC/);
  for (const patch of [{ commandId: 'other' }, { runId: 'abcdef02' }, { item: undefined }, { item: { ...item, id: '22222222-2222-4222-8222-222222222222' } }]) expect(() => readControlReceipt({ ...receipt, ...patch }, request)).toThrow();
  const promote: RunControl = { ...request, action: 'promote', itemId: id, revision: 0 };
  expect(() => readControlReceipt({ ...receipt, action: 'promote' }, promote)).toThrow(/not confirmed/);
  expect(readControlReceipt({ ...receipt, action: 'promote', state: 'unknown', item: { ...item, state: 'unknown' } }, promote).state).toBe('unknown');
});
test('queue snapshots reject another run, samples and invented host settings', () => {
  expect(readRunQueue({ runId: item.runId, available: true, busy: true, items: [item] }, item.runId).items).toEqual([item]);
  expect(() => readRunQueue({ runId: item.runId, available: true, busy: true, items: [{ ...item, runId: 'abcdef02' }] }, item.runId)).toThrow();
  expect(() => readQueuedMessage({ ...item, settings: { ...item.settings, model: 'sample-model' } })).toThrow();
});
test('Stop all reports partial/offline hosts without claiming all runs stopped', () => {
  const message = controlMessage({ commandId: id, action: 'stopAll', runId: null, state: 'pending', hosts: [
    { id: 'pc1', name: 'one', commandId: id, state: 'confirmed', runs: [{ id: 'abcdef01', name: 'work', state: 'confirmed' }] },
    { id: 'pc2', name: 'two', commandId: id, state: 'pending' },
  ] });
  expect(message).toBe('1 runs stopped · 0 unconfirmed/unsupported · 1 hosts pending');
});
