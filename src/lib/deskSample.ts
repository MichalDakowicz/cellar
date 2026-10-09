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

/** A row in the project's desk panel (`DeskProjects.dc.html`). */
export type DeskPanelRow = { label: string; detail: string; state: 'ok' | 'busy' | 'waiting' | null };

/** The project's desk panel on the sample desk: worktrees, previews, shipped, last command runs. */
export const SAMPLE_PROJECT_DESK: { title: string; rows: DeskPanelRow[] }[] = [
  {
    title: 'worktrees',
    rows: [
      { label: 'main', detail: 'clean · 1.12.1 is live', state: null },
      { label: 'wt/inbox-swipe', detail: 'claude · +88 −21', state: 'busy' },
      { label: 'wt/desk-tab', detail: 'codex · waiting on you · +212 −40', state: 'waiting' },
    ],
  },
  {
    title: 'previews up',
    rows: [
      { label: 'wt/inbox-swipe :8081', detail: 'on the phone', state: 'ok' },
      { label: 'wt/desk-tab :8082', detail: 'open', state: 'ok' },
    ],
  },
  {
    title: 'shipped',
    rows: [
      { label: 'web 1.12.1 · sample-site', detail: '2h ago', state: null },
      { label: 'apk 1.12.1 · release', detail: '2h ago', state: null },
    ],
  },
  {
    title: 'commands · last runs',
    rows: [
      { label: '$apk', detail: 'running 1m 12s', state: 'busy' },
      { label: '$deploy', detail: '52s · ok', state: 'ok' },
      { label: '$rebuild', detail: '41s · ok', state: 'ok' },
    ],
  },
];

/** Plan limits on the sample desk (`DeskUsage.dc.html`), until the agents report theirs (W16). */
export const SAMPLE_USAGE: { agent: string; windows: { label: string; used: number; resets: string }[] }[] = [
  {
    agent: 'claude',
    windows: [
      { label: '5-hour window', used: 42, resets: 'resets in 2h 14m' },
      { label: 'this week', used: 81, resets: 'resets mon 09:00' },
    ],
  },
  {
    agent: 'codex',
    windows: [
      { label: '5-hour window', used: 12, resets: 'resets in 4h 02m' },
      { label: 'this week', used: 28, resets: 'resets thu 18:00' },
    ],
  },
];

/** A recipe per entry kind on the sample desk (`DeskRecipes.dc.html`), until W15. */
export const SAMPLE_RECIPES: Record<
  string,
  { agent: 'claude' | 'codex' | 'default'; mode: 'ask' | 'edits' | 'full'; prompt: string; after: string[]; then: string }
> = {
  glitch: { agent: 'claude', mode: 'edits', prompt: 'reproduce {entry} first. fix it with the smallest change and add a test that fails before the fix.', after: ['$try-on-phone'], then: 'leave the entry in doing until you look' },
  removal: { agent: 'codex', mode: 'edits', prompt: 'remove {entry} and everything that only it used. list what you deleted.', after: ['$rebuild'], then: 'move the entry to done' },
  idea: { agent: 'claude', mode: 'ask', prompt: 'write a short plan for {entry} in {project}. no code yet — ask me before building.', after: [], then: 'append the plan to the entry' },
  question: { agent: 'codex', mode: 'ask', prompt: 'answer {entry} from the code in {project}. no edits. quote the files you used.', after: [], then: 'append the answer, move to done' },
  research: { agent: 'default', mode: 'ask', prompt: 'read the links in {lines} and summarise what matters for {project} in five lines.', after: [], then: 'append the summary to the entry' },
  copy: { agent: 'codex', mode: 'edits', prompt: 'rewrite the copy for {entry}. keep the meaning, follow the house style.', after: ['$preview'], then: 'leave in doing until you look' },
  design: { agent: 'claude', mode: 'edits', prompt: 'design and build {entry}. reuse the existing components in {files}.', after: ['$preview', '$try-on-phone'], then: 'leave in doing until you look' },
};

/** Rules on the sample desk: what every agent has to follow, and where. */
export const SAMPLE_RULES: { text: string; scope: string }[] = [
  { text: 'solid colours only, no gradients', scope: 'everywhere' },
  { text: 'never add a dependency without asking', scope: 'everywhere' },
  { text: 'run the tests before saying it is done', scope: 'shelf · apps' },
];

