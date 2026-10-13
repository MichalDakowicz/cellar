import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';

/** Open input keeps one Claude conversation alive; one message is submitted per turn. */
export class ClaudeInput implements AsyncIterable<SDKUserMessage> {
  private rows: SDKUserMessage[] = [];
  private wake: (() => void) | null = null;
  private closed = false;
  push(text: string, id: string) {
    if (this.closed) throw new Error('Claude input is closed.');
    this.rows.push({ type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null, session_id: '', uuid: id as SDKUserMessage['uuid'] });
    this.wake?.();
  }
  close() { this.closed = true; this.wake?.(); }
  async *[Symbol.asyncIterator]() {
    while (!this.closed) {
      const row = this.rows.shift();
      if (row) yield row;
      else await new Promise<void>((resolve) => { this.wake = resolve; });
    }
  }
}
