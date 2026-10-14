import { sharedDraft, editSharedDraft, submitSharedDraft, migrateSharedDrafts } from './sharedDraft';
test('full share choices survive serialization; retry freezes original file identity and payload', () => {
  const draft = editSharedDraft(sharedDraft('id', 'title\nnote'), { picked: 'glitch', projectId: 'project', handoff: true });
  const restored = JSON.parse(JSON.stringify(draft));
  expect(restored).toEqual(draft);
  const started = submitSharedDraft(restored, 123);
  expect(started.submission).toEqual({ id: 'id', text: 'title\nnote', title: 'title', lines: ['note'], kind: 'glitch', projectId: 'project', handoff: true, submittedAt: 123 });
  expect(editSharedDraft(started, { text: 'new', projectId: null })).toBe(started);
  expect(submitSharedDraft(started)).toBe(started);
});
test('migration retains owner-scoped text drafts; unowned legacy data is discarded', () => {
  expect(migrateSharedDrafts({ pending: { a: ['one'], b: ['two'] } }, 1, () => 'id').pending).toEqual({ a: [sharedDraft('id', 'one')], b: [sharedDraft('id', 'two')] });
  expect(migrateSharedDrafts({ pending: ['unowned'] }, 0, () => 'id')).toEqual({ pending: {} });
});
