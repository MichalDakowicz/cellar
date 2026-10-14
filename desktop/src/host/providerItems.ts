import type { TurnItem, TurnKind } from '@/lib/deskEvents';

type Row = Record<string, any>; // Provider envelopes are checked at the boundary, not trusted as a domain type.
type ReadItem = (id: string) => TurnItem | null;
const detail = (raw: unknown) => typeof raw === 'string' ? raw : raw == null ? '' : JSON.stringify(raw, null, 2);
const item = (id: string, kind: TurnKind, text: string, status: TurnItem['status'] = 'completed', extra?: unknown): TurnItem => ({ id, kind, text, status, ...(extra == null ? {} : { detail: detail(extra) }) });

export function codexItems(row: Row, prefix: string): TurnItem[] {
  if (row.type === 'cellar.rollback') return [item(`rollback:${row.id}`, 'checkpoint', detail(row.text))];
  if (row.type === 'cellar.message') return [item(`message:${row.id}`, 'user_message', detail(row.text))];
  if (row.type === 'turn.failed' || row.type === 'error') return [item(`${prefix}:error`, 'error', detail(row.error?.message ?? row.message ?? row.error), 'failed')];
  if (!['item.started', 'item.updated', 'item.completed'].includes(row.type) || !row.item || typeof row.item.id !== 'string') return [];
  const raw = row.item as Row;
  const status: TurnItem['status'] = ['failed', 'declined', 'interrupted'].includes(raw.status) || (typeof raw.exit_code === 'number' && raw.exit_code !== 0) ? 'failed' : row.type === 'item.completed' ? 'completed' : 'running';
  const id = `codex:${raw.id}`;
  switch (raw.type) {
    // The managed source already seeds the task prompt once with its durable ID.
    case 'user_message': return [];
    case 'agent_message': return [item(id, 'assistant_message', detail(raw.text), status)];
    case 'reasoning': return [item(id, 'reasoning', detail(raw.text), status)];
    case 'command_execution': return [item(id, 'command_execution', `command — ${detail(raw.command)}`, status, `${detail(raw.aggregated_output)}${raw.exit_code == null ? '' : `\nexit ${raw.exit_code}`}`)];
    case 'file_change': return [item(id, 'file_change', 'edit — files', status, raw.changes)];
    case 'mcp_tool_call': return [item(id, 'dynamic_tool', `${detail(raw.server)} / ${detail(raw.tool)}`, status, { arguments: raw.arguments, result: raw.result, error: raw.error })];
    case 'web_search': return [item(id, 'web_search', `search — ${detail(raw.query)}`, status)];
    case 'todo_list': return [item(id, 'todo_list', 'plan', status, raw.items)];
    case 'error': return [item(id, 'error', detail(raw.message), 'failed')];
    default: return [item(id, 'dynamic_tool', detail(raw.type), status, raw)];
  }
}

export function claudeItems(row: Row, prefix: string, state: Row, read: ReadItem): TurnItem[] {
  if (row.type === 'cellar.rollback') return [item(`rollback:${row.id}`, 'checkpoint', detail(row.text))];
  if (row.type === 'cellar.message') return [item(`message:${row.id}`, 'user_message', detail(row.text))];
  const out: TurnItem[] = [];
  if (row.type === 'result') {
    if (row.is_error || (Array.isArray(row.permission_denials) && row.permission_denials.length)) out.push(item(`${prefix}:result`, 'error', detail(row.result ?? row.errors ?? 'Agent reported permission denials.'), 'failed', row.permission_denials));
    return out;
  }
  if (row.type === 'stream_event') {
    const event = row.event as Row | undefined;
    if (!event) return out;
    if (event.type === 'message_start') state.message = event.message?.id ?? prefix;
    const id = `claude:${state.message ?? prefix}:${event.index ?? 0}`;
    const previous = read(id);
    if (event.type === 'content_block_start') {
      const block = event.content_block as Row;
      state[id] = block;
      if (block?.type === 'text' || block?.type === 'thinking') out.push(item(id, block.type === 'text' ? 'assistant_message' : 'reasoning', detail(block.text ?? block.thinking), 'running'));
      if (block?.type === 'tool_use') out.push(item(block.id, toolKind(block.name), `${block.name} — ${toolSubject(block.input)}`, 'running', block.input));
    }
    if (event.type === 'content_block_delta') {
      const delta = event.delta as Row;
      if (delta?.type === 'text_delta' || delta?.type === 'thinking_delta') out.push(item(id, delta.type === 'text_delta' ? 'assistant_message' : 'reasoning', (previous?.text ?? '') + detail(delta.text ?? delta.thinking), 'running'));
      if (delta?.type === 'input_json_delta') state[id] = { ...state[id], json: (state[id]?.json ?? '') + detail(delta.partial_json) };
    }
    if (event.type === 'content_block_stop') {
      const block = state[id] as Row | undefined;
      if (block?.type === 'tool_use') {
        let input = block.input;
        try { if (block.json) input = JSON.parse(block.json); } catch { /* Incomplete provider input remains marked running. */ }
        out.push(item(block.id, toolKind(block.name), `${block.name} — ${toolSubject(input)}`, 'running', input));
      } else if (previous) out.push({ ...previous, status: 'completed' });
      delete state[id];
    }
    return out;
  }
  if (!['user', 'assistant'].includes(row.type) || row.isMeta) return out;
  const message = row.message as Row | undefined;
  const content = message?.content;
  const messageId = message?.id ?? row.uuid ?? prefix;
  if (typeof content === 'string' && !/^\s*<(system-reminder|command-|local-command|task-notification)/.test(content)) return [item(`claude:${messageId}:0`, row.type === 'user' ? 'user_message' : 'assistant_message', content)];
  for (const [index, block] of (Array.isArray(content) ? content : []).entries()) {
    const id = `claude:${messageId}:${index}`;
    if (block.type === 'text' && typeof block.text === 'string') out.push(item(id, row.type === 'user' ? 'user_message' : 'assistant_message', block.text));
    if (block.type === 'thinking') out.push(item(id, 'reasoning', detail(block.thinking)));
    if (block.type === 'tool_use') out.push(item(block.id ?? id, toolKind(block.name), `${block.name} — ${toolSubject(block.input)}`, 'running', block.input));
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
      const tool = read(block.tool_use_id);
      out.push(tool ? { ...tool, status: block.is_error ? 'failed' : 'completed', detail: `${tool.detail ?? ''}\n${detail(block.content)}` }
        : item(block.tool_use_id, 'dynamic_tool', 'tool result', block.is_error ? 'failed' : 'completed', block.content));
    }
  }
  return out;
}
function toolKind(name: unknown): TurnKind {
  if (typeof name !== 'string') return 'dynamic_tool';
  if (/^(Bash|Shell|Command)$/i.test(name)) return 'command_execution';
  if (/^(Edit|Write|MultiEdit|ApplyPatch)$/i.test(name)) return 'file_change';
  if (/^(Read|Glob|Grep|LS)$/i.test(name)) return 'file_search';
  if (/^(WebSearch|WebFetch)$/i.test(name)) return 'web_search';
  return 'dynamic_tool';
}
function toolSubject(input: Row | undefined): string { return detail(input?.command ?? input?.file_path ?? input?.pattern ?? input?.url ?? input?.description ?? ''); }
