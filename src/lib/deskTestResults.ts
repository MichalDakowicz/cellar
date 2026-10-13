import type { DeskLogLine } from './deskProtocol';

export type DeskTestResults = {
  runner: 'Jest' | 'Vitest' | 'Node';
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: string | null;
  failures: string[];
};

/** Parse reported totals only. A successful process exit is never a test count. */
export function deskTestResults(lines: readonly DeskLogLine[]): DeskTestResults | null {
  // A chain can run several suites. Show the last reported suite, never add
  // possibly repeated totals or imply that a truncated log covers the whole job.
  const text = lines.map((line) => line.text).join('\n').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  const summaries = [...text.matchAll(/^\s*Tests\s*[: ]\s*(.+)$/gm)];
  const last = summaries.at(-1);
  let result: DeskTestResults | null = null;
  if (last) {
    const stats = last[1];
    const count = (label: string) => Number(new RegExp(`(\\d+) ${label}\\b`).exec(stats)?.[1] ?? 0);
    const passed = count('passed');
    const failed = count('failed');
    const skipped = count('skipped') + count('todo');
    const total = /\b(\d+) total\b/.exec(stats)?.[1] ?? /\((\d+)\)/.exec(stats)?.[1];
    if (total && passed + failed + skipped === Number(total)) {
      const after = text.slice(last.index!);
      result = { runner: last[0].includes(':') ? 'Jest' : 'Vitest', passed, failed, skipped, total: Number(total),
        duration: /^\s*(?:Time:\s*|Duration\s+)([^\n]+)/m.exec(after)?.[1]?.trim() ?? null, failures: [] };
    }
  }
  const node = [...text.matchAll(/(?:^|\n)# tests (\d+)\r?\n# suites \d+\r?\n# pass (\d+)\r?\n# fail (\d+)([\s\S]*?)(?=\n\$ |$)/g)].at(-1);
  if (node && (!last || node.index! > last.index!)) {
    const cancelled = Number(/^# cancelled (\d+)/m.exec(node[4])?.[1] ?? 0);
    const skipped = Number(/^# skipped (\d+)/m.exec(node[4])?.[1] ?? 0) + Number(/^# todo (\d+)/m.exec(node[4])?.[1] ?? 0);
    const [total, passed, failed] = node.slice(1, 4).map(Number);
    if (!cancelled && total === passed + failed + skipped) result = {
      runner: 'Node', total, passed, failed, skipped,
      duration: /^# duration_ms ([\d.]+)/m.exec(node[4])?.[1] ? `${(Number(/^# duration_ms ([\d.]+)/m.exec(node[4])![1]) / 1000).toFixed(2)} s` : null,
      failures: [],
    };
    else result = null;
  }
  if (!result) return null;
  if (result.failed) result.failures = [...new Set(text.split(/\r?\n/).flatMap((line) => {
    const hit = /^\s*(?:FAIL\s+|●\s+|not ok \d+ - |[×✖]\s+)(.+)/.exec(line);
    return hit ? [hit[1].trim()] : [];
  }))].slice(0, 20);
  return result;
}
