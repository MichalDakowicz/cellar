/**
 * Writes the cellar's MCP entry into the agent's own config.
 *
 * Run by both installers rather than duplicated in each: there is one correct
 * shape for this entry, and a PowerShell copy and a sh copy of it would drift
 * the first time the header set changed. It is node because Claude Code is
 * node — a machine installing a Claude Code skill has it — and because neither
 * shell can merge JSON safely on its own. `jq` is not everywhere, and
 * PowerShell 5.1's ConvertFrom-Json has no -AsHashtable, so the "portable"
 * version of this in shell is two implementations with different bugs.
 *
 * `.mjs`, and downloaded under that name, because the installers drop it in a
 * temp directory and node decides CommonJS or ESM from the nearest
 * package.json — which is whatever happens to be above the temp dir on that
 * machine. The extension is the only way to be sure which one this is.
 *
 * Merges, never replaces: ~/.claude.json holds far more than MCP servers, and
 * a setup command that quietly emptied it would be the worst possible way to
 * find that out. The old file is kept beside the new one, and the write goes
 * through a temp file so an interrupted run cannot leave half a config.
 *
 *   CELLAR_MCP_URL, CELLAR_TOKEN, and optionally CELLAR_AGENT and CELLAR_CONFIG.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.env.CELLAR_MCP_URL;
const token = process.env.CELLAR_TOKEN;
if (!url || !token) {
  console.error('mcp      skipped — no token or url given');
  process.exit(0);
}

const file = process.env.CELLAR_CONFIG || path.join(os.homedir(), '.claude.json');

let config = {};
if (fs.existsSync(file)) {
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.trim()) {
    try {
      config = JSON.parse(raw);
    } catch {
      // Refusing beats guessing: rewriting a config we could not read would
      // throw away whatever is in it, and the user can fix one bad file.
      console.error(`mcp      ${file} is not valid json — left it alone`);
      process.exit(1);
    }
  }
  fs.writeFileSync(`${file}.cellar-backup`, raw);
}

if (typeof config !== 'object' || config === null || Array.isArray(config)) {
  console.error(`mcp      ${file} is not a json object — left it alone`);
  process.exit(1);
}

config.mcpServers = config.mcpServers ?? {};
config.mcpServers.cellar = {
  type: 'http',
  url,
  headers: {
    Authorization: `Bearer ${token}`,
    // Spelled out rather than left to the default: two agents on one cellar and
    // a list that says "claude" twice cannot tell you who has what.
    'x-cellar-agent': process.env.CELLAR_AGENT || 'claude',
  },
};

const temp = `${file}.cellar-tmp`;
fs.writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`);
fs.renameSync(temp, file);
console.log(`mcp      ${file}`);
