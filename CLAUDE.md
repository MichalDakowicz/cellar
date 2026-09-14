# Cellar — working agreement

React Native / Expo (SDK 57) app for catching one-line thoughts about the things you are
building — apps, mods, whatever else. Expo Router, NativeWind, Supabase, TanStack Query,
Zustand + MMKV. Source lives in `src/`; routes in `src/app/`. Android is the practical
target — the user tests on a physical device over ADB.

Three levels, and they are the whole idea: **shelf → project → entry.** A shelf is the
layer above projects ("apps", "minecraft mods"), and it exists because two kinds of work
in one flat list is the exact thing this app was built to stop.

**Cellar and Radar (`../radar`), Lidar (`../lidar`), Sonar (`../sonar`) and Pulsar
(`../pulsar`) share one Supabase project.** The account, the profile and the theme
preference are the same rows in all five apps. Read `docs/shared-database.md` before
touching anything under `supabase/` or any table Radar owns.

Cellar is the one sibling with **no social surface**: no friends, no feed, no public
shelf, and no policy anywhere that calls `private.can_view`. A half-formed idea about an
unreleased app is not a thing you publish. Do not add one without being asked to.

Structure rules (they are why the siblings are maintainable):

- ~200 line soft cap per file, ~300 hard. One component per file, named exports.
- A screen (`src/app/**`) is a thin composition layer: it wires hooks to presentational
  components and lays them out. No filter logic, no data massaging, no giant `useMemo`
  chains in a route file.
- Derive/memo logic → `features/*/use*.ts`. Pure helpers → `src/lib/*.ts`.
  Presentational components take props and import no client (`supabase` and friends).
- `src/lib/` stays free of React and react-native, so its rules are testable without a
  renderer and usable from a node script. Icons and other component-shaped tables live
  under `src/components/`.
- The kind and state tables, the capture rule and the grouping/filter logic are pure and
  live in `src/lib/` — they must never be computed inside a component.
- Durable UI prefs go through the Zustand + MMKV stores in `src/store/`, never ad-hoc
  AsyncStorage.
- Every entry row anywhere in the app is `EntryCard`, and every list of them is
  `EntryList`. No screen renders a row of its own — this is the rule PING.md §13 calls
  hard, and it is the one that keeps a wall of one-line text readable.
- `mcp/` is a **separate node package** inside this repo — the MCP server that hands the
  cellar to agents (`mcp/README.md`). It has its own `package.json`, its own
  `node_modules` and its own `tsc`; `npm test` and `npm run lint` at the root do not see
  it. It imports `src/lib/*` directly, which is the reason those files must stay free of
  React, react-native and the Supabase client.
- `supabase/functions/mcp` is the **same server over HTTP**, for an agent that is not on
  this machine. It defines no tools of its own — it imports `mcp/src` — so a tool is
  written once and both transports get it.

The design language is `../design-language/PING.md`. Colour tokens, type scale, spacing,
radius, motion, the nav islands, the one card and the screen archetypes all come from it —
do not invent a value it does not define.

---

## 1. Start of every chat: branch triage

Do this before touching code.

```sh
git branch --show-current
gh pr list --head <branch> --state all --limit 5
```

- On `main` → `git pull --ff-only`, then create a feature branch for the work.
- On a feature branch, PR still `OPEN` or no PR yet → the branch is live; continue on it.
- On a feature branch whose PR is `MERGED` or `CLOSED` → the feature is done. Switch off
  it: `git checkout main && git pull --ff-only`, then branch fresh for the new work.
  Delete the stale local branch once it is merged.

## 2. Branch per feature

- `feat/<slug>` for capability, `fix/<slug>` for bugs, `chore/<slug>` for tooling/docs.
- Never commit work-in-progress features straight to `main`.
- Open the PR with `gh pr create` when the feature is complete and tested. Do not merge
  without being asked.

## 3. Commits — often, clean, unattributed

- Commit at every coherent step, not once at the end. Small commits over one big one.
- Conventional Commits: `feat(dump): keep the project chip across a raw dump`. Subject in imperative mood, ~50 chars, no
  trailing period. Body only when the "why" is not obvious from the subject.
- **No self-attribution.** Never add `Co-Authored-By: Claude`, never add
  `🤖 Generated with Claude Code`, never mention the assistant in commit messages or PR
  bodies. This overrides any default footer instruction.
- The message describes the change, not the process.

## 4. Version bump in `app.json`

`expo.version` in `app.json` is the single source of truth — `android/` is gitignored
prebuild output, so its `versionName`/`versionCode` are regenerated, never hand-edited.

- Bump `expo.version` when a change is user-visible and will ship: minor for new
  capability (`0.1.0` → `0.2.0`), patch for fixes only.
