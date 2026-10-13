import type { TurnItem } from './deskEvents';
export type TurnGroup = { kind: 'text'; item: TurnItem } | { kind: 'tools'; items: TurnItem[] };
const tools = new Set(['command_execution', 'file_change', 'dynamic_tool', 'web_search', 'file_search', 'todo_list', 'subagent']);
export function turnGroups(items: readonly TurnItem[]): TurnGroup[] {
  const groups: TurnGroup[] = [];
  for (const item of items) {
    const previous = groups.at(-1);
    if (!tools.has(item.kind) && !(item.kind === 'error' && item.detail)) groups.push({ kind: 'text', item });
    else if (previous?.kind === 'tools') previous.items.push(item);
    else groups.push({ kind: 'tools', items: [item] });
  }
  return groups;
}
/** Repeated CLI stderr stays readable without losing any raw diagnostic text. */
export function visibleToolRows(items: readonly TurnItem[]): TurnItem[] {
  const rows: TurnItem[] = [];
  let diagnostics = 0;
  for (const item of items) {
    const previous = rows.at(-1);
    if (item.kind === 'error' && item.text === 'Unparsed provider output' && item.detail) {
      diagnostics++;
      if (diagnostics > 1 && previous) rows[rows.length - 1] = { ...previous, text: `${diagnostics} provider diagnostics`, detail: `${previous.detail}\n\n${item.detail}` };
      else rows.push({ ...item, text: 'Provider diagnostic' });
    } else { diagnostics = 0; rows.push(item); }
  }
  return rows;
}
