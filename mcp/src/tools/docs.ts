import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveEntry } from '../cellar.ts';
import { guard, text, withAnswered, withCellar, type CtxProvider } from '../context.ts';
import { attachDoc } from '../docs.ts';
import { shortId } from '../format.ts';

export function registerDocTools(server: McpServer, getCtx: CtxProvider): void {
  server.registerTool('cellar_add_doc', {
    title: 'Attach a document to an entry',
    description: 'Attach a document link or repo-relative file path to a thought, with an optional label. Use this for references the next agent should read first. Does not upload or create a file; repeated references return the existing attachment.',
    inputSchema: {
      entry: z.string().describe('Entry id or short id.'),
      ref: z.string().min(1).max(4000).describe('Document URL or repo-relative path; preserve its case.'),
      label: z.string().max(160).optional().describe('Optional display label.'),
    },
  }, ({ entry, ref, label }) => guard(async () => {
    const { ctx, cellar } = await withCellar(getCtx);
    const target = resolveEntry(entry, cellar.entries);
    const { doc, added } = await attachDoc(ctx.client, ctx.userId, target, { ref, label });
    return text(withAnswered(`${added ? 'Attached to' : 'Already attached to'} ${shortId(target.id)}: ${doc.ref}${doc.label ? ` (${doc.label})` : ''}`, cellar, ctx.agent, target.id));
  }));
}
