import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, linkSync } from 'node:fs';
import { join } from 'node:path';
import { readHostDocument } from './documents.ts';
import { worktreeFixture, projectId } from './worktreeFixture.ts';
import type { HostDeps } from './api.ts';
test('document reader preserves exact UTF8 source; rejects traversal, ignored, hardlinked and huge files', async () => {
  const f = await worktreeFixture();
  try {
    const deps = { account: f.account } as HostDeps; const request = { projectId, path: 'guide.adoc' };
    const source = '\ufeff= Café 👋\r\n\r\n* bold\r\n'; writeFileSync(join(f.root, 'guide.adoc'), source);
    assert.equal((await readHostDocument(deps, request)).source, source);
    assert.equal((await readHostDocument(deps, { ...request, path: join(f.root, 'guide.adoc') })).source, source);
    writeFileSync(join(f.root, '.gitignore'), 'private/\n'); mkdirSync(join(f.root, 'private')); writeFileSync(join(f.root, 'private', 'secret.md'), 'secret');
    for (const path of ['../outside.md', 'private/secret.md', '.git/config', 'file.txt:stream']) await assert.rejects(readHostDocument(deps, { ...request, path }));
    writeFileSync(join(f.root, 'large.md'), 'x'.repeat(262145)); await assert.rejects(readHostDocument(deps, { ...request, path: 'large.md' }), /limit/);
    writeFileSync(join(f.root, 'binary.txt'), Buffer.from([0, 1])); await assert.rejects(readHostDocument(deps, { ...request, path: 'binary.txt' }), /Binary/);
    writeFileSync(join(f.root, 'invalid.txt'), Buffer.from([255, 255])); await assert.rejects(readHostDocument(deps, { ...request, path: 'invalid.txt' }), /UTF-8/);
    linkSync(join(f.root, 'guide.adoc'), join(f.root, 'hard.md')); await assert.rejects(readHostDocument(deps, { ...request, path: 'hard.md' }), /unlinked/);
    writeFileSync(join(f.root, 'fake.png'), 'not a png'); await assert.rejects(readHostDocument(deps, { ...request, path: 'fake.png' }), /match/);
    writeFileSync(join(f.root, 'graphic.svg'), '<svg onload="bad()"/>'); assert.equal((await readHostDocument(deps, { ...request, path: 'graphic.svg' })).kind, 'text');
    const original = f.account.commandProjects.bind(f.account); f.account.commandProjects = async () => { const p = await original(); f.account.current!.userId = 'other'; return p; };
    await assert.rejects(readHostDocument(deps, request), /Account changed/); f.account.commandProjects = original;
  } finally { f.account.current!.userId = 'owner'; await f.dispose(); }
});
