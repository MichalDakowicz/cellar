import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertControllerSource(raw) {
  const source = raw.replaceAll('\\', '/');
  if (/desktop\/src\//.test(source) || /(?:^|\/)node_modules\/(?:electron|@anthropic-ai)\//.test(source) ||
      /src\/(?:features\/desk\/(?:bridge|DeskSessionSync)|components\/desk\/(?:DeskPairPanel|SamplePhoneMirror|later\/(?:PhoneBody|PhoneTools))|app\/desk\/phone)\./.test(source)) {
    throw new Error(`Controller crossed local-host boundary: ${source}`);
  }
}

export async function inspectController(root) {
  let maps = 0;
  const sources = new Set();
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await inspect(path);
      else if (entry.name.endsWith('.map')) {
        const map = JSON.parse(await readFile(path, 'utf8'));
        if (!Array.isArray(map.sources)) continue;
        maps++;
        for (const source of map.sources) { assertControllerSource(source); sources.add(source); }
      } else if (/\.(?:js|html|json)$/.test(entry.name)) {
        const content = await readFile(path, 'utf8');
        if (/(?:window\.cellarDesk|ipcRenderer\.invoke|cellar-desk:\/\/app)/.test(content)) throw new Error(`Local IPC found in controller artifact: ${path}`);
      }
    }
  }
  await inspect(root);
  if (!maps || !sources.size) throw new Error('Controller inspection requires source maps, not only filenames.');
  return { maps, modules: sources.size, localHostImports: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await inspectController(resolve(process.argv[2] ?? 'dist')), null, 2));
}
