import type { DeskLogLine } from '@/lib/deskProtocol';

/**
 * A run's own words, for a phone screen.
 *
 * Claude's transcript is a JSONL file of everything: attachments, hook output,
 * thinking, file snapshots, tool results the size of a file. The phone wants
 * the conversation — what was asked, what the agent said, which tools it
 * reached for — and nothing else.
 */

const LINE_MAX = 600;

function cut(text: string, max = LINE_MAX): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function toolSummary(name: string, input: Record<string, unknown> | undefined): string {
  const pick = input?.description ?? input?.command ?? input?.file_path ?? input?.pattern ?? input?.url ?? input?.prompt;
  const detail = typeof pick === 'string' ? ` — ${cut(pick.split(/\r?\n/)[0], 120)}` : '';
  return `${name}${detail}`;
}

/** A user turn that is really the harness talking: reminders, command echoes, interrupts. */
function isHarness(text: string): boolean {
  return /^\s*<(system-reminder|command-|local-command|task-notification)/.test(text) || /^\[Request interrupted/.test(text);
}

type Block = { type?: string; text?: string; name?: string; input?: Record<string, unknown> };

export function claudeTranscript(jsonl: string): DeskLogLine[] {
  const out: DeskLogLine[] = [];
  for (const raw of jsonl.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let row: { type?: string; isMeta?: boolean; message?: { content?: string | Block[] } };
    try {
      row = JSON.parse(raw);
    } catch {
      continue;
    }
    if (row.isMeta) continue;
    const content = row.message?.content;

    if (row.type === 'user') {
      if (typeof content === 'string') {
        if (!isHarness(content)) out.push({ who: 'you', text: cut(content) });
      } else {
        for (const block of content ?? []) {
          if (block.type === 'text' && block.text && !isHarness(block.text)) out.push({ who: 'you', text: cut(block.text) });
        }
      }
    } else if (row.type === 'assistant' && Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && block.text?.trim()) out.push({ who: 'agent', text: cut(block.text) });
        else if (block.type === 'tool_use' && block.name) out.push({ who: 'tool', text: toolSummary(block.name, block.input) });
      }
    }
  }
  return out;
}

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g;

/** A plain process log — codex, antigravity — as lines, colour codes and blank runs removed. */
export function plainLog(text: string): DeskLogLine[] {
  return text
    .replace(ANSI, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, '').trimEnd())
    .filter((line) => line.trim())
    .map((line) => ({ who: 'agent' as const, text: cut(line) }));
}

/** The last `count` lines — what a phone shows without scrolling a novel. */
export function tail<T>(lines: readonly T[], count = 200): T[] {
  return lines.slice(Math.max(0, lines.length - count));
}
