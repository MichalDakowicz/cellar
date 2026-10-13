// Bundles the main process and the preload into build/. One file each, because
// the main process imports Cellar's own pure lib (`@/lib/*`, the pairing format
// and the run protocol) from outside this package. esbuild resolves that alias
// from the tsconfig nearest each file — this package's for its own sources,
// the app's for the lib — exactly as tsc does.
//
// The Supabase URL and anon key are baked in from the app's own .env — the
// public pair, the same values the web build bakes in — so a packaged install
// has no .env to look for.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function dotenv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, '')]),
    );
  } catch {
    return {};
  }
}

const env = dotenv(join(here, '..', '.env'));
const url = process.env.CELLAR_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.CELLAR_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
if (!url || !anonKey) console.warn('no supabase url/anon key in ../.env — the cellar fallback will stay off');

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  logLevel: 'warning',
  sourcemap: 'linked',
};

await build({
  ...shared,
  entryPoints: [join(here, 'src', 'main.ts')],
  outfile: join(here, 'build', 'main.js'),
  define: {
    'process.env.CELLAR_SUPABASE_URL': JSON.stringify(url),
    'process.env.CELLAR_SUPABASE_ANON_KEY': JSON.stringify(anonKey),
  },
});

await build({
  ...shared,
  entryPoints: [join(here, 'src', 'preload.ts')],
  outfile: join(here, 'build', 'preload.js'),
});

console.log('built desktop/build/main.js and preload.js');
