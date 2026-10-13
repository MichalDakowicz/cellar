/** Command requests name known project tasks; they never carry shell text. */
export type DeskCommandIcon = 'rebuild' | 'preview' | 'deploy' | 'apk' | 'test' | 'run';
export type DeskCommandStep = { runner: 'npm' | 'gradle'; task: string };
export type DeskCommandDefinition = { id: string; steps: DeskCommandStep[] };
export type DeskCommand = { id: string; label: string; icon: DeskCommandIcon };
export type DeskProjectCommands = {
  id: string; name: string; meta: string; commands: DeskCommand[];
  cwd?: string; overrides?: DeskCommandDefinition[]; error?: string;
};
export type DeskJobStart = { projectId: string; command: string };
export const COMMAND_NAME = /^[A-Za-z0-9][A-Za-z0-9:_.-]{0,63}$/;

export function commandIcon(id: string): DeskCommandIcon {
  if (id === 'apk') return 'apk';
  if (/deploy|publish/.test(id)) return 'deploy';
  if (/test|lint|check/.test(id)) return 'test';
  if (/build|rebuild/.test(id)) return 'rebuild';
  if (/dev|start|preview/.test(id)) return 'preview';
  return 'run';
}

export function commandDefinitions(raw: unknown): DeskCommandDefinition[] {
  if (!Array.isArray(raw) || raw.length > 40) throw new Error('give at most 40 command overrides');
  const seen = new Set<string>();
  return raw.map((value) => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !COMMAND_NAME.test(value.id) || seen.has(value.id)) throw new Error('command names must be unique task names');
    seen.add(value.id);
    if (!Array.isArray(value.steps) || !value.steps.length || value.steps.length > 10) throw new Error('a command needs 1–10 steps');
    return { id: value.id, steps: value.steps.map((step: DeskCommandStep) => {
      if (!step || !['npm', 'gradle'].includes(step.runner) || typeof step.task !== 'string' || !COMMAND_NAME.test(step.task)) throw new Error('steps name an npm script or Gradle task');
      return { runner: step.runner, task: step.task };
    }) };
  });
}

/** A leading command is a job. Extra arguments are refused, never shell-parsed. */
export function leadingCommand(text: string): string | null {
  const token = /^\s*\$([^\s/]+)(?:\s|$)/.exec(text)?.[1];
  return token && COMMAND_NAME.test(token) ? token : null;
}

/** Human-editable settings format: `check = npm:lint + npm:test`. */
export function parseCommandSettings(text: string): DeskCommandDefinition[] {
  return commandDefinitions(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [id, rest, extra] = line.split('=');
    if (!rest || extra !== undefined) throw new Error('use name = npm:script + gradle:task');
    return { id: id.trim(), steps: rest.split('+').map((part) => {
      const match = /^\s*(npm|gradle):([A-Za-z0-9:_.-]+)\s*$/.exec(part);
      if (!match) throw new Error('use name = npm:script + gradle:task');
      return { runner: match[1], task: match[2] };
    }) };
  }));
}

export function formatCommandSettings(commands: DeskCommandDefinition[]): string {
  return commands.map((command) => `${command.id} = ${command.steps.map((step) => `${step.runner}:${step.task}`).join(' + ')}`).join('\n');
}
