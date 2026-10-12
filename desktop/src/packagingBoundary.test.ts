import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('desktop packaging consumes only its own DOM renderer and preserves app identity', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(pkg.build.appId, 'com.michaldakowicz.cellar.desktop');
  assert.equal(pkg.build.productName, 'Cellar');
  assert.deepEqual(pkg.build.extraResources[0], { from: 'renderer-dist', to: 'renderer' });
  assert.match(pkg.scripts.build, /renderer:build/);
  assert.doesNotMatch(JSON.stringify(pkg.scripts), /prefix \.\.|build:web|expo/);
  const server = readFileSync(resolve('src/web.ts'), 'utf8');
  assert.match(server, /join\(process\.resourcesPath, 'renderer'\)/);
  assert.match(server, /join\(__dirname, '\.\.', 'renderer-dist'\)/);
  assert.doesNotMatch(server, /_expo|react-native-web/);
});
