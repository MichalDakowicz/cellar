import { deskTestResults } from './deskTestResults';

const log = (text: string) => [{ who: 'system' as const, text }];
describe('test results from real output', () => {
  it('reads Jest totals, skips and duration', () => {
    expect(deskTestResults(log('Tests: 2 skipped, 841 passed, 843 total\nTime: 74.24 s\nexit 0'))).toEqual({
      runner: 'Jest', passed: 841, failed: 0, skipped: 2, total: 843, duration: '74.24 s', failures: [],
    });
  });
  it('retains failure names and does not count a repeated footer twice', () => {
    const result = deskTestResults(log('FAIL src/one.test.ts\n  ● counts > rejects duplicates\nTests: 1 failed, 2 passed, 3 total\nTests: 1 failed, 2 passed, 3 total'));
    expect(result?.total).toBe(3);
    expect(result?.failures).toEqual(['src/one.test.ts', 'counts > rejects duplicates']);
  });
  it('reads Node TAP footer and refuses cancelled runs', () => {
    const footer = '# tests 3\n# suites 1\n# pass 2\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 500';
    expect(deskTestResults(log(footer))).toMatchObject({ runner: 'Node', passed: 2, failed: 1, total: 3, duration: '0.50 s' });
    expect(deskTestResults(log(footer.replace('cancelled 0', 'cancelled 1')))).toBeNull();
  });
  it('reads Vitest and ANSI colors', () => {
    expect(deskTestResults(log('\u001b[32m Tests  2 passed (2)\u001b[0m\n Duration  1.2s'))).toMatchObject({ runner: 'Vitest', passed: 2, total: 2, duration: '1.2s' });
  });
  it('does not invent results from exit, partial or inconsistent output', () => {
    for (const text of ['exit 0', 'PASS one.test.ts', 'Tests: 2 passed', 'Tests: 1 failed, 2 passed, 2 total', 'BUILD SUCCESSFUL']) {
      expect(deskTestResults(log(text))).toBeNull();
    }
  });
});
