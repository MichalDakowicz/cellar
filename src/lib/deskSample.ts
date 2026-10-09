import type { DeskApproval } from './deskChat';
import type { PreviewCheck } from './deskPreview';
import type { DeskLogLine } from './deskProtocol';
import type { DeskRunCard } from './deskView';

/**
 * The sample desk — what the desk screens show before the pc can report it.
 *
 * Pass 1 of docs/desk/TASKS.md draws every screen before the wiring exists, and
 * a screen with nothing in it cannot be looked at. This is that something. It
 * is shown only behind settings › desk › "show a sample desk", off by default,
 * and every value in it is labelled sample on screen: none of it is a fact
 * about anybody's pc.
 */

export type DeskCommandIcon = 'rebuild' | 'preview' | 'deploy' | 'apk' | 'test' | 'run';

/** A prepared `$` command: a button on the desk, a word after `$` in the composer. */
export type DeskCommand = { id: string; label: string; icon: DeskCommandIcon };

export type DeskProjectCommands = {
  id: string;
  name: string;
  /** The mono line under the tiles: folder, last build. */
  meta: string;
  commands: DeskCommand[];
};

export type DeskHostFigures = { label: string; value: string }[];

const COMMANDS: DeskCommand[] = [
  { id: 'rebuild', label: 'rebuild', icon: 'rebuild' },
  { id: 'preview', label: 'preview', icon: 'preview' },
  { id: 'deploy', label: 'deploy', icon: 'deploy' },
  { id: 'apk', label: 'apk', icon: 'apk' },
];

export const SAMPLE_PROJECTS: DeskProjectCommands[] = [
  { id: 'sample-app', name: 'app', meta: 'app · ~/code/app · last build 41s, 12m ago', commands: COMMANDS },
  { id: 'sample-site', name: 'site', meta: 'site · ~/code/site · not built on this pc yet', commands: COMMANDS.slice(0, 3) },
  { id: 'sample-mod', name: 'mod', meta: 'mod · ~/code/mod · last build 1m 02s, yesterday', commands: COMMANDS },
];

export const SAMPLE_FIGURES: DeskHostFigures = [
  { label: 'cpu', value: '18%' },
  { label: 'memory', value: '9.4 / 32 gb' },
  { label: 'agents', value: '2 of 4 slots' },
];

export const SAMPLE_RUNS: DeskRunCard[] = [
  {
    id: 'sample-1',
    project: 'app',
    startedAt: 4,
    title: 'add the desk tab',
    meta: 'app · codex · wt/desk-tab · 9m',
    detail: 'wants to run npm i expo-av',
    state: 'waiting',
    stoppable: false,
  },
  {
    id: 'sample-2',
    project: 'app',
    startedAt: 3,
    title: 'fix the sticky inbox swipe',
    meta: 'app · claude · wt/inbox-swipe · 6m',
    detail: 'editing src/app/(tabs)/inbox.tsx',
    state: 'running',
    stoppable: false,
  },
  {
    id: 'sample-3',
    project: 'site',
    startedAt: 2,
    title: 'port the shelf grid to the site',
    meta: 'site · claude · merged to main · 2h ago · +142 −38',
    detail: null,
    state: 'done',
    stoppable: false,
  },
  {
    id: 'sample-4',
    project: 'app',
    startedAt: 1,
    title: 'write the release notes',
    meta: 'app · codex · yesterday · 1 file',
    detail: null,
    state: 'done',
    stoppable: false,
  },
];

/** The sample runs' chats, for the run screen. */
export const SAMPLE_CHATS: Record<
  string,
  { branch: string; diff: { added: number; removed: number; files: number } | null; lines: DeskLogLine[]; approval: DeskApproval | null }
