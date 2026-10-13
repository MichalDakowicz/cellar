import { SAMPLE_PROJECTS } from "@/lib/deskSample";
import { EMPTY_STREAM } from "@/lib/deskEvents";
import { sampleRuns } from "./deskPresentation";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import type { Entry } from "@/types/cellar";
const sampleEntries: Entry[] = [
  ["archive needs an undo", "glitch", "open"],
  ["use the same radius for every button", "design", "doing"],
  ["links in a thought should open in the browser", "idea", "done"],
  ["which part of the cart matters most?", "question", "blocked"],
  ["read the new date picker API", "research", "open"],
].map(([text, kind, state], index) => ({
  id: "sample-entry-" + index,
  projectId: index === 4 ? null : "sample-app",
  text,
  kind: kind as Entry["kind"],
  state: state as Entry["state"],
  importance: "normal",
  position: index,
  archived: false,
  createdAt: new Date(Date.now() - index * 3600000).toISOString(),
  agent: null,
  lines: [],
  docs: [],
  questions: [],
}));
export function sampleData(phase: string, populated = false) {
  const disconnected = phase === "disconnected";
  const runs = sampleRuns();
  const cellar: Cellar = {
    ownerId: "sample",
    shelves: [{ id: "sample-apps", name: "apps", position: 0, createdAt: "" }],
    projects: SAMPLE_PROJECTS.map((row, index) => ({
      id: row.id,
      name: row.name,
      shelfId: "sample-apps",
      position: index,
      createdAt: "",
      repoPath: `~/code/${row.name}`,
      repoUrl: null,
      pinned: true,
    })),
    entries:
      populated && phase !== "empty" && phase !== "loading"
        ? sampleEntries
        : [],
    groups: [],
    pictures: [],
    loading: phase === "loading",
    error: phase === "failed" ? "sample data read failed" : null,
    refresh: async () => {},
  };
  const host: Host = {
    info: {
      id: "sample-pc",
      name: "michu-pc",
      version: "sample",
      signedIn: true,
      agents: [
        { id: "codex", installed: true },
        { id: "claude", installed: true },
      ],
    },
    state: {
      ...EMPTY_STREAM,
      phase: disconnected
        ? "disconnected"
        : phase === "loading"
          ? "connecting"
          : phase === "failed"
            ? "failed"
            : "live",
      runs: phase === "empty" ? [] : runs,
    },
    live: !disconnected && phase !== "loading" && phase !== "failed",
    key: "sample:sample-pc",
    historyKey: "sample:sample-pc:bridge:",
    error: disconnected
      ? "PC disconnected · sample state"
      : phase === "failed"
        ? "sample host read failed"
        : null,
    reconnect: () => {},
    can: {
      localHost: true,
      pairingIssuer: false,
      adbPresenter: true,
      start: false,
      log: false,
      local: false,
      pages: false,
      managedPreviews: false,
      commands: false,
      keys: false,
      screen: false,
      downloads: false,
      worktrees: false,
      events: false,
      approvals: false,
      dispatch: false,
    },
  };

  return { runs, cellar, host };
}
