import { splitHex } from './hexChips';

/**
 * The keys (docs/desk/keys.md): `@` files, `$` cellar — commands, projects and
 * the entries inside one — and `/` the agent's skills. One search behind the
 * phone and the pc, so both list the same things in the same order.
 *
 * Pure. The sources are handed in: `$` projects and entries are the cellar's
 * own, while files, skills and commands come from the sample desk until the pc
 * can search them (docs/desk/TASKS.md W2, W10).
 */

export type DeskKey = '@' | '$' | '/';

/** The word being typed, when it starts with a key. */
export type KeyToken = { key: DeskKey; query: string; start: number; end: number };

export type KeySources = {
  projects: { id: string; name: string }[];
  entries: { id: string; projectId: string | null; text: string; kind: string; state: string; archived: boolean }[];
  commands: string[];
  files: { path: string; changed: boolean }[];
  skills: { name: string; detail: string }[];
};

export type KeySuggestion = {
  id: string;
  /** What replaces the typed word. */
  insert: string;
  label: string;
  detail: string;
  mono: boolean;
  /** A project: the list stays open for its entries after the `/`. */
  keepOpen: boolean;
};

const KEYS: readonly string[] = ['@', '$', '/'];
const LIMIT = 8;
const LIVE = new Set(['open', 'doing', 'blocked']);

/** A name or a thought as it is typed after `$`: lowercase words joined by dashes. */
export function keySlug(text: string, words = 6): string {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, words).join('-');
}

/** The key word the caret is in, from the last space to the next one. */
export function tokenAt(text: string, caret = text.length): KeyToken | null {
  const before = text.slice(0, caret);
  const start = before.search(/\S*$/);
  const word = before.slice(start);
  if (!KEYS.includes(word[0])) return null;
  const rest = text.slice(caret).match(/^\S*/)?.[0] ?? '';
  return { key: word[0] as DeskKey, query: `${word.slice(1)}${rest}`, start, end: caret + rest.length };
}

function hasWords(text: string, query: string): boolean {
  const haystack = text.toLowerCase();
  return (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).every((word) => haystack.includes(word));
}

function projectBySlug(sources: KeySources, slug: string) {
  return sources.projects.find((project) => keySlug(project.name) === slug) ?? null;
}

function dollar(query: string, sources: KeySources): KeySuggestion[] {
  const slash = query.indexOf('/');
  if (slash >= 0) {
    const project = projectBySlug(sources, query.slice(0, slash).toLowerCase());
    if (!project) return [];
    const words = query.slice(slash + 1);
    const prefix = `$${keySlug(project.name)}/`;
    const found = sources.entries
      .filter((entry) => entry.projectId === project.id && !entry.archived && LIVE.has(entry.state))
      .filter((entry) => hasWords(entry.text, words))
      .slice(0, LIMIT - 1)
      .map((entry) => ({
        id: `entry:${entry.id}`,
        insert: `${prefix}${keySlug(entry.text)}`,
        label: `${prefix}${keySlug(entry.text)}`,
        detail: `${entry.kind} · ${entry.state}`,
        mono: true,
        keepOpen: false,
      }));
    const fresh = keySlug(words, 12);
    if (!fresh) return found;
    return [
      ...found,
      {
        id: 'new-entry',
        insert: `${prefix}${fresh}`,
        label: `+ new entry “${fresh.replace(/-/g, ' ')}” in ${project.name}`,
        detail: '',
        mono: false,
        keepOpen: false,
      },
    ];
  }

  const q = query.toLowerCase();
  const commands = sources.commands
    .filter((command) => command.startsWith(q))
    .map((command) => ({ id: `command:${command}`, insert: `$${command}`, label: `$${command}`, detail: 'command', mono: true, keepOpen: false }));
  const projects = sources.projects
    .filter((project) => keySlug(project.name).includes(q))
    .map((project) => ({
      id: `project:${project.id}`,
      insert: `$${keySlug(project.name)}/`,
      label: `$${keySlug(project.name)}/`,
      detail: `${project.name} · its entries after /`,
      mono: true,
      keepOpen: true,
    }));
  return [...commands, ...projects].slice(0, LIMIT);
}

