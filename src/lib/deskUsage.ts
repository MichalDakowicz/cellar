export type UsageWindow = { label: string; used: number; resetsAt: number | null };
export type DeskUsage = { runId: string; agent: string; at: number; context: { used: number; max: number; percent: number; estimated: boolean } | null; windows: UsageWindow[]; note: string | null };
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function providerUsage(runId: string, raw: any, now = Date.now()): DeskUsage {
  let context: DeskUsage['context'] = null; const windows: UsageWindow[] = [];
  if (raw?.agent === 'codex') {
    const c = raw.context;
    if (number(c?.last?.totalTokens) && number(c?.modelContextWindow) && c.modelContextWindow > 0) context = { used: c.last.totalTokens, max: c.modelContextWindow, percent: c.last.totalTokens / c.modelContextWindow * 100, estimated: false };
    const all = raw.limits?.rateLimitsByLimitId ? Object.entries(raw.limits.rateLimitsByLimitId) : [['codex', raw.limits?.rateLimits]];
    for (const [name, value] of all as [string, any][]) for (const label of ['primary', 'secondary']) {
      const w = value?.[label]; if (!number(w?.usedPercent) || !number(w?.windowDurationMins)) continue;
      windows.push({ label: `${name} · ${w.windowDurationMins === 300 ? '5-hour' : w.windowDurationMins === 10080 ? 'weekly' : w.windowDurationMins + ' min'}`, used: Math.min(100, w.usedPercent), resetsAt: number(w.resetsAt) ? w.resetsAt * 1000 : null });
    }
  } else if (raw?.agent === 'claude') {
    const c = raw.context;
    if (number(c?.totalTokens) && number(c?.maxTokens) && c.maxTokens > 0) context = { used: c.totalTokens, max: c.maxTokens, percent: c.totalTokens / c.maxTokens * 100, estimated: true };
    for (const [name, w] of Object.entries(raw.limits?.rate_limits ?? {}) as [string, any][]) {
      if (!number(w?.utilization)) continue;
      const at = typeof w.resets_at === 'string' ? Date.parse(w.resets_at) : NaN;
      windows.push({ label: name.replace('five_hour', '5-hour').replace('seven_day', 'weekly').replace(/_/g, ' '), used: Math.min(100, w.utilization), resetsAt: Number.isFinite(at) ? at : null });
    }
  }
  return { runId, agent: raw?.agent ?? 'unknown', at: now, context, windows, note: windows.length ? null : 'Plan limits unavailable for this session; API accounts do not report subscription windows.' };
}
