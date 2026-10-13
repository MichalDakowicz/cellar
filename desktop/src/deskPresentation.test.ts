import { test } from "node:test";
import assert from "node:assert/strict";
import {
  presentationRuns,
  sampleRuns,
  subscribedRun,
} from "./renderer/deskPresentation";

test("sample toggle preserves real rows and never selects a provider subscription", () => {
  const real = [{ ...sampleRuns()[0], id: "real-1" }];
  assert.equal(presentationRuns(real, false), real);
  assert.deepEqual(
    presentationRuns(real, true).map((row) => row.id),
    ["real-1", "sample-1", "sample-2", "sample-3", "sample-4"],
  );
  assert.equal(subscribedRun("sample-1"), null);
  assert.equal(subscribedRun("real-1"), "real-1");
  assert.equal(subscribedRun(null), null);
});
