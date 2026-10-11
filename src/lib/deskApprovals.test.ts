import { readApprovalAnswer, readApprovalReceipt, readRuntimeRequest, approvalMessage } from './deskApprovals';
import { EMPTY_STREAM, readStreamMessage, reduceStream } from './deskEvents';
const row = { id: '11111111-1111-4111-8111-111111111111', runId: 'abcdef01', agent: 'codex' as const,
  what: 'run a command', subject: 'npm test', effect: 'C:/project', always: null, state: 'pending' as const, createdAt: 10 };
const answer = { commandId: '22222222-2222-4222-8222-222222222222', requestId: row.id, decision: 'allow' as const, source: 'phone' as const };
test('only typed host requests and exact receipt identities can authorize UI state', () => {
  expect(readRuntimeRequest(row)).toEqual(row);
  expect(readRuntimeRequest({ ...row, id: 'sample-1' })).toBeNull();
  expect(readRuntimeRequest({ ...row, state: 'done' })).toBeNull();
  expect(readApprovalAnswer({ ...answer, decision: 'full' })).toBeNull();
  expect(() => readApprovalReceipt({ commandId: answer.commandId, requestId: row.id, state: 'confirmed', request: row }, answer)).toThrow();
  expect(readRuntimeRequest({ ...row, state: 'answered' })).toBeNull();
  expect(readApprovalReceipt({ commandId: answer.commandId, requestId: row.id, state: 'confirmed', request: { ...row, state: 'answered', decision: 'allow', source: 'phone' } }, answer).state).toBe('confirmed');
  expect(() => readApprovalReceipt({ commandId: answer.commandId, requestId: row.id, state: 'confirmed', request: { ...row, state: 'answered', decision: 'allow', source: 'pc' } }, answer)).toThrow();
  expect(approvalMessage({ ...row, state: 'answered', decision: 'deny', source: 'pc' })).toContain('from pc');
});
test('runtime requests travel through snapshot/replay without bypassing synchronization', () => {
  const snapshot = { ...EMPTY_STREAM, epoch: 'pc', approvals: [row] };
  const message = readStreamMessage({ type: 'snapshot', snapshot }); expect(message).not.toBeNull();
  const state = reduceStream(EMPTY_STREAM, message!); expect(state.phase).toBe('connecting');
  const event = readStreamMessage({ type: 'event', event: { kind: 'approvals', runId: null, sequence: 1, at: 11, approvals: [{ ...row, state: 'expired' }] } });
  expect(reduceStream(state, event!).approvals?.[0].state).toBe('expired');
  expect(readStreamMessage({ type: 'snapshot', snapshot: { ...snapshot, approvals: [{ ...row, decision: 'fabricated' }] } })).toBeNull();
});
