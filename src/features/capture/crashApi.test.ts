import { fileDebugCrash } from './crashApi';
import type { DebugCrash } from '@/lib/debugCrashes';
const mockWrites: { table: string; rows: any; options: any }[] = [];
let mockFailNotes = false;
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => ({ upsert: (rows: any, options: any) => {
  mockWrites.push({ table, rows, options }); return Promise.resolve({ error: table === 'cellar_entry_lines' && mockFailNotes ? new Error('lost notes reply') : null });
} }) } }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_: string, value: string) => jest.requireActual('crypto').createHash('sha256').update(value).digest('hex') }));
const crash = { owner: 'owner', signature: 'a'.repeat(64), stack: 'Error\napi_key=private-key', log: 'password=hidden', count: 2, at: 1000 } as DebugCrash;
beforeEach(() => { mockWrites.length = 0; mockFailNotes = false; });
test('lost report reply retries same entry and note IDs, updates repeat count and redacts evidence', async () => {
  mockFailNotes = true; await expect(fileDebugCrash('owner', crash)).rejects.toThrow('lost notes reply');
  const first = [...mockWrites]; mockWrites.length = 0; mockFailNotes = false;
  const id = await fileDebugCrash('owner', { ...crash, count: 3 });
  expect(id).toBe(first[0].rows.id); expect(mockWrites[0].options.ignoreDuplicates).toBe(true);
  expect(mockWrites[1].rows.map((r: any) => r.id)).toEqual(first[1].rows.map((r: any) => r.id));
  expect(mockWrites[1].rows[0].text).toContain('repeated 3 times');
  expect(JSON.stringify(mockWrites)).not.toContain('private-key'); expect(JSON.stringify(mockWrites)).not.toContain('hidden');
});
test('another account cannot file captured evidence', async () => {
  await expect(fileDebugCrash('other', crash)).rejects.toThrow('different signed-in account'); expect(mockWrites).toHaveLength(0);
});