function at(query: string, sources: KeySources): KeySuggestion[] {
  const line = query.match(/:\d+$/)?.[0] ?? '';
  const name = query.slice(0, query.length - line.length).toLowerCase();
  return sources.files
    .filter((file) => file.path.toLowerCase().includes(name))
    .sort((a, b) => Number(b.changed) - Number(a.changed))
    .slice(0, LIMIT)
    .map((file) => ({
      id: `file:${file.path}`,
      insert: `@${file.path}${line}`,
      label: `@${file.path}${line}`,
      detail: file.changed ? 'changed in this run' : 'file',
      mono: true,
      keepOpen: false,
    }));
}

function slash(query: string, sources: KeySources): KeySuggestion[] {
  const q = query.toLowerCase();
  return sources.skills
    .filter((skill) => skill.name.includes(q))
    .sort((a, b) => Number(b.name.startsWith(q)) - Number(a.name.startsWith(q)))
    .slice(0, LIMIT)
    .map((skill) => ({ id: `skill:${skill.name}`, insert: `/${skill.name}`, label: `/${skill.name}`, detail: skill.detail, mono: true, keepOpen: false }));
}

export function keySuggestions(token: KeyToken, sources: KeySources): KeySuggestion[] {
  if (token.key === '$') return dollar(token.query, sources);
  if (token.key === '@') return at(token.query, sources);
  return slash(token.query, sources);
}

/** The text with the typed word swapped for a pick, and where the caret goes. */
export function applySuggestion(text: string, token: KeyToken, pick: KeySuggestion): { text: string; caret: number } {
  const after = text.slice(token.end);
  const gap = pick.keepOpen || after.startsWith(' ') ? '' : ' ';
  const head = `${text.slice(0, token.start)}${pick.insert}${gap}`;
  return { text: `${head}${after}`, caret: head.length + (gap === '' && !pick.keepOpen ? 1 : 0) };
}

/** One line of "what this will do", for each key word and colour in the message. */
export type KeyPlanLine = { key: DeskKey | '#'; token: string; says: string };

const WORD_RE = /(?<!\S)([@$/])(\S+)/g;

function trimWord(word: string): string {
  return word.replace(/[.,;!?)]+$/, '').replace(/:$/, '');
}

function sayDollar(word: string, first: boolean, sources: KeySources): string {
  const slashAt = word.indexOf('/');
  if (slashAt < 0) {
    if (sources.commands.includes(word)) return first ? 'runs straight away, as a job' : 'the agent runs it when it gets there';
    const project = projectBySlug(sources, word.toLowerCase());
    return project ? `points the agent at ${project.name}` : 'not a command or a project yet';
  }
  const project = projectBySlug(sources, word.slice(0, slashAt).toLowerCase());
  const rest = word.slice(slashAt + 1);
  if (!project) return 'no project by that name';
  if (!rest) return `points the agent at ${project.name}`;
  const entry = sources.entries.find((candidate) => candidate.projectId === project.id && keySlug(candidate.text) === rest);
  return entry ? `claims “${entry.text}” and moves it to doing` : `makes an entry “${rest.replace(/-/g, ' ')}” in ${project.name}`;
}

export function keyPlan(text: string, sources: KeySources): KeyPlanLine[] {
  const lines: (KeyPlanLine & { at: number })[] = [];
  const firstWord = text.search(/\S/);

  for (const match of text.matchAll(WORD_RE)) {
    const key = match[1] as DeskKey;
    const word = trimWord(match[2]);
    if (!word) continue;
    const index = match.index ?? 0;
    const token = `${key}${word}`;
    let says: string;
    if (key === '$') says = sayDollar(word, index === firstWord, sources);
    else if (key === '@') {
      const line = word.match(/:(\d+)$/)?.[1];
      says = line ? `hands the agent that file first, at line ${line}` : 'hands the agent that file first';
    } else {
      const known = sources.skills.some((skill) => skill.name === word);
      says = known ? `the agent loads its ${word} skill` : 'no skill by that name yet';
    }
    lines.push({ key, token, says, at: index });
  }

  let cursor = 0;
  for (const segment of splitHex(text)) {
    if (segment.type === 'hex') lines.push({ key: '#', token: segment.value, says: `passes the colour as plain ${segment.value}`, at: cursor });
    cursor += segment.value.length;
  }

  return lines.sort((a, b) => a.at - b.at).map(({ at: _at, ...line }) => line);
}