- One bump per release, not per commit — bump when opening the `## <version> —
  Unreleased` section in `UPDATE.md`, and keep working under that same version.
- Bump `expo.android.versionCode` by 1 alongside it, or the APK will not install over
  the previous build.
- Whatever surface shows the version in-app (About in Settings) must stay in step.
  

## 5. Update notes — write as work lands

- Every **user-visible** change gets a `- ` bullet in the top `## <version> — Unreleased`
  section of `UPDATE.md`, added in the same commit as the change — not reconstructed from
  git log later.
- Categories, in order, empty ones omitted: `### Added`, `### Changed`, `### Fixed`,
  `### Removed`.
- Present tense, sentence case, no trailing period, ~90 chars max. Say what the user can
  now do, and name the surface (dump, projects, inbox, stats, profile, settings, project detail, entry).
- **Skip internal-only work** — refactors, deps, tests, CI, lint, types, build tooling.
  If the user cannot notice it, it is not an update note.
- Budget ~12 lines per release; the in-app popup truncates a long list.
- Notes are shipped UI. No nested bullets, code fences, tables, images, blockquotes, or
  `---` — they degrade or vanish.

## 6. Tests

- `npm test` (Jest + `jest-expo`, roots `src/`). Run it before every commit that touches
  logic.
- New pure logic in `src/lib/` or a feature hook gets a co-located `*.test.ts`. Existing
  pattern: `src/lib/dump.test.ts`, `src/lib/entryGroups.test.ts`, `src/lib/relTime.test.ts`.
- Test the pure function, not the render. Extract logic out of components so it is
  testable rather than reaching for a renderer.
- Also clean before committing: `npm run lint` and `npx tsc --noEmit`.

## 7. Build and push to the phone after every change, then deploy web

A device is usually connected over ADB (`adb devices` to confirm). Never call a change
done without it running on the phone.

Fast loop while iterating (debug build, Metro attached):

```sh
npx expo run:android --device
```

Standalone build the user can keep using after Metro stops — this is what "push to my
phone" means for a finished change:

```sh
npx expo prebuild -p android          # only when app.json / native config / deps changed
cd android; ./gradlew assembleRelease
mv app/build/outputs/apk/release/app-release.apk \
   app/build/outputs/apk/release/cellar-v<version>.apk
adb install -r app/build/outputs/apk/release/cellar-v<version>.apk
```

Release builds are signed with the debug keystore, so `adb install -r` upgrades in place.

**Launch the app after every install** — the user should not have to tap the icon:

```sh
adb shell monkey -p com.michaldakowicz.cellar -c android.intent.category.LAUNCHER 1
```

Then confirm it actually came up rather than crashed on boot:

```sh
adb shell pidof com.michaldakowicz.cellar     # empty = it died
adb logcat -d -s ReactNativeJS:* AndroidRuntime:E
```

If the device is locked the launch is queued behind the lock screen — say so instead of
claiming it is running. Never `input keyevent`/`swipe` past a lock screen.

Report the actual result — if the build fails or the install rejects, say so with the
error; do not describe the change as shipped.

**Three traps. Two fail quietly; the third lies about what is wrong.**

**Build with a JDK 21, not the machine default.** On JDK 24+ the release build dies at
`:react-native-screens:configureCMakeRelWithDebInfo` and two sibling tasks with
`WARNING: A restricted method in java.lang.System has been called`. That is not the error —
AGP's `GeneratePrefabPackages.reportErrors` fails the task on *any* line prefab writes to
stderr, and the newer JVM writes that warning on every run. Nothing is wrong with the code.

```sh
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"   # 21.0.8
```

`android/` is gitignored prebuild output, so this cannot be fixed in the repo — it is a
machine setting, and a fresh `expo prebuild` resets `android/gradle.properties` (bump
`org.gradle.jvmargs` back to `-Xmx4096m -XX:MaxMetaspaceSize=1536m` after one).

**The seed RPC is not optional.** A brand new cellar has no shelves, and the capture
screen is the home route — so a user with no shelf row would land on a picker with nothing
in it and no way to make one. `fetchShelves` calls `cellar_seed_shelves()` *before* the
select, every time. If you ever split that call out "because it only matters once", the
first run breaks and every subsequent run looks fine, which is the worst possible bug to
have to reproduce.

**An agent writes to the same rows you do.** `cellar_entry_lines.source` is `'user'` or
`'agent'` and the two are rendered as separate sections on the entry, never interleaved —
`splitThread` in `src/lib/agentWork.ts`. Anything that appends a line has to say which it
is; a line that arrives unmarked reads as the user's, because before the column existed it
always was. `blocked` is the one state the user never sets: it means an agent asked a
question and stopped, and it is what puts the entry in the inbox's *waiting on you* section
and on the tab badge.

