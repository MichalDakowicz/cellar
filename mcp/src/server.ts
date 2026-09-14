import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerReadTools } from './tools/read.ts';
import { registerWriteTools } from './tools/write.ts';

/**
 * Cellar over MCP: the thoughts you dumped about a repo, handed to whatever is
 * working in that repo.
 *
 * Everything here is stdio, so nothing may ever be written to stdout except the
 * protocol — a stray `console.log` corrupts the stream and the client drops the
 * server with no useful error. Diagnostics go to stderr.
 */

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
    ].join('\n'),
  },
);

registerReadTools(server);
registerWriteTools(server);

await server.connect(new StdioServerTransport());
process.stderr.write('cellar mcp: ready\n');
