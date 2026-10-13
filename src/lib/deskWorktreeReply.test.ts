import { readWorktreeReceipt, readWorktreeReview } from './deskWorktreeReply';
import type { WorktreeRequest } from './deskWorktrees';

const review = { worktreeId: 'tree', action: 'merge', token: 'a'.repeat(64), sourceHead: 'a'.repeat(40), targetHead: 'b'.repeat(40), branch: 'task', target: 'main', summary: 'merge into main', allowed: true, reason: null };
const request: WorktreeRequest = { commandId: 'original', worktreeId: 'tree', action: 'merge', token: review.token };
test('review binds action and worktree and requires Git heads', () => {
  expect(readWorktreeReview(review, 'tree', 'merge')).toEqual(review);
  expect(() => readWorktreeReview(review, 'other', 'merge')).toThrow();
  expect(() => readWorktreeReview(review, 'tree', 'remove')).toThrow();
  expect(() => readWorktreeReview({ ...review, sourceHead: '' }, 'tree', 'merge')).toThrow();
});
test('confirmed receipt cannot settle another UUID or worktree action', () => {
  const receipt = { commandId: 'original', state: 'confirmed', result: { worktreeId: 'tree', action: 'merge', message: 'merged' } };
  expect(readWorktreeReceipt(receipt, 'original', request)).toEqual(receipt);
  expect(() => readWorktreeReceipt(receipt, 'other', request)).toThrow();
  expect(() => readWorktreeReceipt({ ...receipt, result: { ...receipt.result, action: 'remove' } }, 'original', request)).toThrow();
  expect(readWorktreeReceipt({ commandId: 'original', state: 'unknown' }, 'original', request).state).toBe('unknown');
});
