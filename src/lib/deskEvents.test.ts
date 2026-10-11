import { EMPTY_STREAM, markdownChunks, readStreamMessage, reduceStream, turnLines } from './deskEvents';
import { turnGroups, visibleToolRows } from './deskTurnGroups';

test('snapshot/replay/live is idempotent and a gap never becomes live', () => {
  let state = reduceStream(EMPTY_STREAM, { type: 'snapshot', snapshot: { epoch: 'db', sequence: 3, runs: [], items: [], runId: 'run', at: 1 } });
  expect(state.phase).toBe('connecting');
  state = reduceStream(state, { type: 'event', event: { sequence: 2, at: 1, runId: 'run', kind: 'item', item: { id: 'x', kind: 'assistant_message', text: 'duplicate', status: 'completed' } } });
  expect(state.items).toEqual([]);
  state = reduceStream(state, { type: 'synchronized', sequence: 3 });
  expect(state.phase).toBe('live');
  const event = { sequence: 4, at: 2, runId: 'run', kind: 'item' as const, item: { id: 'x', kind: 'command_execution' as const, text: 'command', status: 'running' as const } };
  state = reduceStream(state, { type: 'event', event });
  state = reduceStream(state, { type: 'event', event: { ...event, sequence: 5, item: { ...event.item, status: 'failed', detail: 'exit 1' } } });
  expect(state.items).toHaveLength(1); expect(state.items[0].status).toBe('failed');
  state = reduceStream(state, { type: 'event', event: { ...event, sequence: 7 } });
  expect(state.phase).toBe('failed');
  expect(reduceStream(state, { type: 'synchronized', sequence: 7 }).phase).toBe('failed');
});
test('wire validation refuses malformed snapshots and tool output', () => {
  expect(readStreamMessage({ type: 'snapshot', snapshot: { epoch: 'x', sequence: 0, runs: 'sample', runId: null, items: [], at: 0 } })).toBeNull();
  expect(readStreamMessage({ type: 'event', event: { sequence: 1, at: 0, runId: 'x', kind: 'item', item: { id: 'x', kind: 'assistant_message', text: 'real', status: 'completed', parts: ['fake'] } } })).toBeNull();
});
test('markdown keeps fences, lists, tables and Unicode intact', () => {
  const text = '# Hello\n\n```ts\n' + '😀\n'.repeat(100) + '```\n\n- one\n- two\n\n| A | B |\n| - | - |\n| x | y |\n\nlast';
  const parts = markdownChunks(text, 40);
  expect(parts.join('')).toBe(text);
  expect(parts.some((part) => part.includes('```ts') && part.includes('```\n\n'))).toBe(true);
  expect(parts.some((part) => part.includes('- one\n- two'))).toBe(true);
  expect(parts.some((part) => part.includes('| A | B |\n| - | - |\n| x | y |'))).toBe(true);
});
test('tool grouping retains confirmed status and saved details', () => {
  const tool = { id: 'x', kind: 'file_change' as const, text: 'edit', status: 'failed' as const, detail: 'permission denied' };
  expect(turnGroups([tool, { ...tool, id: 'y' }])).toEqual([{ kind: 'tools', items: [tool, { ...tool, id: 'y' }] }]);
});
test('legacy job output stays exact for test result parsing; diagnostics remain expandable', () => {
  const item = { id: 'line', kind: 'legacy_output' as const, text: 'Tests: 2 passed, 2 total', status: 'unknown' as const };
  expect(turnLines([item])[0].text).toBe(item.text);
  const diagnostic = { ...item, kind: 'error' as const, text: 'Unparsed provider output', detail: 'full stderr' };
  expect(turnGroups([diagnostic])[0]).toEqual({ kind: 'tools', items: [diagnostic] });
  const rows = visibleToolRows([diagnostic, { ...diagnostic, id: 'second', detail: 'second stderr' }]);
  expect(rows).toHaveLength(1); expect(rows[0].id).toBe(diagnostic.id);
  expect(rows[0].detail).toBe('full stderr\n\nsecond stderr'); expect(rows[0].status).toBe('unknown');
});
