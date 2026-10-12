import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionHandoff } from "./sessionHandoff";

test("owner switch waits for an in-flight old access session, then replaces it", async () => {
  let release!: () => void;
  const sent: string[] = [],
    shown: string[] = [];
  const handoff = sessionHandoff<string>(
    async (owner) => {
      sent.push(owner);
      if (owner === "old")
        await new Promise<void>((resolve) => {
          release = resolve;
        });
    },
    (owner) => shown.push(owner),
  );
  const old = handoff.accept("old");
  await Promise.resolve();
  const next = handoff.accept("new");
  assert.deepEqual(sent, ["old"]);
  release();
  await old;
  await next;
  assert.deepEqual(sent, ["old", "new"]);
  assert.deepEqual(shown, ["new"]);
});

test("queued stale owners are skipped; failure and sign-out do not break serialization", async () => {
  const sent: (string | null)[] = [],
    shown: unknown[] = [];
  const handoff = sessionHandoff<string | null>(
    async (owner) => {
      sent.push(owner);
      if (owner === "new") throw new Error("host unavailable");
    },
    (owner, error) => shown.push([owner, !!error]),
  );
  void handoff.accept("old");
  await handoff.accept("new");
  await handoff.accept(null);
  assert.deepEqual(sent, ["new", null]);
  assert.deepEqual(shown, [
    ["new", true],
    [null, false],
  ]);
  handoff.dispose();
  await handoff.accept("after unmount");
  assert.deepEqual(sent, ["new", null]);
});