/** Notes with no source yet on the sample desk (`PhoneNotify.dc.html`): a filed crash (W17), a plan out (W16). */
export const SAMPLE_NOTES = [
  {
    id: 'sample-crash',
    head: 'cellar · filed for you',
    title: 'app crashed on this phone',
    body: ['IllegalStateException in EditorScreen — filed as a glitch with the stack, a screenshot and the last 200 log lines'],
    mono: false,
    progress: null,
    actions: [
      { id: 'handoff', label: 'hand it off' },
      { id: 'open', label: 'open' },
    ],
  },
  {
    id: 'sample-limit',
    head: 'cellar · paused · app',
    title: 'claude’s week ran out on “personal”',
    body: ['the cart run stopped between turns. carry on as:'],
    mono: false,
    progress: null,
    actions: [
      { id: 'work', label: 'work' },
      { id: 'api', label: 'api key' },
      { id: 'more', label: 'more…' },
    ],
  },
];

/** A question on the sample desk, for its notification. */
export const SAMPLE_QUESTION = {
  id: 'sample-q',
  agent: 'claude',
  where: 'app',
  question: 'how should the cart open on phones?',
  options: ['from the bottom — recommended', 'from the right, like desktop', 'a full screen', 'leave it'],
};

/** Race (`PhoneRace.dc.html`, W19): one prompt, two runs, compared. */
export const SAMPLE_RACE = {
  project: 'app',
  title: 'make the cart work on small phones',
  runs: [
    { agent: 'claude', checks: '12 of 12 pass', passed: true, added: 180, removed: 22, files: 4, took: '7m', usage: '38k tokens', approach: 'bottom sheet, total pinned' },
    { agent: 'codex', checks: '12 of 12 pass', passed: true, added: 260, removed: 40, files: 7, took: '9m', usage: '52k tokens', approach: 'drawer from the right' },
  ],
};

/** Night shift digest (`PhoneNight.dc.html`, W19). */
export const SAMPLE_NIGHT = {
  host: 'home-server',
  window: '01:00–05:40',
  used: '11% of this week',
  runs: [
    { id: 'n1', title: 'add order dates to emails', meta: 'site · claude · +64 −12 · 3 files', state: 'passed' as const, summary: "dates in the confirmation and shipping emails, in the reader's own format", second: 'follow up' },
    { id: 'n2', title: 'tidy the product grid on tablets', meta: 'site · codex · preview ready', state: 'passed' as const, summary: '3 columns from 768px, cards no longer stretch', second: 'see preview' },
    { id: 'n3', title: 'rename the settings keys', meta: 'app · claude · stopped at 03:12', state: 'waiting' as const, summary: 'asks: keep the old keys working for one release?', second: 'answer' },
    { id: 'n4', title: 'update dependencies', meta: 'mod · codex · 2 checks failed', state: 'failed' as const, summary: "the date picker's new version changed its api", second: 'follow up' },
  ],
  tonight: [
    { title: 'write tests for the cart total', project: 'site' },
    { title: 'translate the empty states', project: 'app' },
    { title: 'audit unused dependencies', project: 'mod' },
  ],
};

/** A group run (`DeskGroupRun.dc.html`, W19): one prompt across a shelf of projects. */
export const SAMPLE_GROUP = {
  group: 'storefront',
  title: 'move every button to the new radius tokens',
  meta: 'one prompt · claude · edits ok · each project’s own rules added · started 10:02 from your phone',
  prompt: 'move every button to --radius-control from @tokens/radius.css and remove the hard-coded radii. run each project’s checks.',
  projects: [
    { name: 'site', line: 'wt/radius-tokens · +40 −38 · checks 18 of 18', state: 'done' as const, ship: ['$deploy'], shipState: 'ready' },
    { name: 'app', line: 'wt/radius-tokens · plan 3 of 4 · running checks', state: 'running' as const, ship: ['$apk', '$release'], shipState: 'after checks' },
    { name: 'admin', line: 'asks: some links are styled as buttons — change those too?', state: 'waiting' as const, ship: ['$deploy'], shipState: 'waiting on you' },
    { name: 'emails', line: 'nothing to change — no buttons use a radius here', state: 'stopped' as const, ship: [], shipState: 'skipped' },
  ],
};

/** The phone over adb (`DeskPhone.dc.html`, W18). */
export const SAMPLE_PHONE = {
  name: 'pixel',
  line: 'attached over usb · adb authorised · 64% · app 1.12.2-debug',
  apk: { file: 'app-1.12.2-debug.apk', line: 'built 3m ago from wt/inbox-swipe by $apk · 38 mb' },
  deepLink: 'cellar://entry/archive-needs-an-undo',
  log: [
    { at: '18:41:02.114', level: 'I', text: 'inbox: swipe start row=2' },
    { at: '18:41:02.380', level: 'W', text: 'swipe released at 61% — threshold 66%' },
    { at: '18:41:02.391', level: 'I', text: 'inbox: row snapped back' },
    { at: '18:41:04.120', level: 'I', text: 'inbox: archived, undo toast shown' },
    { at: '18:41:06.004', level: 'E', text: 'toast: undo pressed after unmount' },
  ],
  toggles: ['dark theme', 'show taps', 'layout bounds', 'stay awake while charging'],
};
