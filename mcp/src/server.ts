import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { localContext } from './localContext.ts';
import { createCellarServer } from './mcpServer.ts';

/**
 * Cellar over MCP on your own machine: stdio, signed in from the session file.
 *
 * Everything here is stdio, so nothing may ever be written to stdout except the
 * protocol — a stray `console.log` corrupts the stream and the client drops the
 * server with no useful error. Diagnostics go to stderr.
 *
 * The hosted twin is `supabase/functions/mcp`, which serves the same tools over
 * HTTP to an agent that is not on this machine.
 */

const server = createCellarServer(localContext);

await server.connect(new StdioServerTransport());
process.stderr.write('cellar mcp: ready\n');
