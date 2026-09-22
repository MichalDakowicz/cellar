import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { checkName, nameErrorText } from '@/lib/containers';
import { normalizeRepoPath, normalizeRepoUrl } from '@/lib/repoLink';
import type { Project, Shelf } from '@/types/cellar';

import { resolveProject, type Cellar } from '../cellar.ts';
import { guard, text, withCellar, type CtxProvider } from '../context.ts';
import { projectRow, shortId } from '../format.ts';
import {
  createProject,
  createShelf,
  moveProject,
  renameProject,
  renameShelf,
  resolveShelf,
} from '../structure.ts';

/**
 * The shelves and the projects, as things an agent can see and change.
 *
 * Until these existed the server could read and write every *thought* the user
 * had and nothing about the structure holding them — so an agent could file a
 * thought under a project but could not make the project, and could see that a
 * repo had no project without being able to give it one. `cellar_link_repo`
 * was the one exception, and it only ever worked on a project that already
 * existed.
 *
 * Two things stay out on purpose. **Nothing deletes**: a shelf takes its
 * projects with it and a project sends its thoughts to the inbox, which is the
 * largest destructive act in the app and belongs to the user, in the app, with
 * the cost in front of them. And **settings are not here** — how the user's own
 * app opens, what a draft starts as, whether a banner is raised, are theirs,
 * and an agent quietly changing them is the app misbehaving rather than an
 * agent helping.
 *
 * Names go through the app's own `checkName`, so a name the agent is allowed to
 * write is exactly a name the user could have typed.
 */

function shelfRow(shelf: Shelf, cellar: Cellar): string {
  const projects = cellar.projects.filter((project) => project.shelfId === shelf.id);
  const ids = new Set(projects.map((project) => project.id));
  const entries = cellar.entries.filter((entry) => entry.projectId && ids.has(entry.projectId) && !entry.archived);
  const names = projects.map((project) => project.name).join(', ') || '(empty)';
  return `${shortId(shelf.id)} ${shelf.name} — ${projects.length} projects, ${entries.length} entries: ${names}`;
}

/** The app's own naming rule, as a throw. */
function requireName(name: string, siblings: string[], noun: 'shelf' | 'project'): string {
  const trimmed = name.trim();
  const error = checkName(trimmed, siblings);
  if (error) throw new Error(nameErrorText(error, noun) ?? `That ${noun} name cannot be used.`);
  return trimmed;
}

function projectsOn(cellar: Cellar, shelfId: string): Project[] {
  return cellar.projects.filter((project) => project.shelfId === shelfId);
}

