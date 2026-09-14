import type { Entry } from '@/types/cellar';

/**
 * The line you paste into an agent to start a thought.
 *
 * The whole point of the copy button is that starting work is one tap and one
 * paste, with nothing typed and nothing looked up. So the string has to carry
 * everything the other end needs to find the entry and nothing it does not: the
 * id it will resolve, the project it belongs to, and the thought itself so the
 * paste is readable in the transcript afterwards.
 *
 * It is phrased the way the `cellar` skill is triggered — "pick up" — so a
 * session with the skill loaded acts on it directly rather than asking what to
 * do with it.
 *
 * Pure, and it owns `SHORT_ID`, because the MCP server prints ids at the same
 * width and resolves them by prefix. If the two ever disagreed, every copied
 * line would be a few characters the server could not match.
 */

/**
 * Eight characters is enough to be unique across a cellar of a few thousand and
 * short enough to read. The server accepts any unambiguous prefix, so this is a
 * display choice rather than a protocol one — but it has to be the same choice
 * on both sides.
 */
export const SHORT_ID = 8;

export function shortEntryId(id: string): string {
  return id.slice(0, SHORT_ID);
}

export function agentPrompt(entry: Pick<Entry, 'id' | 'text'>, projectName?: string | null): string {
  // The project is named even though the agent resolves it from the working
  // directory, because the likeliest mistake is pasting into a session opened
  // on the wrong repo — and an agent told the project can say so instead of
  // working in the wrong one.
  const where = projectName ? ` in ${projectName}` : '';
  return `pick up cellar entry ${shortEntryId(entry.id)}${where} — ${entry.text}`;
}
