import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, relative, sep } from 'node:path';
import type { DeskAgent } from '@/lib/deskProtocol';
import { checkedKeyPath, insideKeyRoot } from './keyFiles.ts';

type Skill = { name: string; detail: string; description?: string };
// CLI built-ins are references, not new provider RPCs. Discovery never executes a skill.
const BUILT_INS: Record<DeskAgent, string[]> = { codex: ['review', 'init', 'compact'], claude: ['review', 'init', 'compact'], agy: [] };
export function agentSkillRoots(agent: DeskAgent, project: string, home = homedir(), env = process.env) {
  const codex = env.CODEX_HOME || join(home, '.codex');
  const claude = env.CLAUDE_CONFIG_DIR || join(home, '.claude');
  if (agent === 'codex') return [join(codex, 'skills'), join(home, '.agents', 'skills'), join(project, '.agents', 'skills'), join(project, '.codex', 'skills')];
  if (agent === 'claude') return [join(claude, 'skills'), join(claude, 'commands'), join(project, '.claude', 'skills'), join(project, '.claude', 'commands')];
  return [];
}

/** Read names/short descriptions only. No credential/config contents reach clients. */
export async function keySkills(agent: DeskAgent, project: string, roots = agentSkillRoots(agent, project)) {
  const skills = new Map<string, Skill>(BUILT_INS[agent].map((name) => [name, { name, detail: `${agent} · built in` }]));
  const notices: string[] = [];
  let readable = 0;
  if (!roots.length) notices.push('This agent exposes no supported skill discovery source.');
  for (const root of [...new Set(roots)]) {
    try {
      // Check every project-relative parent, not only the final skills directory.
      // A run must not redirect .agents/.claude to an unrelated user's folder.
      if (insideKeyRoot(project, root) && !(await checkedKeyPath(project, relative(project, root).split(sep).join('/')))) {
        notices.push('Missing or redirected project skill folder excluded.'); continue;
      }
      if ((await lstat(root)).isSymbolicLink()) { notices.push('Redirected skill folder excluded.'); continue; }
      const base = await realpath(root);
      readable++;
      let visited = 0;
      const walk = async (dir: string, prefix: string, depth: number): Promise<void> => {
        if (depth > 5) { notices.push('Skill scan depth limit reached.'); return; }
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          if (++visited > 2000) throw new Error('Skill scan limit reached.');
          if (entry.isSymbolicLink() || (entry.name.startsWith('.') && entry.name !== '.system')) continue;
          const path = join(dir, entry.name);
          const actual = await realpath(path);
          if (!insideKeyRoot(base, actual)) continue;
          if (entry.isDirectory()) await walk(path, `${prefix}${entry.name}/`, depth + 1);
          else if (entry.isFile() && (entry.name === 'SKILL.md' || (root.endsWith('commands') && entry.name.endsWith('.md')))) {
            if ((await lstat(path)).size > 128 * 1024) { notices.push('Oversized skill metadata excluded.'); continue; }
            const raw = await readFile(actual, 'utf8');
            const fallback = entry.name === 'SKILL.md' ? prefix.split('/').filter(Boolean).at(-1)! : `${prefix}${entry.name.slice(0, -3)}`.replace(/\//g, ':');
            const header = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
            const name = /^name:\s*["']?([\w:.-]+)["']?\s*$/m.exec(header)?.[1] ?? fallback;
            if (!/^[\w][\w:.-]{0,100}$/.test(name)) continue;
            const description = /^description:\s*["']?([^\r\n>|]+)/m.exec(header)?.[1]?.replace(/["']$/, '').trim();
            skills.set(name, { name, detail: `${agent} · ${prefix.startsWith('.system/') ? 'built in' : 'yours'}`, description: description?.slice(0, 100) });
          }
        }
      };
      await walk(base, '', 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') notices.push('Some skill folders could not be read.');
    }
  }
  if (roots.length && !readable) notices.push('User skill folders missing; showing available built-ins only.');
  return { skills: [...skills.values()], notice: [...new Set(notices)].join(' ') || null };
}
