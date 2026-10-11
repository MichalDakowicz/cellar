import type { ApprovalDecision } from '@/lib/deskApprovals';
import type { RpcRow } from './codexRpc.ts';

export function codexPermissionRequest(row: RpcRow, cwd: string) {
  if (!['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'item/permissions/requestApproval'].includes(row.method ?? '')) return null;
  const params = row.params ?? {};
  if (!params.threadId || !params.turnId || !params.itemId) throw new Error('Invalid Codex approval identity.');
  if (row.method === 'item/commandExecution/requestApproval') {
    const network = params.networkApprovalContext;
    // The installed v2 protocol supports acceptForSession. A provider list, when present, narrows it.
    const always = !params.availableDecisions || params.availableDecisions.includes('acceptForSession');
    return { what: network ? 'access network' : 'run a command',
      subject: network ? JSON.stringify(network, null, 2) : params.command ?? '(command not supplied by Codex)',
      effect: `${params.cwd ?? cwd}${params.reason ? ` · ${params.reason}` : ''}`,
      always: always ? 'Allow matching approval for this Codex session (this run)' : null,
      response: (choice: ApprovalDecision) => ({ decision: choice === 'deny' ? 'decline' : choice === 'always' ? 'acceptForSession' : 'accept' }) };
  }
  if (row.method === 'item/fileChange/requestApproval') return {
    what: 'edit files', subject: params.grantRoot ?? params.itemId,
    effect: `${cwd}${params.reason ? ` · ${params.reason}` : ''}`, always: null,
    response: (choice: ApprovalDecision) => ({ decision: choice === 'deny' ? 'decline' : 'accept' }) };
  if (row.method === 'item/permissions/requestApproval') {
    if (!params.permissions || typeof params.permissions !== 'object' || Array.isArray(params.permissions)) throw new Error('Invalid Codex permission profile.');
    return {
    what: 'grant requested access', subject: JSON.stringify(params.permissions, null, 2),
    effect: `${params.cwd ?? cwd} · allow applies to this turn${params.reason ? ` · ${params.reason}` : ''}`,
    always: 'Grant these exact permissions for this Codex session (this run)',
    response: (choice: ApprovalDecision) => ({ permissions: choice === 'deny' ? {} : params.permissions, scope: choice === 'always' ? 'session' : 'turn' }) };
  }
  return null;
}

/** Translate the app-server v2 item vocabulary into the existing W6 log ingestor. */
export function codexLogItem(raw: any): any {
  const type = ({ userMessage: 'user_message', agentMessage: 'agent_message', commandExecution: 'command_execution', fileChange: 'file_change',
    mcpToolCall: 'mcp_tool_call', webSearch: 'web_search', plan: 'todo_list' } as Record<string, string>)[raw.type] ?? raw.type;
  return { ...raw, type, aggregated_output: raw.aggregatedOutput, exit_code: raw.exitCode,
    text: raw.text ?? (raw.type === 'reasoning' ? [...(raw.summary ?? []), ...(raw.content ?? [])].join('\n') : undefined) };
}