> = {
  'sample-1': {
    branch: 'wt/desk-tab',
    diff: { added: 212, removed: 40, files: 6 },
    lines: [
      { who: 'you', text: 'replace the profile tab with a desk tab. settings stays one tap away from it. match the nav islands' },
      { who: 'agent', text: 'on it — reading the tabs layout and the nav islands first.' },
      { who: 'tool', text: 'Read src/app/(tabs)/_layout.tsx' },
      { who: 'tool', text: 'Read src/components/layout/NavIslands.tsx' },
      { who: 'tool', text: 'Bash rg -n "profile" src' },
      { who: 'tool', text: 'Edit src/components/layout/navDestinations.tsx' },
      {
        who: 'agent',
        text: 'the right island now shows the desk glyph, with a badge for anything waiting on you. voice tasks need expo-av — ok to install it?',
      },
    ],
    approval: {
      what: 'run a command',
      subject: 'npm install expo-av',
      effect: 'in .worktrees/desk-tab · changes package.json and the lockfile',
      always: 'allow installs for the rest of this run',
    },
  },
  'sample-2': {
    branch: 'wt/inbox-swipe',
    diff: { added: 31, removed: 9, files: 2 },
    lines: [
      { who: 'you', text: 'inbox swipe feels sticky on android — fix it' },
      { who: 'agent', text: 'looking at the swipe thresholds and the gesture handler.' },
      { who: 'tool', text: 'Read src/components/cellar/SwipeShelf.tsx' },
      { who: 'tool', text: 'Edit src/components/cellar/SwipeShelf.tsx' },
    ],
    approval: null,
  },
};

/** The sample preview (`Preview.dc.html`): a page the pc is serving for a run. */
export const SAMPLE_PREVIEW = {
  port: 8081,
  path: '/inbox',
  meta: 'app · built 41s ago',
  branch: 'wt/inbox-swipe',
  /** The run it belongs to — where "tell the agent" goes. */
  runId: 'sample-2',
  checks: [
    { label: 'expo export -p web', command: true, state: 'passed', detail: '41s' },
    { label: 'tsc --noEmit', command: true, state: 'passed', detail: '0 errors' },
    { label: 'bundle 2.1 mb', command: false, state: 'measure', detail: '+12 kb since live' },
  ] satisfies PreviewCheck[],
  deployTarget: 'to firebase hosting · sample-site',
  deployCommand: 'firebase deploy --only hosting',
};

/** What `$` offers as commands until the pc reads a project's own (W2). */
export const SAMPLE_COMMANDS = ['rebuild', 'preview', 'deploy', 'apk', 'try-on-phone', 'logcat'];

/** What `@` finds until the pc can search a run's worktree (W10). */
export const SAMPLE_FILES = [
  { path: 'src/components/cellar/SwipeShelf.tsx', changed: true },
  { path: 'src/app/(tabs)/inbox.tsx', changed: true },
  { path: 'src/components/layout/NavIslands.tsx', changed: false },
  { path: 'src/features/inbox/', changed: false },
  { path: 'app.json', changed: false },
];

/** What `/` finds until the pc lists an agent's skills (W10): built in, then your own. */
export const SAMPLE_SKILLS: Record<string, { name: string; detail: string }[]> = {
  claude: [
    { name: 'review', detail: 'built in' },
    { name: 'init', detail: 'built in' },
    { name: 'compact', detail: 'built in' },
    { name: 'frontend-design', detail: 'yours' },
    { name: 'release-notes', detail: 'yours' },
  ],
  codex: [
    { name: 'review', detail: 'built in' },
    { name: 'init', detail: 'built in' },
    { name: 'compact', detail: 'built in' },
  ],
};

/** The desktop chat's right rail for the sample runs: this run's files, checkpoints, preview. */
export const SAMPLE_RAIL: Record<
  string,
  { files: { path: string; added: number; removed: number }[]; checkpoints: number; preview: string | null }
> = {
  'sample-1': {
    files: [
      { path: 'NavIslands.tsx', added: 34, removed: 12 },
      { path: '(tabs)/_layout.tsx', added: 18, removed: 6 },
      { path: '(tabs)/desk.tsx', added: 160, removed: 0 },
    ],
    checkpoints: 3,
    preview: 'sample',
  },
  'sample-2': {
    files: [{ path: 'SwipeShelf.tsx', added: 31, removed: 9 }],
    checkpoints: 1,
    preview: 'sample',
  },
};
