import { finishedWorktreeRun, readProjectWorktrees, worktreeSlug } from './deskWorktrees';

test('workspace names are safe Git branch slugs with full durable identity', () => {
  expect(worktreeSlug('Hello; $(oops) ../ 🧱', '00000000-0000-4000-8000-000000000001')).toBe('hello-oops-00000000000040008000000000000001');
  expect(worktreeSlug('🧱', 'abcdef')).toBe('task-abcdef');
  expect(worktreeSlug('x'.repeat(80), 'abc').length).toBe(40);
});

test('unknown and active runs never qualify for lifecycle actions', () => {
  for (const state of ['unknown', 'waiting', 'running', 'missing']) expect(finishedWorktreeRun(state)).toBe(false);
  for (const state of ['done', 'failed', 'stopped']) expect(finishedWorktreeRun(state)).toBe(true);
});

test('malformed host workspaces fail reads instead of becoming confirmed empty data', () => {
  const row = { id: null, projectId: 'project', path: '/real', branch: 'main', head: 'a'.repeat(40), main: true, dirty: false, unavailable: null, locked: false, kept: false };
  const project = { projectId: 'project', base: 'main', available: true, reason: null, worktrees: [row] };
  expect(readProjectWorktrees([project])).toEqual([project]);
  expect(readProjectWorktrees([])).toEqual([]);
  expect(readProjectWorktrees([{ ...project, worktrees: [{ ...row, dirty: null, unavailable: 'missing folder' }] }])).toHaveLength(1);
  for (const raw of [null, {}, [{ ...project, worktrees: [{ ...row, head: 'sample' }] }], [{ ...project, worktrees: [{ ...row, dirty: 'false' }] }]]) {
    expect(() => readProjectWorktrees(raw)).toThrow('valid worktree list');
  }
});
