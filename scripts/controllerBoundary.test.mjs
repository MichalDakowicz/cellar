import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertControllerSource, inspectController } from './controllerBoundary.mjs';

test('controller imports reject host, preload, session handoff and ADB presenters', () => {
  for (const source of ['../../desktop/src/host/agents.ts', 'C:\\ping\\cellar\\desktop\\src\\preload.ts', 'src/features/desk/bridge.ts', 'src/features/desk/DeskSessionSync.tsx', 'src/components/desk/later/PhoneTools.tsx', 'src/app/desk/phone.tsx']) assert.throws(() => assertControllerSource(source));
  for (const source of ['src/lib/deskProtocol.ts', 'src/lib/deskCalls.ts', 'src/components/desk/RunRail.tsx', 'src/features/desk/deskClient.ts']) assert.doesNotThrow(() => assertControllerSource(source));
});

test('artifact inspection follows transitive map sources and requires maps', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cellar-controller-boundary-'));
  try {
    await assert.rejects(inspectController(root), /requires source maps/);
    await writeFile(join(root,'index.js.map'), JSON.stringify({ sources:['src/app/index.tsx','src/lib/deskProtocol.ts'] }));
    assert.deepEqual(await inspectController(root), { maps:1, modules:2, localHostImports:0 });
    await writeFile(join(root,'index.js.map'), JSON.stringify({ sources:['desktop/src/main.ts'] }));
    await assert.rejects(inspectController(root), /crossed local-host/);
    await writeFile(join(root,'index.js.map'), JSON.stringify({ sources:['src/lib/deskProtocol.ts'] }));
    await writeFile(join(root,'index.js'), 'window.cellarDesk.request({path:"/info"})');
    await assert.rejects(inspectController(root), /Local IPC/);
  } finally { await rm(root, { recursive:true, force:true }); }
});
