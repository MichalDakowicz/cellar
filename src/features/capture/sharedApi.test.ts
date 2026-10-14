import { fileSharedDraft } from './sharedApi';
import { sharedDraft, submitSharedDraft } from '@/lib/sharedDraft';
const mockRows: Record<string, Map<string, any>> = { cellar_entries: new Map(), cellar_entry_lines: new Map() };
let mockLostNotes = false;
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => ({
  upsert: async (rows: any, options: any) => { if (!options.ignoreDuplicates) throw new Error('Must preserve existing rows'); for (const row of Array.isArray(rows) ? rows : [rows]) if (!mockRows[table].has(row.id)) mockRows[table].set(row.id, row); return { error: mockLostNotes && table === 'cellar_entry_lines' ? new Error('lost reply after save') : null }; },
  select: () => ({ eq: (_: string, id: string) => ({ single: async () => ({ data: mockRows[table].get(id), error: null }) }) }),
}) } }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_: string, text: string) => jest.requireActual('crypto').createHash('sha256').update(text).digest('hex') }));
beforeEach(() => { mockRows.cellar_entries.clear(); mockRows.cellar_entry_lines.clear(); mockLostNotes = false; });
test('lost filing reply and retry keep one entry and ordered notes with same IDs', async () => {
  const request = submitSharedDraft(sharedDraft('id', 'title\nfirst\nsecond'), 1000).submission!;
  mockLostNotes = true; await expect(fileSharedDraft('owner', request)).rejects.toThrow('lost reply');
  const ids = [...mockRows.cellar_entry_lines.keys()]; mockLostNotes = false; await fileSharedDraft('owner', request);
  expect(mockRows.cellar_entries.size).toBe(1); expect([...mockRows.cellar_entry_lines.keys()]).toEqual(ids);
  expect([...mockRows.cellar_entry_lines.values()].map((r) => r.created_at)).toEqual(['1970-01-01T00:00:01.000Z', '1970-01-01T00:00:01.001Z']);
});
test('retry refuses changed thought or another owner instead of overwriting', async () => {
  const request = submitSharedDraft(sharedDraft('id', 'title')).submission!;
  await fileSharedDraft('owner', request);
  await expect(fileSharedDraft('another', request)).rejects.toThrow('changed');
  mockRows.cellar_entries.get('id').text = 'user edited it';
  await expect(fileSharedDraft('owner', request)).rejects.toThrow('changed');
  expect(mockRows.cellar_entries.get('id').text).toBe('user edited it');
});