export function registerStructureTools(server: McpServer, getCtx: CtxProvider): void {
  server.registerTool(
    'cellar_list_shelves',
    {
      title: 'Every shelf',
      description:
        'The layer above projects — "apps", "minecraft mods" — with what is on each one. A shelf is why this app ' +
        'is not one flat list, so it is the thing to read before creating a project: the shelf a project lands on ' +
        'decides which list it shows up in.',
      inputSchema: {},
    },
    async () =>
      guard(async () => {
        const { cellar } = await withCellar(getCtx);
        if (cellar.shelves.length === 0) return text('No shelves yet.');
        return text(cellar.shelves.map((shelf) => shelfRow(shelf, cellar)).join('\n'));
      }),
  );

  server.registerTool(
    'cellar_create_shelf',
    {
      title: 'A new shelf',
      description:
        'A new layer above projects, for a kind of work that must not read as the same list as the rest. Two kinds ' +
        'of work in one flat list is the exact thing this app was built to stop, so a shelf is worth making when ' +
        'the work genuinely is a different kind — not per project.',
      inputSchema: {
        name: z.string().describe('What this kind of work is called, e.g. "apps".'),
      },
    },
    async ({ name }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const clean = requireName(name, cellar.shelves.map((shelf) => shelf.name), 'shelf');
        const made = await createShelf(ctx.client, ctx.userId, clean, cellar.shelves.length);
        return text(`${shortId(made.id)} ${made.name} — new shelf, nothing on it yet`);
      }),
  );

  server.registerTool(
    'cellar_rename_shelf',
    {
      title: 'Rename a shelf',
      description:
        'Change what a shelf is called. Nothing on it moves. There is deliberately no way to delete a shelf from ' +
        'here — it would take its projects with it and send their thoughts to the inbox.',
      inputSchema: {
        shelf: z.string().describe('Shelf name or id.'),
        name: z.string().describe('The new name.'),
      },
    },
    async ({ shelf, name }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveShelf(shelf, cellar.shelves);
        const siblings = cellar.shelves.filter((other) => other.id !== target.id).map((other) => other.name);
        const clean = requireName(name, siblings, 'shelf');
        const done = await renameShelf(ctx.client, target.id, clean);
        return text(`${shortId(done.id)} ${target.name} → ${done.name}`);
      }),
  );

  server.registerTool(
    'cellar_create_project',
    {
      title: 'A new project',
      description:
        'A project on a shelf, optionally pointed at a checkout as it lands. Use it when work has started on ' +
        'something the cellar has no project for — thoughts about it are otherwise dumped into the inbox and stay ' +
        'there. Passing repo_path is what lets every future session in that directory resolve this project ' +
        'without being told.',
      inputSchema: {
        shelf: z.string().describe('Shelf name or id — cellar_list_shelves shows them.'),
        name: z.string().describe('Working name. Name it now, describe it never.'),
        repo_path: z.string().optional().describe('Absolute path of the checkout, e.g. C:\\ping\\cellar.'),
        repo_url: z.string().optional().describe('Remote, e.g. github.com/you/cellar.'),
      },
    },
    async ({ shelf, name, repo_path, repo_url }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveShelf(shelf, cellar.shelves);
        const siblings = projectsOn(cellar, target.id);
        const clean = requireName(name, siblings.map((project) => project.name), 'project');
        const made = await createProject(ctx.client, ctx.userId, {
          shelfId: target.id,
          name: clean,
          position: siblings.length,
          repoPath: normalizeRepoPath(repo_path) ?? null,
          repoUrl: normalizeRepoUrl(repo_url) ?? null,
        });
        return text(`${projectRow(made, cellar.entries)}\non ${target.name}`);
      }),
  );

  server.registerTool(
    'cellar_rename_project',
    {
      title: 'Rename a project',
      description:
        'Change what a project is called. Nothing in it moves, and its repo link is untouched. There is ' +
        'deliberately no way to delete a project from here — its thoughts would fall back to the inbox.',
      inputSchema: {
        project: z.string().describe('Project name or id.'),
        name: z.string().describe('The new name.'),
      },
    },
    async ({ project, name }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveProject(project, cellar.projects);
        const siblings = projectsOn(cellar, target.shelfId)
          .filter((other) => other.id !== target.id)
          .map((other) => other.name);
        const clean = requireName(name, siblings, 'project');
        const done = await renameProject(ctx.client, target.id, clean);
        return text(`${shortId(done.id)} ${target.name} → ${done.name}`);
      }),
  );

  server.registerTool(
    'cellar_move_project',
    {
      title: 'Move a project to another shelf',
      description:
        'Put a project on a different shelf. Everything in it goes with it — a thought belongs to its project, ' +
        'not to the shelf. It lands at the end of the new shelf rather than keeping its old index, which would ' +
        'drop it into the middle of a list for no visible reason.',
      inputSchema: {
        project: z.string().describe('Project name or id.'),
        shelf: z.string().describe('The shelf to move it to — name or id.'),
      },
    },
    async ({ project, shelf }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveProject(project, cellar.projects);
        const destination = resolveShelf(shelf, cellar.shelves);
        if (destination.id === target.shelfId) return text(`${target.name} is already on ${destination.name}.`);

        const clash = projectsOn(cellar, destination.id).some(
          (other) => other.name.toLowerCase() === target.name.toLowerCase(),
        );
        if (clash) throw new Error(`${destination.name} already has a project called "${target.name}".`);

        const done = await moveProject(
          ctx.client,
          target.id,
          destination.id,
          projectsOn(cellar, destination.id).length,
        );
        const from = cellar.shelves.find((candidate) => candidate.id === target.shelfId)?.name ?? '?';
        return text(`${shortId(done.id)} ${done.name}: ${from} → ${destination.name}`);
      }),
  );
}
