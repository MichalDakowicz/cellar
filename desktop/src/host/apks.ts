import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { basename, join } from 'node:path';

import type { DeskApk } from '@/lib/deskProtocol';

/**
 * The newest release build of every app in the workspace, for the phone to
 * install without a cable.
 *
 * It only offers what is already built — `<app>/android/app/build/outputs/apk/
 * release/*.apk`, the folder every Ping app's release build lands in. Building
 * on demand is the later half of that decision on the entry. Debug builds are
 * left out on purpose: they need Metro running to open at all.
 */

const RELEASE = ['android', 'app', 'build', 'outputs', 'apk', 'release'];

/** `cellar-v1.12.0.apk` → `1.12.0`; `app-release.apk` → null. */
export function apkVersion(file: string): string | null {
  return /v(\d+\.\d+\.\d+)/.exec(file)?.[1] ?? null;
}

/** Newest first, one per app. */
export function newestPerApp(found: DeskApk[]): DeskApk[] {
  const best = new Map<string, DeskApk>();
  for (const apk of found) {
    const current = best.get(apk.app);
    if (!current || apk.builtAt > current.builtAt) best.set(apk.app, apk);
  }
  return [...best.values()].sort((a, b) => b.builtAt - a.builtAt);
}

export async function findApks(workspace: string): Promise<DeskApk[]> {
  let apps: string[];
  try {
    apps = (await readdir(workspace, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  const found: DeskApk[] = [];
  await Promise.all(
    apps.map(async (app) => {
      const dir = join(workspace, app, ...RELEASE);
      let files: string[];
      try {
        files = (await readdir(dir)).filter((file) => file.toLowerCase().endsWith('.apk'));
      } catch {
        return;
      }
      for (const file of files) {
        const info = await stat(join(dir, file));
        found.push({ app, file, version: apkVersion(file), size: info.size, builtAt: info.mtimeMs });
      }
    }),
  );
  return newestPerApp(found);
}

export function apkPath(workspace: string, apk: Pick<DeskApk, 'app' | 'file'>): string {
  return join(workspace, basename(apk.app), ...RELEASE, basename(apk.file));
}

/** The file, as something the phone's browser downloads and hands to the installer. */
export function sendApk(res: ServerResponse, path: string, apk: Pick<DeskApk, 'file' | 'size'>): void {
  res.writeHead(200, {
    'content-type': 'application/vnd.android.package-archive',
    'content-length': String(apk.size),
    'content-disposition': `attachment; filename="${apk.file.replace(/"/g, '')}"`,
    'cache-control': 'no-store',
  });
  createReadStream(path).pipe(res);
}
