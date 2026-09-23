import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { CtxProvider } from './context.ts';
import { registerReadTools } from './tools/read.ts';
import { registerSettleTools } from './tools/settle.ts';
import { registerStructureTools } from './tools/structure.ts';
import { registerWriteTools } from './tools/write.ts';

/**
 * The server itself — the tools and what the client is told they are for.
 *
 * It is built here rather than in an entry point because there are two entry
 * points: `server.ts` speaks stdio on your machine, and the `mcp` edge function
 * speaks HTTP. Both get the same tools and the same instructions; the only
 * difference between them is where the context comes from, and that arrives as
 * an argument.
 */

export function createCellarServer(getCtx: CtxProvider): McpServer {
  const server = new McpServer(
    { name: 'cellar', version: '0.1.0' },
    {
      instructions: [
        'Cellar is a mind dump: one-line thoughts about things the user is building, filed under projects.',
        '',
        'Call cellar_orient first, passing the directory you are working in — it resolves which project this repo is',
        'and lists what is open. Claim a thought with cellar_claim_entry before doing anything about it, report back',
        'with cellar_append_line, and settle it with cellar_finish_entry.',
        '',
        'The rule that matters most: a dumped thought is one line, and the reasoning behind it was never written',
        'down. When two readings of it would lead to different work — and for every idea and every removal — use',
        'cellar_ask rather than guessing. A blocked entry with a good question is a better outcome than a confident',
        'wrong build.',
        '',
        'Write like the user does: lowercase, one line, no full stop, no markdown. These lines sit in a list next to',
        'their own thoughts, and an assistant voice in that list makes it unreadable.',
        '',
        'The shelves and projects holding the thoughts are yours to read and to tidy — cellar_list_shelves,',
        'cellar_create_project and the rest. Nothing deletes anywhere on this server, and the settings row is not',
        'writable: how their own app opens is theirs. The one thing read from it is whether you may test on their',
        'phone — cellar_orient prints it as the phone line, and that line is the answer; do not ask it again.',
      ].join('\n'),
    },
  );

  registerReadTools(server, getCtx);
  registerWriteTools(server, getCtx);
  registerSettleTools(server, getCtx);
  registerStructureTools(server, getCtx);

  return server;
}
