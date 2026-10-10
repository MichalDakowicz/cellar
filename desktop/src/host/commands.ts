import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { COMMAND_NAME, commandDefinitions, commandIcon, type DeskCommandDefinition, type DeskProjectCommands } from '@/lib/deskCommands';

import type { Account } from './account.ts';
import { DeskError } from './claudeRuns.ts';

export type CommandProject = { projectId: string; name: string; path: string };
export type CommandPlan = { cwd: string; gradle: string | null; steps: DeskCommandDefinition['steps'] };

export class Commands {
  private readonly file: string;
  constructor(dir: string, private readonly account: Pick<Account, 'current' | 'commandProjects'>) {
    this.file = join(dir, 'command-overrides.json');
  }

  private settings(): Record<string, unknown> {
    if (!existsSync(this.file)) return {};
    return JSON.parse(readFileSync(this.file, 'utf8'));
  }

  private async project(id: string): Promise<CommandProject> {
    if (!this.account.current) throw new DeskError('sign in on the pc to read project commands', 409);
    const project = (await this.account.commandProjects()).find((candidate) => candidate.projectId === id);
    if (!project) throw new DeskError('that project has no folder in your cellar', 403);
    return project;
  }

  private read(project: CommandProject) {
    const cwd = realpathSync.native(project.path);
    const manifest = join(cwd, 'package.json');
    const scripts = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')).scripts ?? {} : {};
    const definitions: DeskCommandDefinition[] = Object.entries(scripts)
      .filter(([id, body]) => COMMAND_NAME.test(id) && typeof body === 'string')
      .map(([id]) => ({ id, steps: [{ runner: 'npm', task: id }] }));
    const gradle = [cwd, join(cwd, 'android')].find((dir) => existsSync(join(dir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')) &&
      (existsSync(join(dir, 'build.gradle')) || existsSync(join(dir, 'build.gradle.kts')))) ?? null;
    if (gradle && !definitions.some((command) => command.id === 'apk')) definitions.push({ id: 'apk', steps: [{ runner: 'gradle', task: 'assembleRelease' }] });
    const overrides = commandDefinitions(this.settings()[`${this.account.current!.userId}:${project.projectId}`] ?? []);
    const all = new Map(definitions.map((command) => [command.id, command]));
    for (const command of overrides) all.set(command.id, command);
    return { cwd, gradle, scripts, overrides, definitions: [...all.values()] };
  }

  async list(): Promise<DeskProjectCommands[]> {
    if (!this.account.current) throw new DeskError('sign in on the pc to read project commands', 409);
    return (await this.account.commandProjects()).map((project) => {
      try {
        const found = this.read(project);
        return { id: project.projectId, name: project.name, cwd: found.cwd, meta: found.cwd, overrides: found.overrides,
          commands: found.definitions.map(({ id }) => ({ id, label: id, icon: commandIcon(id) })) };
      } catch (error) {
        return { id: project.projectId, name: project.name, commands: [], meta: 'commands unavailable', error: String(error) };
      }
    });
  }

  async plan(projectId: string, commandId: string): Promise<CommandPlan> {
    const found = this.read(await this.project(projectId));
    const command = found.definitions.find((candidate) => candidate.id === commandId);
    if (!command) throw new DeskError('no command by that name in this project', 404);
    for (const step of command.steps) {
      if (step.runner === 'npm' && typeof found.scripts[step.task] !== 'string') throw new DeskError(`npm script ${step.task} is missing`, 409);
      if (step.runner === 'gradle' && !found.gradle) throw new DeskError('this project has no Gradle wrapper', 409);
    }
    return { cwd: found.cwd, gradle: found.gradle, steps: command.steps };
  }

  async save(projectId: string, raw: unknown): Promise<void> {
    await this.project(projectId);
    const commands = commandDefinitions(raw);
    const all = this.settings();
    all[`${this.account.current!.userId}:${projectId}`] = commands;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(`${this.file}.tmp`, JSON.stringify(all));
    renameSync(`${this.file}.tmp`, this.file);
  }
}
