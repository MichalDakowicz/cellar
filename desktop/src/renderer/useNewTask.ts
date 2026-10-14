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
import { recipePrompt, recipeChoices } from '@/lib/deskRecipes';

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
  const automation = useHostQuery(host.live, calls.automation, host.key);
  const entryIds = saved<string[]>("desktop-new-task", "entryIds", []);
  const attached = cellar.entries.filter((entry) => entryIds.includes(entry.id));
  const recipe = attached.length === 1 ? automation.data?.recipes[attached[0].kind] : undefined;
  const agent = saved<DeskAgent>(
    "desktop-new-task",
    "agent",
    recipe && recipe.agent !== 'default' ? recipe.agent : saved("cellar-desk-prefs", "defaultAgent", "claude"),
  );
  const mode = saved<DeskMode>(
    "desktop-new-task",
    "mode",
    recipe?.mode ?? saved("cellar-desk-prefs", "defaultMode", "edits"),
  );
  const where = saved<"main" | "worktree">(
    "desktop-new-task",
    "where",
    "worktree",
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
        : attached.length && (automation.loading || !automation.data)
          ? (automation.error ?? 'Loading saved recipes before sending attached thoughts.')
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
        line: recipePrompt(automation.data?.recipes[entry.kind], entry, folder.name, agentPrompt(entry, folder.name)),
      })),
      together: agentPromptMany(attached, folder.name),
      split,
    });
    const requests: DeskStart[] = starts.map((start) => {
      const entry = attached.find((e) => e.id === start.entryId);
      const eachRecipe = split === 'each' && entry ? automation.data?.recipes[entry.kind] : recipe;
      const choices = recipeChoices(eachRecipe, { agent: saved('cellar-desk-prefs', 'defaultAgent', 'claude'), mode: saved('cellar-desk-prefs', 'defaultMode', 'edits') },
        { agent: saved<DeskAgent | null>('desktop-new-task', 'agent', null), mode: saved<DeskMode | null>('desktop-new-task', 'mode', null) });
      const commandId = crypto.randomUUID();
      const ids =
        split === "each" && start.entryId
          ? [start.entryId]
          : attached.map((row) => row.id);
      return {
        commandId,
        ...choices,
        ...(saved<string>('desktop-new-task', `account:${choices.agent}`, '') ? { accountId: saved<string>('desktop-new-task', `account:${choices.agent}`, '') } : {}),
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
