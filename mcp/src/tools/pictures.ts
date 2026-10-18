import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveEntry } from '../cellar.ts';
import { guard, withCellar, type CtxProvider } from '../context.ts';
import { readPicture } from '../pictures.ts';

export function registerPictureTools(server: McpServer, getCtx: CtxProvider): void {
  server.registerTool('cellar_get_picture', {
    title: 'Read an attached picture',
    description: 'Return the actual image attached to an entry. Entry reads and claims include images automatically; use this for images deferred by the response size budget. Inspect attached images before acting on the thought.',
    inputSchema: {
      entry: z.string().describe('Entry id or short id.'),
      picture: z.string().uuid().describe('Full picture id from the entry brief.'),
    },
  }, ({ entry, picture }) => guard(async () => {
    const { ctx, cellar } = await withCellar(getCtx);
    return readPicture(ctx.client, resolveEntry(entry, cellar.entries).id, picture);
  }));
}
