import assert from 'node:assert/strict';
import { test } from 'node:test';

import { claudeTranscript, plainLog, tail } from './transcript.ts';

const rows = [
  { type: 'permission-mode', permissionMode: 'auto' },
  { type: 'user', message: { content: 'pick up cellar entry 0afbf3fe' } },
  { type: 'user', isMeta: true, message: { content: 'meta' } },
  { type: 'user', message: { content: [{ type: 'text', text: '<system-reminder>x</system-reminder>' }] } },
  {
    type: 'assistant',
    message: {
      content: [
        { type: 'thinking', thinking: 'hidden' },
        { type: 'text', text: 'Claimed it.' },
        { type: 'tool_use', name: 'Bash', input: { command: 'git status\nmore', description: 'Show status' } },
      ],
    },
  },
  { type: 'user', message: { content: [{ type: 'tool_result', content: 'huge' }] } },
  'not json',
];

test('keeps the conversation and drops the machinery', () => {
  const jsonl = rows.map((row) => (typeof row === 'string' ? row : JSON.stringify(row))).join('\n');
  assert.deepEqual(claudeTranscript(jsonl), [
    { who: 'you', text: 'pick up cellar entry 0afbf3fe' },
    { who: 'agent', text: 'Claimed it.' },
    { who: 'tool', text: 'Bash — Show status' },
  ]);
});

test('strips colour codes and blank lines from a plain log', () => {
  assert.deepEqual(plainLog('\u001b[32mok\u001b[0m\r\n\n  \nnext'), [
    { who: 'agent', text: 'ok' },
    { who: 'agent', text: 'next' },
  ]);
});

test('tail keeps the last lines', () => {
  assert.deepEqual(tail([1, 2, 3, 4], 2), [3, 4]);
  assert.deepEqual(tail([1], 5), [1]);
});
