import { managedChecks, parsePreviewAction, readManagedPreviews, readPreviewReceipt } from './deskManagedPreview';
import type { ManagedPreview } from './deskManagedPreview';
import type { DeskRun } from './deskProtocol';

const action = { commandId: '11111111-1111-4111-8111-111111111111', projectId: '22222222-2222-4222-8222-222222222222', runId: 'abcdef12', action: 'deploy' };
test('preview actions require stable identity and an explicit boolean confirmation', () => {
  expect(parsePreviewAction(action)).toEqual(action);
  expect(() => parsePreviewAction({ ...action, confirmUnopened: 'true' })).toThrow();
  expect(() => parsePreviewAction({ ...action, commandId: 'random' })).toThrow();
  expect(() => parsePreviewAction({ ...action, action: 'shell' })).toThrow();
});
test('unknown and stopped checks never report passed', () => {
  const preview = { checks: [{ command: 'test', jobId: 'job' }] } as ManagedPreview;
  expect(managedChecks(preview, [])[0].detail).toBe('result unknown');
  expect(managedChecks(preview, [{ id: 'job', state: 'stopped' } as DeskRun])[0].detail).toBe('stopped');
  expect(managedChecks(preview, [{ id: 'job', state: 'done' } as DeskRun])[0].state).toBe('passed');
});
test('malformed/uncorrelated preview replies never become confirmed actions', () => {
  expect(() => readManagedPreviews([{ port: 65536 }])).toThrow();
  expect(() => readManagedPreviews(null)).toThrow();
  expect(() => readPreviewReceipt({ commandId: 'different', state: 'confirmed' }, action.commandId)).toThrow();
  expect(() => readPreviewReceipt({ commandId: action.commandId, state: 'confirmed' }, action.commandId)).toThrow();
});
