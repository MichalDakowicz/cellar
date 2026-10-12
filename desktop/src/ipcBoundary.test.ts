import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  isCellarOrigin,
  isRendererSender,
  readIpcRequest,
} from "./ipcBoundary.ts";

test("only exact application origin and current top-level renderer get IPC", () => {
  const sender = {
    url: "cellar-desk://app/desk/run/id",
    dev: false,
    senderId: 4,
    windowId: 4,
    topLevel: true,
  };
  assert.equal(isRendererSender(sender), true);
  for (const patch of [
    { topLevel: false },
    { senderId: 3 },
    { windowId: null },
    { url: "cellar-desk://app.evil/" },
    { url: "https://app/" },
    { url: "cellar-desk://user@app/" },
  ])
    assert.equal(isRendererSender({ ...sender, ...patch }), false);
  assert.equal(isCellarOrigin("http://127.0.0.1:5173/desk", true), true);
  assert.equal(isCellarOrigin("http://127.0.0.1:5173/desk", false), false);
  assert.equal(isCellarOrigin("http://localhost:8081/", true), false);
});
test("IPC retains typed host API and discards caller-controlled source", () => {
  assert.deepEqual(
    readIpcRequest({
      method: "POST",
      path: "/run-controls",
      body: { action: "stop" },
      source: "phone",
    }),
    { method: "POST", path: "/run-controls", body: { action: "stop" } },
  );
  for (const request of [
    null,
    { method: "DELETE", path: "/runs" },
    { method: "GET", path: "//evil/runs" },
    { method: "GET", path: "file:///secret" },
    { method: "GET", path: "/runs?source=pc" },
  ])
    assert.throws(() => readIpcRequest(request));
});
