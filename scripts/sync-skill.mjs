/**
 * Copies the agent skill into `public/`, so the web build serves it.
 *
 * `mcp/skill/` is the source — it sits next to the server whose tools it
 * documents, and the two have to be changed together. `public/skill/` is the
 * install endpoint, and it is generated rather than committed for the usual
 * reason: two copies of a working agreement drift, and the one that drifts is
 * always the one nobody is reading.
 *
 * `commands.txt` is written here rather than kept by hand. It is the only thing
 * the installers know about the command set, so a new file in
 * `mcp/skill/commands/` reaches every machine on the next web deploy without
 * either installer changing.
 */

import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'mcp', 'skill');
const to = join(root, 'public', 'skill');

await rm(to, { recursive: true, force: true });
await mkdir(join(to, 'commands'), { recursive: true });

for (const name of ['SKILL.md', 'install.sh', 'install.ps1']) {
  await copyFile(join(from, name), join(to, name));
}

const commands = (await readdir(join(from, 'commands'))).filter((name) => name.endsWith('.md')).sort();
for (const name of commands) {
  await copyFile(join(from, 'commands', name), join(to, 'commands', name));
}

// Trailing newline on purpose: `read` in the shell installer drops a last line
// that has none, which would silently skip whichever command sorts last.
await writeFile(join(to, 'commands.txt'), `${commands.join('\n')}\n`);

console.log(`skill → public/skill (${commands.length} commands)`);
