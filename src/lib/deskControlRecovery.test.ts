import type { ControlReceipt, RunControl } from './deskDispatch';
import { canStartNewStopAll, shouldRecoverControl } from './deskControlRecovery';

const request: RunControl = { commandId: '11111111-1111-4111-8111-111111111111', action: 'stopAll', runId: null, scope: 'account', source: 'phone' };
const receipt: ControlReceipt = { ...request, state: 'pending', hosts: [
  { id: 'local', name: 'this pc', commandId: request.commandId, state: 'failed', runs: [
    { id: 'abcdef01', name: 'owned run', state: 'confirmed' },
    { id: 'abcdef02', name: 'historical run', state: 'failed' },
  ] },
  { id: 'offline', name: 'other pc', commandId: 'remote-command', state: 'pending' },
] };

test('offline host does not prevent an explicit new Stop all after local stops settle', () => {
  expect(canStartNewStopAll(receipt, 'local')).toBe(true);
  expect(shouldRecoverControl({ request, receipt }, 'stopAll', 'local')).toBe(false);
  expect(shouldRecoverControl({ request, receipt }, undefined, 'local')).toBe(true);
});

test('lost replies and uncertain local effects retain the original UUID even on another tap', () => {
  expect(shouldRecoverControl({ request }, 'stopAll', 'local')).toBe(true);
  expect(shouldRecoverControl({ request, receipt: { ...receipt, state: 'unknown' } }, 'stopAll', 'local')).toBe(true);
  expect(shouldRecoverControl({ request, receipt }, 'stopAll', 'missing-host')).toBe(true);
  expect(shouldRecoverControl({ request, receipt: { ...receipt, hosts: [{ ...receipt.hosts![0], runs: undefined }] } }, 'stopAll', 'local')).toBe(true);
  for (const state of ['pending', 'unknown'] as const) {
    const uncertain: ControlReceipt = { ...receipt, hosts: [{ ...receipt.hosts![0], state }] };
    expect(shouldRecoverControl({ request, receipt: uncertain }, 'stopAll', 'local')).toBe(true);
  }
  const uncertainRun: ControlReceipt = { ...receipt, hosts: [{ ...receipt.hosts![0], runs: [{ id: 'abcdef01', name: 'run', state: 'unknown' }] }] };
  expect(shouldRecoverControl({ request, receipt: uncertainRun }, 'stopAll', 'local')).toBe(true);
});

test('queue sends and single-run stops keep their existing receipt recovery rules', () => {
  expect(shouldRecoverControl({ request, receipt }, 'send', 'local')).toBe(true);
  expect(shouldRecoverControl({ request, receipt }, 'stop', 'local')).toBe(true);
  expect(shouldRecoverControl({ request, receipt: { ...receipt, state: 'failed' } }, 'stopAll', 'local')).toBe(false);
  expect(shouldRecoverControl(undefined, 'stopAll', 'local')).toBe(false);
});
