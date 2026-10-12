import { test } from "node:test";
import { strict as assert } from "node:assert";
import { assertRendererModule } from "./rendererBoundary.mts";

test("DOM build rejects platform screens, IPC main and transitive native packages", () => {
  for (const id of [
    "C:\\repo\\src\\app\\index.tsx",
    "/repo/src/features/auth/AuthProvider.tsx",
    "/repo/node_modules/expo-router/index.js",
    "/repo/node_modules/react-native-web/index.js",
    "/repo/desktop/src/host/host.ts",
    "node:fs",
    "electron",
  ])
    assert.throws(() => assertRendererModule(id));
  for (const id of [
    "/repo/desktop/src/renderer/Chat.tsx",
    "/repo/src/lib/deskCalls.ts",
    "/repo/src/types/cellar.ts",
    "/repo/node_modules/react-dom/client.js",
  ])
    assert.doesNotThrow(() => assertRendererModule(id));
});
