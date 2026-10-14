import { providerUsage } from './deskUsage';
test('Codex context uses last input window rather than cumulative totals', () => {
  const u = providerUsage('r', { agent: 'codex', context: { last: { totalTokens: 80 }, total: { totalTokens: 999 }, modelContextWindow: 100 }, limits: { rateLimitsByLimitId: { codex: { primary: { usedPercent: 42, windowDurationMins: 300, resetsAt: 10 } } } } }, 1);
  expect(u.context?.percent).toBe(80); expect(u.windows[0]).toEqual({ label: 'codex · 5-hour', used: 42, resetsAt: 10000 });
});
test('missing windows stay unavailable; Claude summary explicitly estimated', () => {
  expect(providerUsage('r', { agent: 'codex' }).windows).toEqual([]);
  expect(providerUsage('r', { agent: 'claude', context: { totalTokens: 80, maxTokens: 100 }, limits: { rate_limits: { seven_day: { utilization: null } } } }).context?.estimated).toBe(true);
});
