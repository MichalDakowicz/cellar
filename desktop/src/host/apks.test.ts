import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { apkPath, apkVersion, findApks } from './apks.ts';

test('reads the version out of a ping release file name', () => {
  assert.equal(apkVersion('cellar-v1.12.0.apk'), '1.12.0');
  assert.equal(apkVersion('app-release.apk'), null);
});

test('finds the newest release build per app and ignores everything else', async () => {
  const root = mkdtempSync(join(tmpdir(), 'desk-apks-'));
  const release = (app: string) => {
    const dir = join(root, app, 'android', 'app', 'build', 'outputs', 'apk', 'release');
    mkdirSync(dir, { recursive: true });
    return dir;
  };
  const cellar = release('cellar');
  writeFileSync(join(cellar, 'cellar-v1.11.0.apk'), 'old');
  writeFileSync(join(cellar, 'cellar-v1.12.0.apk'), 'newer');
  utimesSync(join(cellar, 'cellar-v1.11.0.apk'), 1000, 1000);
  utimesSync(join(cellar, 'cellar-v1.12.0.apk'), 2000, 2000);
  writeFileSync(join(cellar, 'output-metadata.json'), '{}');
  writeFileSync(join(release('radar'), 'radar-v2.16.0.apk'), 'r');
  mkdirSync(join(root, 'notes'));

  const apks = await findApks(root);
  assert.deepEqual(
    apks.map((apk) => [apk.app, apk.file, apk.version]).sort(),
    [
      ['cellar', 'cellar-v1.12.0.apk', '1.12.0'],
      ['radar', 'radar-v2.16.0.apk', '2.16.0'],
    ],
  );
  assert.equal(apks.find((apk) => apk.app === 'cellar')?.size, 5);
});

test('a path built from a request cannot climb out of the release folder', () => {
  const path = apkPath('C:\\ping', { app: '..\\..\\windows', file: '..\\system32\\x.apk' });
  assert.ok(!path.includes('..'));
});
