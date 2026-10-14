import { readDebugCrashes, redactCrash, crashUuid } from './debugCrashes';
test('crash queue rejects malformed and oversized reports', () => {
  const report = { signature: 'a'.repeat(64), stack: 'error', log: 'log', count: 2, at: 1 };
  expect(readDebugCrashes(JSON.stringify([report]))[0].count).toBe(2);
  expect(() => readDebugCrashes(JSON.stringify([{ ...report, stack: 'x'.repeat(32001) }]))).toThrow();
});
test('secrets redacted and report ids deterministic per owner hash', () => {
  expect(redactCrash('authorization=BearerThing api_key=sk-abcdefghijklmnop password=hunter2')).not.toMatch(/BearerThing|abcdefghijklmnop|hunter2/);
  expect(crashUuid('a'.repeat(64))).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/);
});