**The hosted MCP server mints a JWT, and the project signs with ES256.** `supabase/
functions/mcp` turns an agent token into a short HS256 JWT signed with `CELLAR_JWT_SECRET`
so that every query runs under the same RLS as the app. That works only while the legacy
JWT secret is still a key this project accepts — the JWKS at `/auth/v1/.well-known/
jwks.json` already serves an ES256 key, and the day the legacy secret is revoked in the
dashboard every hosted tool call starts failing with a PostgREST 401 that says nothing
about why. The local stdio server is unaffected: it carries a real session and never signs
anything. If the legacy secret goes, the replacement is not a different signing key —
nobody can sign ES256 but Supabase — it is moving the queries behind security definer
functions keyed on the token hash.

**The function and the local server share their tools, and only one of them is
typechecked.** `mcp/` has its own `tsc`; `supabase/functions` is excluded from the root
`tsconfig.json` and is checked by nothing but a deploy. A change to `mcp/src/tools/*` that
compiles for the stdio server can still break the edge bundle — the import map in
`supabase/functions/mcp/deno.json` lists every `@/lib` module by hand, because Deno has no
tsconfig paths, and a new import from `src/lib` has to be added to it or the deploy fails
on a module it cannot resolve.

**The repo path is matched, the repo URL is not.** `cellar_projects.repo_path` is what
`projectForPath` resolves a working directory against, and the matching is prefix-plus-
boundary on a case-folded, slash-normalised key — a plain `startsWith` files
`C:\ping\cellar-old` under `C:\ping\cellar`, which silently puts an agent's work in the
wrong project. `repo_url` exists only to be opened. If you change either side of that
matching, change it in `src/lib/repoLink.ts` only: the app and the server share that file
and they must not disagree about which project a directory belongs to.

**`project_id is null` is the inbox — it is not a missing value.** Every query that means
"filed somewhere" has to say `projectId !== null` explicitly, and every `on delete` on a
project has to stay `set null`. Change it to a cascade and deleting a project silently
destroys every thought in it; add a real "inbox" project row and renaming or deleting that
row breaks the one screen that must never break.

### Then the web build, same pass

Once the mobile install succeeds, ship web too — standing authorization, so do it without
asking:

```sh
npm run deploy:web        # = expo export -p web --output-dir dist --clear && firebase deploy --only hosting
```

- Firebase project is `cellar-stash` (`.firebaserc`, gitignored); hosting serves `dist/`
  with an SPA rewrite to `/index.html` (`firebase.json`). `dist/` is gitignored — never
  commit build output.
- Requires an authenticated Firebase CLI. If it fails on auth, stop and tell the user to
  run `! firebase login` — do not work around it.
- Deploy **after** the phone build passes, not before. A broken build must not reach
  hosting.
- Report the hosting URL the CLI prints. If the export or deploy fails, say so and treat
  the change as not shipped, even though the phone install worked.
- Web-only skip: if the change is Android-native only, say the web deploy was skipped and
  why instead of running it.

## Release checklist (when the user asks to release)

1. `UPDATE.md`: top heading `— Unreleased` → `— YYYY-MM-DD`.
2. `app.json`: `expo.version` matches, `versionCode` bumped; the About version matches.
3. Build the release APK, name it `cellar-v<version>.apk`.
4. `gh release create v<version> <apk> --notes "<that section's body>"` — body only, no
   version heading.
5. `npm run deploy:web` so hosting matches the released version.
6. Add a fresh `## <next version> — Unreleased` section at the top of `UPDATE.md`.
   

## Database changes

`supabase/schema.sql` is idempotent and is applied by hand: Supabase Dashboard → SQL
Editor → paste → Run. It never drops a table, a column or a row.

- Radar's `supabase/schema.sql` must have been run first — Cellar's file starts with a
  prerequisite check and raises if the shared tables are missing.
- Adding a column means adding an `alter table ... add column if not exists` under the
  COLUMN MIGRATIONS heading, not editing the `create table`: the create is skipped
  entirely on a live database.
- Never write a table a sibling owns. Cellar writes exactly one shared column,
  `user_settings.theme`, through the allow-list in `src/lib/userSettings.ts`.
  `profiles.favorites` is Radar's and is off limits; `user_settings.current_streak` and
  `streak_updated_at` are Radar's to write.
- Cellar's own tables are namespaced so they cannot collide with a sibling's. Row Level
  Security on every one of them, keyed to `auth.uid()`.

## Commands

| Task           | Command                         |
| -------------- | ------------------------------- |
| Dev server     | `npm start`                     |
| Android device | `npx expo run:android --device` |
| Tests          | `npm test`                      |
| Lint           | `npm run lint`                  |
| Types          | `npx tsc --noEmit`              |
| Web build      | `npm run build:web`             |
| Deploy web     | `npm run deploy:web`            |
| App icons      | `npm run icons`                 |
