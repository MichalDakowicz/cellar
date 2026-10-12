import { useState } from "react";
import type { DeskAgent, DeskStart } from "@/lib/deskProtocol";
import { taskStarts, type DeskMode, type DeskSplit } from "@/lib/deskTask";
import { agentPrompt, agentPromptMany } from "@/lib/agentPrompt";
import { deskFolders } from "@/lib/deskFolders";
import { leadingCommand } from "@/lib/deskCommands";
import { calls } from "./client";
import { save, saved, useSaved } from "./preferences";
import { navigate } from "./useRoute";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { useTaskStart } from "./useTaskStart";
import { useHostQuery } from "./useHostQuery";

export function useNewTask(cellar: Cellar, host: Host) {
  useSaved();
  const text = saved<string>("desktop-new-task", "text", "");
  const projectId = saved<string>(
    "desktop-new-task",
    "projectId",
    saved("cellar-desk-prefs", "commandsProject", "") ?? "",
  );
  const folders = deskFolders(cellar.projects, cellar.groups);
  const folder = folders.find((row) => row.projectId === projectId);
  const agent = saved<DeskAgent>(
    "desktop-new-task",
    "agent",
    saved("cellar-desk-prefs", "defaultAgent", "claude"),
  );
  const mode = saved<DeskMode>(
    "desktop-new-task",
    "mode",
    saved("cellar-desk-prefs", "defaultMode", "edits"),
  );
  const where = saved<"main" | "worktree">(
    "desktop-new-task",
    "where",
    "worktree",
  );
  const entryIds = saved<string[]>("desktop-new-task", "entryIds", []);
  const attached = cellar.entries.filter((entry) =>
    entryIds.includes(entry.id),
  );
  const split = saved<DeskSplit>("desktop-new-task", "split", "one");
  const [jobBusy, setJobBusy] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const task = useTaskStart(host, (runId) => {
    save("desktop-new-task", "text", "");
    save("desktop-new-task", "entryIds", []);
    navigate(`/desk/run/${runId}`);
  });
  const worktrees = useHostQuery(
    host.live && host.can.worktrees,
    calls.worktrees,
    host.key,
  );
  const workspace = worktrees.data?.find((row) => row.projectId === projectId);
  const invalid = !host.live
    ? "Reconnect before sending."
    : host.info?.taskProtocol !== 2
      ? "Update host before sending tasks."
      : !folder
        ? "Pick a project with a folder."
        : !text.trim() && !attached.length
          ? "Write a task or attach a thought."
          : attached.some((entry) => entry.projectId !== projectId)
            ? "Resolve mixed-project attachments."
            : where === "worktree" &&
                (!host.can.worktrees || !workspace?.available)
              ? (worktrees.error ??
                workspace?.reason ??
                "Checking Git support; choose checkout explicitly if needed.")
              : null;
  async function start() {
    if (task.pending) {
      await task.begin();
      return;
    }
    if (invalid || jobBusy || task.busy || !folder) return;
    const command = leadingCommand(text);
    if (command) {
      if (text.trim() !== `$${command}` || attached.length) {
        setJobError(
          "Send command by itself; attach thoughts to an agent task.",
        );
        return;
      }
      setJobBusy(true);
      try {
        navigate(`/desk/run/${(await calls.job({ projectId, command })).id}`);
      } catch (error) {
        setJobError(
          `${String(error)} · inspect jobs before retrying; outcome unconfirmed`,
        );
      } finally {
        setJobBusy(false);
      }
      return;
    }
    const starts = taskStarts({
      typed: text,
      picks: attached.map((entry) => ({
        entryId: entry.id,
        line: agentPrompt(entry, folder.name),
      })),
      together: agentPromptMany(attached, folder.name),
      split,
    });
    const requests: DeskStart[] = starts.map((start) => {
      const commandId = crypto.randomUUID();
      const ids =
        split === "each" && start.entryId
          ? [start.entryId]
          : attached.map((row) => row.id);
      return {
        commandId,
        agent,
        mode,
        where,
        projectId,
        cwd: folder.path,
        prompt: start.prompt,
        name: text.trim().split("\n")[0].slice(0, 60) || null,
        entryIds: ids,
        entryId: ids[0] ?? null,
        ...(where === "worktree" ? { worktreeId: commandId } : {}),
      };
    });
    await task.begin(requests);
  }
  return {
    text,
    projectId,
    folders,
    folder,
    agent,
    mode,
    where,
    entryIds,
    attached,
    split,
    jobBusy,
    jobError,
    task,
    invalid,
    start,
  };
}
