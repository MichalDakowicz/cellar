# Desk canvas review — resume here

## Short version of the request

Work in `cellar/`. Review the PC and mobile desk canvas in `docs/desk/canvas/`, one file at a time, with the user. Read all of `docs/desk/` for behavior, architecture and build status. Open the current page in the browser, suggest changes that make UX/UI coherent, and identify what the implementation lacks compared with the canvas. Write the same ideas in chat and here. After the user selects the additions/changes, ask focused questions in chat and record their answers here. Change the canvas first, self-check every state visually and behaviorally before asking for review, reopen it for review, and preserve implementation notes. Do not implement app changes as part of this review unless asked. Track each page so a later session resumes without repeating approved work.

## Resume checkpoint

- Updated: 2026-10-10 (Europe/Warsaw).
- Current page: **03 — `Run.dc.html`**, phone run chat and approval.
- Stage: **Canvas review — revision 1 with RUN-R1a/R1b/R1c applied and self-checked**. RUN-Q1–RUN-Q8 answered; later direct composer instructions override the earlier arrangement. Canvas acceptance is pending.
- Selected on the current page: **RUN-01–RUN-07**, approved by “1 2 3 4 5 6 7” on 2026-10-10. Canvas acceptance remains pending.
- Latest Run corrections: **RUN-R1b/R1c** — shared composer frame, text above toolbar; transparent plus opens File / Image tray; Voice, model/reasoning and Send in the toolbar. No dispatch choices: Send always queues during an active turn; queue popout offers Send now to steer. This supersedes RUN-R1a's top-right mic placement. Typed `@ $ /` remains; no symbol buttons.
- Confirmed pages: **01 — Main revision 5** and **02 — NewTask revision 2**. User's explicit “next” on 2026-10-10 accepts NewTask with NEW-R2 applied. Skip both on resume; app implementation remains pending.
- Next action: user reviews Run revision 1. Apply feedback here; advance only after acceptance. Do not re-ask answered questions or revisit confirmed Main/NewTask.
- Next page after this canvas is accepted: **04 — `Preview.dc.html`**.
- App implementation: untouched during this review.
- Comparison basis: current source + `TASKS.md`; the running app has not been visually verified in this review. Sample-only UI is distinguished from working behavior below.

### How to continue

1. Read this checkpoint and the current page's decisions first. Continue its current stage; do not restart the review.
2. Open one artboard in the browser. Read its sample logic and related written spec, implementation and tasks.
3. Record concrete suggestions with stable IDs, their reasons, and separate implementation gaps. Present the suggestions in chat.
4. Wait for the user to select proposals. Approval of one proposal does not approve unrelated proposals or app implementation.
5. Ask focused questions about the selected proposals in chat. Save the user's answers and any remaining open points here.
6. Revise the HTML canvas first. Update `canvas.json` notes and relevant desk docs if approved behavior changes. **Self-review before asking the user:** inspect every state visually, scroll the entire artboard, verify side gutters, alignment, type, button styling, hit areas, navigation clearance and interactions. Check that displayed data and available actions match actual connection/loading/error conditions. Fix obvious defects yourself; DOM presence alone is not a visual review. Record findings and verification here, then reopen the corrected canvas for the user's review.
7. Only after the user accepts the revised canvas, mark that page **Confirmed** and move to the next unconfirmed page. A confirmed page is skipped on future sessions even if implementation remains pending. Reopen only if the user requests it or a later decision creates a specific conflict; record that reason.
8. Keep design review, canvas acceptance and implementation status separate. Do not mark build tasks done because a mockup was approved.

Stages: **Not reviewed → Suggestions → Questions → Canvas review → Confirmed**. Rejected/deferred proposals remain recorded. A partial approval stays on the current page.

## Canvas file inventory and review order

Order follows `canvas.json`. Reference boards are reviewed too, after the UI pages.

| # | File | Surface | Review stage | Canvas accepted | Implementation follow-up |
| --- | --- | --- | --- | --- | --- |
| 01 | [Main.dc.html](Main.dc.html) | Phone desk home | Confirmed — revision 5 | Yes | Source gaps + sheet bug remain pending |
| 02 | [NewTask.dc.html](NewTask.dc.html) | Phone new task sheet | Confirmed — revision 2 | Yes | Source gaps recorded below; no app changes |
| 03 | [Run.dc.html](Run.dc.html) | Phone run chat and approval | Canvas review — revision 1 | No | Source gaps recorded below; no app changes |
| 04 | [Preview.dc.html](Preview.dc.html) | Preview before deploy | Not reviewed | No | Not assessed |
| 05 | [Screen.dc.html](Screen.dc.html) | Landscape PC screen | Not reviewed | No | Not assessed |
| 06 | [PhoneNotify.dc.html](PhoneNotify.dc.html) | Phone notifications | Not reviewed | No | Not assessed |
| 07 | [PhoneQuestion.dc.html](PhoneQuestion.dc.html) | Phone agent question | Not reviewed | No | Not assessed |
| 08 | [PhoneShare.dc.html](PhoneShare.dc.html) | Share into Cellar | Not reviewed | No | Not assessed |
| 09 | [PhoneRace.dc.html](PhoneRace.dc.html) | Compare competing runs | Not reviewed | No | Not assessed |
| 10 | [PhoneNight.dc.html](PhoneNight.dc.html) | Night shift digest | Not reviewed | No | Not assessed |
| 11 | [DeskHome.dc.html](DeskHome.dc.html) | Desktop control center | Not reviewed | No | Not assessed |
| 12 | [DeskChat.dc.html](DeskChat.dc.html) | Desktop chat | Not reviewed | No | Not assessed |
| 13 | [DeskProjects.dc.html](DeskProjects.dc.html) | Desktop project board | Not reviewed | No | Not assessed |
| 14 | [DeskPhone.dc.html](DeskPhone.dc.html) | Attached phone over ADB | Not reviewed | No | Not assessed |
| 15 | [QuestionCard.dc.html](QuestionCard.dc.html) | Shared question states | Not reviewed | No | Not assessed |
| 16 | [DeskUsage.dc.html](DeskUsage.dc.html) | Usage and accounts | Not reviewed | No | Not assessed |
| 17 | [DeskRecipes.dc.html](DeskRecipes.dc.html) | Recipes and rules | Not reviewed | No | Not assessed |
| 18 | [DeskHosts.dc.html](DeskHosts.dc.html) | Hosts and routing | Not reviewed | No | Not assessed |
| 19 | [DeskGroupRun.dc.html](DeskGroupRun.dc.html) | Runs across projects | Not reviewed | No | Not assessed |
| 20 | [Map.dc.html](Map.dc.html) | Structure reference | Not reviewed | No | Not assessed |
| 21 | [Keys.dc.html](Keys.dc.html) | Keys reference | Not reviewed | No | Not assessed |
| 22 | [Notes.dc.html](Notes.dc.html) | Agent orchestration reference | Not reviewed | No | Not assessed |

Supporting canvas files:

| File | Role | Review handling |
| --- | --- | --- |
| `updates.md` | This review log and resume checkpoint | Update throughout the review |
| `canvas.json` | Board order, dimensions, titles and logic notes | Reconcile notes when approved behavior changes |
| `ds/ping-f543d9/styles.css` | Shared stylesheet root and component vocabulary | Cross-page consistency reference |
| `ds/ping-f543d9/_ds_bundle.css` | Bundled utility styles | Cross-page consistency reference |
| `ds/ping-f543d9/_ds_bundle.js` | Design bundle namespace | Supporting asset; not a screen |
| `ds/ping-f543d9/tokens/theme-dark.css` | Dark theme | Token reference |
| `ds/ping-f543d9/tokens/theme-light.css` | Light theme | Check when revising shared surfaces |
| `ds/ping-f543d9/tokens/accents.css` | App accents | Preserve Cellar accent |
| `ds/ping-f543d9/tokens/palette.css` | Media/status palette | Preserve consistent semantic colors |
| `ds/ping-f543d9/tokens/type.css` | Typography | Shared type reference |
| `ds/ping-f543d9/tokens/space.css` | Spacing | Shared spacing reference |

## Context and coherence rules

- Reviewed context: `README.md`, `structure.md`, `screens.md`, `keys.md`, `TASKS.md`, `t3code-notes.md`; also `desktop/README.md` and workspace/app `CLAUDE.md`.
- Appearance comes from the canvas and Ping design language; behavior comes from the written desk spec. Record and reconcile contradictions explicitly.
- `TASKS.md`: V1–V16 and M1–M5 are marked done. W1–W19 remain unchecked; W20 (SSH hosts) is deferred until the server exists. This is the build ledger, not proof that every current behavior is absent: an earlier desktop implementation already provides basic starts, runs, stops, LAN previews, view-only screen and APK delivery.
- Preserve dark Ping surfaces, Cellar accent, floating phone islands and the shared desktop sidebar. Use existing tokens rather than introducing a separate desk style.
- Use the same run labels, question cards, commands and permission language on phone, desktop, inbox and entry views.
- All names and projects on the boards are examples. Designs must support another user's hosts/projects, long names and empty setups.
- Sample mode must be visibly distinguishable from real data. Never infer that a working-looking sample control has real wiring.
- Remote SSH hosts stay deferred; do not turn this review into their implementation.
- When an approved change affects existing Cellar features, list those dependencies too, including entry questions and MCP tools where relevant.

## 01 — Main.dc.html — phone desk home

**Status:** Confirmed. **User approval:** revision 5 accepted by the user's explicit request to move to the next page. **Implementation:** pending. Do not reopen Main automatically.

Browser preview: [open phone desk canvas](http://127.0.0.1:8123/Main.dc.html).

Preview note: the export references `support.js`, which is absent from this folder. A temporary local adapter renders Main's own sample-state bindings and project-chip selection. It serves the original canvas/CSS without editing them; this is a design preview, not the running app. The adapter is outside the repository at `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/desk-canvas-preview.cjs`. If the server has stopped, run `node` with that path. Its template support must be checked/extended as later boards are opened. Static canvas actions do not perform agent work or deployments.

### What already works in the design

- Clear title, quiet host card and recognizable command tiles.
- Waiting → running → lately groups give a useful reading order.
- Waiting rows are raised; state text accompanies color.
- Shared bottom islands keep Cellar navigation familiar. The host/settings actions already use 44px targets.

### Proposed additions/changes — selection recorded below

| ID | Priority | Proposal | Why / relationship to other pages |
| --- | --- | --- | --- |
| MAIN-01 | High | Move **waiting on you** directly below the header, before host telemetry and commands, when anything needs a decision. Add a compact count and distinguish **approval** from **question** in each row; opening a row still leads to the run/entry context. | Blockers currently sit below two large sections. Align phone priority with desktop home and the shared inbox. |
| MAIN-02 | High | Label project chips **commands for**. Add separate run scope **all projects / selected project**, with counts. Do not silently make command selection filter runs. | On the canvas, selecting Cellar commands still shows Solar history. The current relationship is ambiguous; preserve global blockers by default. |
| MAIN-03 | High | Design explicit host states: **checking**, **connected**, **unreachable**, **not paired**, plus **last updated** for heartbeat snapshots. Keep an unavailable screen action visible with a short reason and retry/pair action. CPU/memory remain optional secondary detail. | A recent heartbeat is not a live screen connection. A vanished action gives no explanation. State treatment should match Hosts, Preview and Screen. |
| MAIN-04 | Medium | Add a visible **new task** label/action near the title or as a compact row; retain the left plus island. Use the same wording as NewTask and desktop hand-off. | An icon-only plus is harder to discover on first use. Keep navigation geometry intact. |
| MAIN-05 | Medium | Show compact command state: ready, running, failed or unavailable, with last result. Explain unavailable commands; show a **sample** marker in sample mode. Have **deploy** open the preview/check context rather than looking identical to rebuild. | Command tiles currently imply the same immediate behavior. This should stay consistent with Commands and Preview; real jobs remain W2/W11 work. |
| MAIN-06 | Medium | Add alternative artboard states for first pairing, no projects, no runs, failed loading and lost connection. Offer one useful action per state: pair PC, link project, create task or retry. Keep the last known runs visible but marked stale when possible. | The board only shows a busy successful setup. These states are needed for everyday use and first setup, without pretending data is live. |
| MAIN-07 | Medium | Improve dense row readability: allow waiting reason two lines; keep project/agent readable and move branch/path into details when space is tight. Normalize **running/doing** wording across headings/chips. Give project chips at least 44px hit areas while retaining their compact visual treatment. | Essential reasons and metadata are currently truncated. The chip's 36px visual height is smaller than nearby 44px actions. Keep the existing type tokens rather than shrinking text. |

User selected **MAIN-01, MAIN-02, MAIN-03, MAIN-06, MAIN-07**, and **MAIN-04 with a correction**. The original MAIN-04 wording is retained above for history: do not add a duplicate mobile new-task label/action. Keep the existing chat-plus island; reconcile the canvas's plain plus with that glyph and specify the correct opening behavior after Q4. Desktop already has a labelled `ScreenAction`; any further desktop changes belong to its own review. **MAIN-05 was not selected**; no command-state/deploy-flow redesign in this revision.

**Revision 2 correction overrides the original MAIN-06 stale-data suggestion:** do not show PC data while disconnected. Hide runs, waiting items/counts, metrics, project commands, paths and build history until available. Distinguish a verified connected PC whose run endpoint failed from an actual lost connection. The historical proposal above is not the current behavior contract.

### Implementation gaps versus the current canvas

Source-verified findings, not a live app visual audit:

| ID | Current implementation | Canvas/spec target and missing part | Evidence / follow-up |
| --- | --- | --- | --- |
| MAIN-G01 | Header counts both waiting and running cards as agents at work. It also adds blocked-entry count to waiting. Desk island and desktop chat badge use only blocked entries. | One coherent count across header, navigation and decision list. An approval should not count as a currently working agent; blocked entries counted in the summary need a discoverable destination. | `src/features/desk/useDeskHome.ts` (`live` and `summary`), `useDeskWaiting.ts`, `src/components/layout/NavIslands.tsx`, `DesktopSidebar.tsx`; W1. |
| MAIN-G02 | Project chips, command tiles and last-build meta exist only in sample mode. Preview opens the sample page; other tiles show an explanatory toast. | Real per-project commands and last command/build outcomes. | `useDeskHome.ts`, `src/components/desk/DeskCommandTiles.tsx`; W2/W11. |
| MAIN-G03 | CPU, memory and slots are sample figures. Real host info has no resource metrics or latency. Connection copy describes bridge/LAN/Cellar fallback; it does not report the canvas's Tailscale latency. | Host figures and measured connection detail, when the host supplies them. Preserve the existing LAN-first/fallback decision; the canvas's Tailscale sample is not proof of implemented transport. | `DeskHostCard.tsx`, `useDeskHome.ts`, `src/lib/deskProtocol.ts` (`DeskInfo`), `src/lib/deskLink.ts`, `desktop/README.md`. |
| MAIN-G04 | Real run cards include project, agent and age; waiting detail is only `needs you at the pc`, running detail is null. Branch, current tool/action and colored diff are present in sample rows only. | Actual branch/worktree, requested command/current activity and diff totals like the canvas rows. | `useDeskRunCards.ts`, `src/lib/deskProtocol.ts` (`DeskRun`), `DeskRunCardRow.tsx`; W5/W6/W8/W14. |
| MAIN-G05 | Screen button is omitted when the local screen is unavailable. Existing screen is LAN-only and view-only. | Canvas suggests a screen reachable over its shown tailnet connection. Clear unavailable explanation and eventual screen transport/control remain needed. | `DeskHostCard.tsx`, `useDeskHome.ts`, `src/lib/deskLink.ts`; W18. |
| MAIN-G06 | `useDeskRuns` exposes `snapshotAt`, but the phone home does not display that freshness. Host summary can say awake from a recent heartbeat. | Show the actual connection and freshness. Revision 2 hides PC content/counts while disconnected or connecting and distinguishes connected run-load failure; a recent heartbeat must not imply a live desk. App behavior still requires implementation and live verification. | `useDeskRuns.ts`, `useDeskHome.ts`, `src/app/(tabs)/desk.tsx`; W7 for eventual live stream. |
| MAIN-G07 | User reports the mobile chat-plus opens short and expands when the keyboard hides. Source already uses `MessageSquarePlus`, pushes `/desk/new`, and registers that route as a sliding transparent modal. Without attached entries, its task project starts unselected instead of inheriting the commands project. | Preserve the chat-plus glyph and open tall immediately, keeping the same height contract across keyboard show/hide. Project inheritance and return scroll behavior remain candidates for NewTask review. Source routing alone does not explain the reported symptom. | `src/components/layout/navActions.tsx`, `src/app/_layout.tsx`, `src/app/desk/new.tsx`, `src/features/desk/useNewTask.ts`, `src/components/desk/DeskSheet.tsx`; Q4/Q4b answered. No app fix yet. |
| MAIN-G08 | Phone home still renders “your desk” with a separate named `DeskHostCard`. | Revision 4 moves paired PC identity/icon into the header, adds connection state beside global activity counts and compacts the host panel without duplicating identity/state. This layout remains a canvas change awaiting eventual app work. | `src/app/(tabs)/desk.tsx`, `src/components/desk/DeskHostCard.tsx`, `src/features/desk/useDeskHome.ts`; preserve unavailable-data rules and measured touch targets when implementing. |

Known intentional differences, not automatic defects:

- App adds pairing, “more on the desk,” local pages/builds and forget-PC sections below the run list. Preserve their working paths; decide where they belong before hiding/moving them.
- Sample mode is off by default; real commands/telemetry are omitted until available. This follows `TASKS.md` and should not be replaced with invented real values.
- Existing basic starts and stops work through the old desktop transport; this does not imply W4's complete task payload/idempotency or W8's actionable runtime approvals are done.
- M2 records intentional shared-Ping differences: muted inactive chip labels and theme-aware raised backgrounds. Exact canvas hex matching should not silently override those family decisions.

### Questions and answers

Questions presented after proposal selection; answers recorded below. Q5 was answered in free text, overriding both offered choices.

| Question | Related proposals | Question / recommended choice | User answer |
| --- | --- | --- | --- |
| Q1 | MAIN-01 | How should waiting items be answered? | **A:** open run/entry to answer; show entry questions and approvals together. |
| Q2 | MAIN-02 | How should project filtering affect runs? | **A:** all projects by default; filter working/history; blockers stay global. |
| Q3 | MAIN-03/06 | Which host details stay visible? | **A:** name, connection, freshness and slots; expand CPU/memory on tap. |
| Q4 | MAIN-04 amended | What opens incorrectly? | **B:** sheet size, position or animation. Q4b clarifies the symptom below. |
| Q5 | MAIN-07 | Shared word for heading and chip? | **Free text: working.** Use working across later boards/components when reviewed/implemented; internal protocol `running` remains unchanged. |
| Q4b | MAIN-04 amended | Which sheet-opening problem? | User: “opens short, and expands on keybord hideing, should be the other way around or always the tall version”. Revision uses the user's allowed **always-tall** alternative: open tall immediately; keyboard appearance reduces visible body, hiding restores the same height. |

MAIN-06 empty/error states use the already selected recovery proposals (pair PC, link project, create task, retry); additional questions only if answers above introduce an unresolved choice. MAIN-07 preserves type tokens, gives waiting reasons two lines, prioritizes project/agent over branch/path, and uses 44px chip hit areas; no extra question needed for those selected details.

#### Lettered choices requested by the user

Historical option mapping; answers are recorded in the table above.

- **Q1 — Waiting items:** A. Open run/entry to answer; show entry questions and approvals together (recommended). B. Answer both inline on home. C. Open questions; answer approvals inline. D. Show only run approvals on home; keep entry questions in inbox.
- **Q2 — Run scope:** A. All projects by default; filter running/history; blockers stay global (recommended). B. Selected project by default; blockers stay global. C. Selected project filters everything, including blockers. D. No run filter; chips change commands only.
- **Q3 — Host telemetry:** A. Name, connection, freshness and slots visible; expand CPU/memory on tap (recommended). B. Keep all telemetry visible. C. Put CPU/memory and slots on a separate host-details view. D. Show slots but omit CPU/memory from home entirely.
- **Q4 — Incorrect chat-plus opening:** A. Wrong screen or destination. B. Sheet size, position or animation is wrong. C. Keyboard, scrolling or controls behave incorrectly. D. Selected project is missing or wrong. This is a symptom question, with no assumed diagnosis; the user can describe another symptom or several in free text. Intended opening/return behavior may need a follow-up after the symptom is known.
- **Q5 — Shared run wording:** A. Running (recommended). B. Doing.

Do not ask these again. Selected-project inheritance and close/back scroll restoration were suggestions bundled into the original Q4; selecting the symptom did not approve them. Keep those as candidates for NewTask's review, not settled requirements.

| Date | Proposal IDs | User decision / answer | Result |
| --- | --- | --- | --- |
| 2026-10-10 | All MAIN proposals | Initial proposals presented | No canvas changes |
| 2026-10-10 | MAIN-01, 02, 03, 04, 06, 07 | User: “1, 2, 3, 4 (the plus on mobile is placed inside of a chat icon so speaks for itself, but opens incorrectly), 6, 7” | Selection accepted. MAIN-04 amended; preserve chat-plus, clarify incorrect opening. MAIN-05 not selected. Q1–Q5 awaiting answers. |
| 2026-10-10 | Q1–Q5 | A, A, A, B; Q5 free text “working” | Behavior recorded; sheet symptom needed one follow-up. |
| 2026-10-10 | Q4b | Opens short and expands when keyboard hides; user allows reversing that or always tall | Always-tall contract chosen within allowed alternatives. App bug remains unimplemented. |
| 2026-10-10 | Main revision 1 | User returned the canvas: missing side padding, buttons need improvement, disconnected PC must not keep showing data; self-check before asking for review | Revision 2 corrects spacing, button geometry and data availability. Mandatory visual/behavioral self-review added to this request and workflow. Main remains unconfirmed. |
| 2026-10-10 | Main revision 2 | User: “remove the new task button its repetetive and the on page quick actions make the button full width and less reounded corners as they are the main option” | Revision 3 removes the duplicate empty-state new-task CTA, retaining the chat-plus navigation action. Pair PC, link project, reconnect and retry fill their content container and use the control radius. Main remains unconfirmed. |
| 2026-10-10 | Main revision 3 | User: “when pc is connected move the name of the pc onto the your desk text along with the icon to make the info panel take up less space with the state (connected/reconnecting/ect) under it next to the working count to be quicker to notice” | Revision 4 moves PC identity into the page title and connection state beside global activity counts. The compact host panel retains slots, screen, route/freshness and expandable metrics. Main remains unconfirmed. |
| 2026-10-10 | Main revision 4 | User: “decrease the page top padding to a normal ammount” | Revision 5 removes the unused 40px simulated status-bar inset. The canvas header begins 16px below the artboard top. Actual device safe-area handling remains an implementation requirement. Main remains unconfirmed. |
| 2026-10-10 | Main revision 5 | User: “lets move on to the next page” | Canvas accepted; mark Main Confirmed and open NewTask. Earlier pending/unconfirmed statements below are historical revision records. App implementation remains pending. |

### Canvas revision and acceptance

- Revision: **5** — retains revision 4's PC header, compact panel, actions and data-availability rules; reduces canvas top content gap from 56px to 16px. Project command tiles retain their grid. Seven review states remain outside the product artboard and use sample data.
- User acceptance: **accepted on 2026-10-10**, through the explicit move-to-next-page request. Main is now skipped on resume unless requested or a later decision creates a recorded conflict.
- Changed files: `Main.dc.html`, `NewTask.dc.html` (opening-height contract only), `canvas.json` (Main and NewTask notes), `../screens.md`, this log. NewTask's full review remains pending; its small linked change does not count as acceptance of that page.
- MAIN-05 remains outside this revision: no new command result/status system or deploy flow. Availability treatment in connection-failure states belongs to approved MAIN-03/06.
- Main sample includes one working run, one waiting approval, one entry question and two recent runs; two slots are occupied. Header/desk badge use the same two blockers. The entry question has a separate destination from the approval.
- Revision 1 verification was insufficient: checking rendered content and interactions did not catch missing gutters or the misleading data model. Revision 1's capture is historical, not the accepted design.
- Revision 2 verification: visually inspected all seven states, including the busy/no-runs scroll ends and CPU/memory expansion. DOM measurements confirm 16px empty-state side padding, 44px chips/actions, 76px command tiles and no horizontal artboard overflow. At the busy scroll end, final card clears floating navigation by 10px. Solar command selection leaves all runs unchanged; Solar run filtering retains both global blockers and shows only its history. Reconnect enters connecting without PC data; retry runs keeps the verified PC connection while showing run-load progress. Not-paired, connecting and disconnected states contain no run totals/badge/metrics/commands/build metadata. No-runs and no-projects show genuine sample empty totals (0 of 4 slots); run-load error does not invent those totals. Review is on the fixed 390 × 844 canvas, not an on-device React Native test. JSON parsing and whitespace checks are recorded after the final document update. No app tests/build/deployment for this docs/canvas-only revision.
- Revision 2 captures: `main-review-v2-busy.png`, `main-review-v2-controls.png` and `main-review-v2-disconnected.png` in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`. Main is left open in the browser. Scroll inside the phone artboard to inspect commands, run filter, working and lately; the external review dropdown changes its sample state.
- Final file checks: `canvas.json` parses; `git diff --check` passes; this new review log has no trailing whitespace. Changes are limited to the canvas and desk docs; application source remains untouched.
- Implementation remains untouched. In particular, the tall static artboard does not prove a React Native keyboard/layout fix. Verify `DeskSheet` / `KeyboardAvoidingView` height measurement on-device when implementing; open before keyboard appears, then test keyboard show/hide and footer visibility.
- Later coherence debt: use **working** in `Run`, `DeskHome`, `DeskChat`, notification boards and shared app `runChip` labels when those surfaces are reviewed/implemented. Do not silently mark those pages reviewed now.
- Related future reviews: `DeskHome`, `NewTask`, `Run`, `PhoneQuestion`, `QuestionCard`, `DeskHosts`, `Preview`, `Screen`, `Map`.
- Eventual implementation touchpoints: desk home hook/route, host and command cards, run grouping/cards, shared counts/navigation, decision links and inbox. Do not expand into all these implementations during the canvas review.

### Revision 2 self-audit findings

User feedback: “check your own output, there are places where there is no side padidng, butotns could be nicer, or just the general idea of pc dissconnected and data still shown makes no sense, really analyze what you output, check it yourself before asking me to check, add that note to updates also”.

| Finding | Cause / correction | Verification |
| --- | --- | --- |
| Empty states lost side padding | `.empty` used `padding:16px 0`, overriding `px-4`. Use block-axis padding so the 16px horizontal gutters remain. | No-projects and no-runs inspected visually; computed side padding is 16px. |
| Phone content had uneven available width | Native scrollbar consumed 15px inside the artboard. Hide scrollbar chrome while retaining scrolling and keyboard access. | Both sides align at 16px; no horizontal content overflow. |
| Buttons and links looked inconsistent | Native button defaults differed from anchors; normalize padding, box sizing, icon dimensions, border/radius and hover/pressed/focus states. Use clear primary recovery CTA; outline command tiles consistently. | Pair/link/new-task/retry/reconnect inspected; action/chip targets 44px, command tiles 76px. |
| Run scope looked like a second project-chip strip | Use a two-part segmented control for all projects versus the selected commands project. | Both selection states inspected; counts/filter behavior verified. |
| Disconnected PC retained busy runs and metrics | Remove snapshot reuse from disconnected state; hide all PC content and blockers/counts, retain host identity/recovery and local Cellar navigation. | Disconnected and reconnecting screenshots/DOM contain no PC data. |
| Run error and lost connection were conflated | Model run-loading failure only with a separately verified connection. Hide unavailable run data/metrics; preserve independent screen/command availability. Retry reloads runs, reconnect reloads the connection. | Both actions inspected; no false zero counts or restored busy data. |
| Last content could sit behind navigation | Reserve navigation space plus bottom padding; preserve scrolling and keyboard access. | Busy last card is 10px above navigation at scroll end; no-runs CTA fully reachable. |

Carry-forward rule: complete this self-audit on every later board before asking the user to review. Screenshots must support the visual claims. No page is confirmed by self-review alone.

### Revision 3 action-layout correction

- Remove the extra new-task button from both the no-runs and filtered-empty states. Keep the existing chat-plus island as the task creation path; empty-state copy points to it.
- Pair PC, link project, reconnect and retry runs fill their content container width. Preserve 16px page gutters and host-card inner padding; full width does not mean edge-to-edge artboard width.
- Use the shared 8px control radius and a minimum height of 48px for these on-page actions. This makes each state's main action prominent without pill styling.
- Command tiles remain in their existing four-column grid; this correction concerns the main on-page recovery/empty-state buttons.
- Verification: visually checked no-runs, filtered-empty, unpaired, no-projects, disconnected and connected run-error views. No-runs/filtered-empty contain no extra task CTA; exactly one task link remains in navigation. Pair/link/reconnect/retry fill their container, use 8px corners and 48px height; the outer-page link/retry buttons measure 358px across with 16px side gutters. Filtered-empty retains both global blockers, has no horizontal overflow and clears navigation by 10px at the scroll end. Retry and reconnect preserve revision 2's distinct state transitions. The unchanged connected command grid remains intact. JSON parsing and whitespace checks pass; application source is untouched.
- Captures: `main-review-v3-no-runs.png`, `main-review-v3-actions.png` and `main-review-v3-reconnect.png` in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`. Browser is left on no-projects to show the new primary-action shape. Use its state picker to inspect no-runs or disconnected. Main remains unconfirmed.

### Revision 4 compact PC header

- Replace "your desk" with the paired PC name and monitor icon. Keep that target name during reconnecting/disconnected states; before pairing, keep the generic title.
- Put connection state and its status dot immediately below the title, beside global working/waiting counts. Only show counts when run data is available; run-load errors keep "connected" with "run data unavailable", while disconnected/connecting/reconnecting show no invented totals.
- A reconnect action displays "reconnecting…" in the same header position. The review picker’s connecting state remains the initial connection example.
- Remove PC name/icon and connection-state repetition from the host panel. Show slots beside the 44px screen action, a quiet route/latency/freshness line and expandable CPU/memory. Connected error and offline recovery panels retain their available information/actions.
- Preserve 16px gutters, full-width recovery actions, global blockers and separate run scope. Long PC names truncate with their full text retained in the heading/title attribute; status can wrap instead of overflowing.
- Verification: visually inspected all seven review states, plus CPU/memory expansion and the reconnect transition. Busy header reads “connected · 1 working · 2 waiting on you”; project/run filtering leaves those global counts and both blockers intact. Empty connected states show 0 working; run error omits totals; connecting/reconnecting/disconnected omit PC data. Header remains 58px high; collapsed connected host panel measures 148px, contains no repeated PC name and preserves 44px screen/metrics targets. Side gutters remain 16px, no horizontal artboard overflow, and the busy scroll-end card clears navigation by 10px. Unpaired title remains “your desk”. Retry preserves connected state; reconnect shows “reconnecting…” under the paired name. Application source remains unchanged.
- Captures: `main-review-v4-header.png` and `main-review-v4-reconnecting.png` in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`. Browser is left on busy, scrolled to the new header. Main remains unconfirmed.

### Revision 5 top spacing

- Remove the unused 40px simulated safe-area inset from Main's browser canvas. The shared 8px screen padding plus 8px header padding now gives 16px above the header content.
- For eventual app implementation, retain actual OS safe-area handling and use 16px content spacing after it; do not replace real device insets with zero.
- Verification: visually checked busy, no-runs and unpaired views. Header content starts 16px below the artboard top; settings stays 44px high; busy has no horizontal overflow. This shared spacing rule applies to every Main review state. No interaction/data rules changed; app source untouched. JSON/whitespace checks pass.
- Capture: `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/main-review-v5-top-spacing.png`. Browser remains on busy at the top. Main remains unconfirmed.

## 02 — NewTask.dc.html — phone new task sheet

**Status:** Confirmed — revision 2. **User selection:** NEW-01–NEW-07 plus direct NEW-R2 correction. All A answers stay except NEW-R2 supersedes batching/count/run-list behavior on this page. **Canvas acceptance:** user said “next” on 2026-10-10. Skip Main and NewTask on resume; current page is Run. App implementation remains pending.

Browser: [open NewTask canvas](http://127.0.0.1:8123/NewTask.dc.html). Source comparison is read-only, not an on-device app audit. Review uses the design-critique workflow already applied to Main.

### Evidence and what works

- Inspected the top and entire scroll body, plus project/workspace/mode selections and inert type/clear/detach controls. Sheet is 784px tall on the 390 × 844 board; footer stays pinned while the body scrolls.
- Voice → project → workspace → agent/mode → attached thoughts is a understandable task setup order. Selected options have a visible accent and modes have explanatory copy.
- The canvas always starts in its sample listening state. Its transcript is a paragraph, not an input. Type, clear and detach have no handlers; microphone/project/workspace/agent/mode selections are the actual sample bindings. The send link navigates to Run and does not start work.
- Selecting Solar leaves `~/code/cellar` and `wt/inbox-swipe-2 off main` unchanged. Selecting main checkout plus full access still says “in its own worktree”. These are canvas defects, not acceptable requirements to carry into the app.
- Project/agent chips measure 36px high; detach is 32 × 32px. Other voice controls are 48/76px; permission options are 44px. Body has 16px padding, but its native 15px scrollbar makes visible right alignment narrower than the footer. Header/host identity scrolls away with the form; no explicit close control appears.
- Read `NewTask.dc.html`, related `screens.md`, `keys.md` and TASKS V6/M2/W4/W5/W8/W12/W15; `new.tsx`, `useNewTask`, `NewTaskVoice`, `NewTaskChoices`, `AttachedThought`, `DeskSheet`, `TrustAsk`, `deskTask`, `deskStart`, `deskProtocol`, `useDeskStart`, defaults/handoff and agent launch code.
- Captures: `new-task-review-baseline.png` and `new-task-review-baseline-bottom.png` in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`. Browser is left at the top with the original selections restored.

### Proposed additions/changes — select before revising

| ID | Priority | Proposal | Reason / scope |
| --- | --- | --- | --- |
| NEW-01 | High | Carry Main's coherent styling into the sheet: current PC header/status in the dimmed background, balanced gutters without scrollbar width loss, full-width send with 8px corners, 44px chip/detach targets. Keep the sheet title/target visible while scrolling and add an explicit 44px close action. | Main is now confirmed; NewTask still repeats its old title/counts, has a pill send button and smaller hit areas. Preserve the already settled always-tall opening. |
| NEW-02 | High | Make the transcript genuinely editable in the canvas. Make type, clear and mic states understandable/interactive; show typing, listening, stopped, transcribing and unavailable/denied voice states. Decide whether voice or typing starts first rather than presenting a permanent sample recording as the only flow. | Typing is already the app's working path. The large voice block occupies much of the visible form; a fake cursor and active waveform imply capability the preview does not have. Prototype voice remains a simulation. |
| NEW-03 | High | Define launch-context/default precedence: attached thought's project, selected Main commands project or an explicit selection; show where agent/mode defaults came from. Update project-dependent paths and defaults while preserving choices the user deliberately overrides. | NewTask currently defaults to Cellar in the canvas but starts unselected in the app without an attachment. Project/recipe default behavior is written but not wired. Main selection inheritance was previously only a candidate, not approved. |
| NEW-04 | High | Bind checkout path/worktree preview to the selected project; make base branch and proposed new branch readable. Keep workspace choice separate from permission level; explain unavailable worktree creation. | Solar currently displays Cellar paths. Full access must not imply a new worktree when main checkout is chosen. Actual worktrees remain W5 work. |
| NEW-05 | High | Make permission hints truthful and consistent across agents: explain file edits versus commands/installs, without promising that nothing will ever ask or that a worktree guarantees isolation. Include a host-capability state when the selected mode cannot be enforced. | App shows mode choices but the current start payload does not carry a mode. The canvas's “nothing pings you” / “own worktree” copy is too absolute and conflates two independent choices. No permission changes are being made during this design review. |
| NEW-06 | High | Design valid/blocked/sending/sent/error/retry states with a useful recovery action. Preserve the draft when disconnected or a send fails; show project/agent/workspace/mode summary near send. Define successful destination and ambiguous-send handling around one stable command ID. | Canvas always offers an active Run link. App has basic blockers, inline failure and folder-trust UI, but no complete receipt/idempotency contract. Do not introduce a second confirmation for every ordinary send. |
| NEW-07 | Medium | Show no/one/multiple attached thoughts; allow removal and adding context deliberately. Match the app's one run / one run each option for multiple thoughts, with run count near send. Handle long titles and project mismatches clearly. | Canvas always includes one thought and detach is inert. The app already supports detaching and multiple thoughts/splitting, so the canvas must catch up rather than remove that working behavior. |

### Implementation gaps and existing behavior

| ID | Source-verified current behavior | Missing target / follow-up |
| --- | --- | --- |
| NEW-G01 | `NewTaskVoice` uses an editable auto-focused TextInput; type focuses it and clear empties it. Mic is a non-interactive visual with “comes soon” copy. | Real speech/transcription, keyboard/mic primary-role swapping and voice state handling remain W12. Typing/clear already work in the app. Revised canvas restores the original centered input and circular controls, with the waveform above it only in voice mode. Inline colored chips are absent from the app's plain TextInput. |
| NEW-G02 | `DeskSheet` uses 93% height on an absolute KeyboardAvoidingView; body scrolls, footer is pinned, backdrop closes; desktop width is capped at 560px. | User-reported short opening/expansion after keyboard hides remains unfixed. Always-tall behavior was already approved in Main Q4b; test keyboard show/hide and footer visibility on-device during implementation. Explicit visible close and updated send styling are not implemented. |
| NEW-G03 | `useNewTask` inherits the first handed thought's project; otherwise selection is null. Agent/mode start from shared desk preferences, with installed-agent fallback. | Does not inherit Main's selected commands project or implement project/entry-kind recipe defaults. `deskPrefs` already stores the commands project, so implementation should follow accepted NEW-Q2 precedence. W15 covers recipes. |
| NEW-G04 | New worktree is disabled; actual launches use the project's checkout. `DeskStart` carries agent/prompt/cwd/name/one entryId. It has no workspace or mode field. | Worktree creation and full task payload remain W4/W5. Do not present new-worktree selection as working today. |
| NEW-G05 | Mode choices and their hints are enabled, but `deskStartFrom` omits mode; existing host agent launches use their own fixed auto/review/accept-edits behavior. | Selected ask/edits/full setting is not enforced by these launches. W8 must map host capabilities and implement runtime approvals before the screen promises the selected behavior. |
| NEW-G06 | Blank prompt, missing project folder, unavailable start and busy state block send. Inline errors and Claude folder trust exist. On successful start, sheet closes and returns to the prior screen. | Canvas/spec receipt ID is absent from `DeskStart`; safe retry after an unknown outcome and partial multiple-run success are not covered by a durable receipt contract. W4 pending. Accepted target is confirmed start → Run chat (NEW-Q5/NEW-R2). NewTask is now single-run; partial-batch recovery belongs to separately reviewed batch flows. |
| NEW-G07 | Attachments can be detached. Several thoughts can go to one run or one each; one combined run binds the first entry and includes pickup instructions for the rest. | Revised canvas supports add/detach and compatible thoughts as context for one task. App has no add-thought picker here and still exposes split starts; NEW-R2 removes split controls from this page. Existing batch capabilities elsewhere are not removed by this review. |

### Decisions and next step

- User selected all seven proposals on 2026-10-10: “1. 2\\. 3. 4. 5. 6. 7”. Selection approves NEW-01–NEW-07, not the unrevised canvas or app implementation. NEW-Q1–NEW-Q7 below were answered A and applied in revision 1.
- Do not re-ask the tall-opening question. It is already approved; canvas height alone does not prove the app bug is fixed.
- Do not apply unrelated Main changes or mark NewTask accepted until its revised canvas is reviewed. Update relevant docs/notes after selected decisions, then self-check all revised states before asking for review.
- No app edits, microphone recording, deployment or run starts during this review. UI comments that describe a planned capability are not evidence that it works; actual payload/handlers and task ledger are the comparison basis.

### Questions and answers — NewTask

User answered **A to all seven questions** on 2026-10-10. The A choices below are accepted behavior; B–D remain historical alternatives. These are design decisions, not changes to runtime permissions or an agent start.

| ID | Related proposals | Question and lettered choices | Answer |
| --- | --- | --- | --- |
| NEW-Q1 | NEW-02 | **How should the composer start?** A. Typing first; open the keyboard, mic on tap (recommended). B. Start listening automatically when microphone permission already exists; otherwise show the choice. C. Remember the last typing/voice mode. D. Show an explicit type/speak choice on every open. Desktop typing focuses its field. | **A — accepted 2026-10-10.** Composer styling refined by NEW-R2 below. |
| NEW-Q2 | NEW-03 | **Which project should a task start with?** A. Attached thoughts' project → Main commands project → explicit choice (recommended). B. Attached thoughts' project → explicit choice. C. Attached thoughts' project → last task project → explicit choice. D. Always ask, including tasks opened from a thought. Mixed-project attachments follow NEW-Q7. | **A — accepted 2026-10-10.** |
| NEW-Q3 | NEW-03/05 | **Where should initial agent and permission defaults come from?** A. Project override → thought-kind recipe → global settings (recommended). B. Thought-kind recipe → project override → global settings. C. Global settings only. D. Last-used choices per project. Preserve deliberate user overrides when switching project for all options. | **A — accepted 2026-10-10.** |
| NEW-Q4 | NEW-04 | **Which workspace should be selected initially?** A. New worktree from the project's default branch; unsupported hosts require an explicit checkout choice (recommended). B. Main checkout; worktree only when selected. C. Project preference, otherwise new worktree. D. Last-used workspace per project. Paths/base branch must follow the selected project for every option; no silent worktree-to-checkout fallback. | **A — accepted 2026-10-10.** |
| NEW-Q5 | NEW-06 | **After the host confirms a successful start, where should the user go?** A. Open one run's chat; multiple starts open a started-runs list (recommended). B. Return to the originating screen with a sent result. C. Keep the sheet on a receipt with an Open run action. D. Always open Main with the new runs highlighted. | **A — accepted 2026-10-10.** NEW-R2 limits this page to one run; no batch list here. |
| NEW-Q6 | NEW-02/06 | **What happens when closing an unsent draft?** A. Autosave; reopening offers Resume draft / New task (recommended). B. Closing discards, with confirmation when content exists. C. Autosave and resume immediately on reopen. D. Ask Save draft / Discard on close. A new handoff must not silently overwrite an existing draft. | **A — accepted 2026-10-10.** |
| NEW-Q7 | NEW-07 | **How should several attached thoughts be grouped?** A. Selected project only, one run by default; resolve mismatched projects before sending (recommended). B. One run per project, allowing mixed projects. C. One run per thought, using each thought's own project. D. Ask how to group every multi-thought handoff; mixed projects must first be resolved. Retain the existing one run / one run each choice for compatible thoughts. | **A — accepted 2026-10-10.** Superseded by NEW-R2: multiple thoughts become context for one run; no split controls here. |

NEW-01 uses already agreed Main geometry without another styling question. Unsupported permission modes will be clearly unavailable, with no silent substitution. Send errors retain the draft; unknown outcomes use the same command ID and a receipt check. These follow the selected proposals rather than creating another approval prompt.

### Canvas revision 1 — ready for user review

Historical revision. The current composer and single-run behavior are specified in NEW-R2 below.

Applied NEW-01–NEW-07 and all seven A answers. **Canvas acceptance is still pending.**

- Typing opens first with focused editable field and phone keyboard. Voice begins on tap;
  sample transitions cover listening → transcribing → editable transcript, denied and unavailable.
  Clear works. Hex token preview does not pretend to be a native rich-text input.
- Sheet top stays at 60px with and without the keyboard. Title/target/close and send stay
  pinned around the scroll body. Body/footer use equal 16px gutters; product controls measure
  at least 44px. Send is full width, minimum 48px high, with 8px corners.
- Context and paths/default branch follow project selection. Defaults resolve per field from
  project → compatible kind recipe → global; explicit agent/mode overrides survive switches.
  New worktree starts selected. Unsupported worktrees/modes block sending until an explicit
  supported choice. Workspace and permissions remain independent.
- Picker lists the selected project's thoughts. Zero/one/many, detach and one run / one run each
  work; long titles wrap. Mixed projects show a reason and disable sending.
- Footer names project, agent, workspace, permission and run count. Empty/no-project, offline,
  unavailable choices, recording/transcription, sending, rejection and unknown outcome have
  separate states. Offline background hides activity; choices are labelled saved context that
  requires reconnection to verify.
- Canvas browser storage autosaves edits. Reopening offers Resume draft / New task; incoming
  context remains separate. Resume restores saved choices; New task explicitly replaces the
  draft while preserving the incoming project or attached thought.
- Rejection retains draft and start ID. Unknown outcome locks inputs and checks the original
  receipt with the same ID; separate checking copy does not imply another start. Confirmed
  single navigates to Run; confirmed split starts show their run list. Folder trust has its
  own visible panel with trust/start and back-to-draft recovery.
- External review controls offer 22 sample states, 320/390px phone and 560px desktop widths,
  keyboard preview and simulated host/transcript replies. Controls sit outside the product UI.
  Voice, host connection, worktrees, permission enforcement and starts remain simulations.

Linked confirmed-page change: NEW-Q2 requires Main chat-plus to pass the **commands project**
into NewTask's preview URL. Changed that route binding only; no Main visual changes or reopened
review. Main revision 5 stays confirmed. States without an available project pass no project.

Updated `screens.md` and NewTask's title/logic note in `canvas.json`. Implementation remains
untouched. Do not mark W4/W5/W8/W12/W15 or app visual/layout tasks complete from this canvas.

#### Self-review evidence and corrections

- Visually inspected all 22 selectable states, top and relevant scroll-end content, including
  voice fallback, project/workspace/mode blockers, drafts, trust and started runs.
- Fixed defects before user review: preview renderer replaced textarea during typing; preserved
  its node/caret. Fixed native width-picker selection in the renderer, 320px keyboard overflow,
  textarea scrollbar presentation, hidden trust recovery, offline/unsupported-mode wording,
  receipt-check wording, saved rejected outcomes, incoming-context loss and draft handling
  when closing confirmed starts.
- Typed multiple characters: exact text retained focus/caret. Tested paths/base branch,
  global/recipe/project defaults, explicit overrides across projects, checkout with full access,
  picker scope, detach recovery, split count, unsupported choices and send recovery.
- At 390px, sheet top **60px** both times; bottom **620px** with keyboard, **844px** after
  dismissal. Visible body changes by **224px**. Header/footer stay pinned; last content clears
  footer. At 320px, body scroll/client widths match (**318px**), keyboard widths match
  (**320px**) after correction, minimum product button height **44px**, send radius **8px**.
  At 560px body scroll/client widths match (**558px**); keyboard absent; layout visually checked.
- Main → Solar commands → chat-plus opened Solar with empty focused prompt and keyboard.
  Saved Radar draft survived incoming Solar context. Resume restored Radar; New task retained
  Solar. Separate incoming-thought example kept its attachment. No overwrite before choice.
- Retry and original-receipt check retained the same DOM-observable sample start ID. Sending/
  checking locked inputs. Known rejection survived close/resume. Confirmed single reached
  `Run.dc.html`; confirmed batch showed both run links. This checks sample navigation, not
  real host receipts or Run's unreviewed behavior.
- Reset browser sample drafts created for QA through the review control. Local preview renderer
  lives outside the repository in the visualization output directory.

Captures in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`:
`new-task-revision-1-ready.png`, `new-task-revision-1-thoughts.png`,
`new-task-revision-1-small-keyboard.png`, `new-task-revision-1-desktop.png`.

Limits: actual mobile keyboard/animation, microphone permission/transcription, host capabilities,
mode enforcement, worktrees, durable receipts and partial-batch recovery require implementation.
Actual app was not changed or tested on a device; existing source gaps remain authoritative.

Final validation: `canvas.json` parses; `git diff --check` passes. All four captures saved.
Browser left on NewTask revision 1, Ready state at 390px, with review controls visible.
User review/acceptance remains pending; do not advance to Run yet.

### NEW-R2 — restore the original composer; one task per sheet

**User direction — 2026-10-10:** “make the input part like it was before” with keyboard primary and voice beside it; clicking voice swaps their icons and adds the graphic above the input. Keep send stuck to the bottom. NewTask always sends one run, so remove the run count and run monitor from this page.

This direct instruction supersedes revision 1's boxed input, footer configuration/run summary, one-run-each option and started-runs list. NEW-Q1 still means typing first. NEW-Q5 now means one confirmed start opens Run chat. NEW-Q7 now means compatible attached thoughts become context for one task; no grouping control on this page. Existing batch capabilities elsewhere await their own page review.

Applied in **canvas revision 2**:

- Restored the original centered transcript appearance and inline hex-color chip. The transcript remains a real editable input rather than a static paragraph. Empty state uses “Describe a task…”.
- Keyboard is the 76px primary circular control; microphone is the 48px side control. Voice click moves keyboard to the side and makes the voice control primary: stop while listening, spinner while transcribing, mic when ready. Returning to typing hides the waveform and focuses the input. Clear resets to typing.
- The voice waveform appears above the input. Denied/unavailable voice retains keyboard recovery. Recording and transcription must finish before send becomes available.
- Send stays outside the scrolling options, pinned at the sheet bottom and above the phone keyboard. It is full width, 52px high, with 8px corners and “send to michu-pc” copy. Blocked/sending/error/unknown-outcome feedback remains there.
- Removed run count, split controls, footer configuration summary and started-runs monitor/list. Multiple compatible thoughts can still be attached or detached as context for one task. Host-confirmed success navigates directly to Run chat.
- Removed activity counts from the dimmed backdrop. Project/default/workspace/mode choices, draft protection, folder trust and receipt/error recovery remain intact.
- Updated `screens.md` and the NewTask logic note in `canvas.json`. App implementation remains pending; no build tasks were marked complete.

#### Revision 2 self-check before user review

- Compared the original baseline and revised screenshots. Inspected typing, listening, stopped, transcribing, denied/unavailable voice, narrow-phone keyboard and desktop views. Checked side spacing and footer clearance instead of relying only on DOM presence.
- Typed and appended text in the real editor: exact text, focus and caret survived state updates. Corrected the local preview renderer to preserve the contenteditable node/selection and synchronize its empty-placeholder attributes. Removed the boxed focus rectangle to retain the original transcript appearance; native caret remains visible.
- Verified mic/keyboard role swap, waveform position above the input, return-to-typing focus, denied/unavailable voice fallback, transcription completion and clear/placeholder behavior. Pending sends lock the editor and choices.
- At **320px**, body client/scroll widths both **318px**; sample keyboard client/scroll widths both **320px**. Primary/side controls measure **76/48px**. Send measures **286 × 52px** with equal side gutters; bottom stays **604px** before and after scrolling while keyboard starts at **620px**.
- Dismissing the keyboard leaves sheet top at **60px**, restores sheet bottom to **844px** and send bottom to **828px**. At **560px**, body client/scroll widths both **558px**; keyboard absent; waveform/input/control layout visually checked. At **390px**, final typing and voice screenshots checked.
- Saved two attached thoughts with custom text, closed/reopened and resumed: exact text and both attachments restored. Footer contained only send; no split control or Run-link list. Simulated host confirmation reached `Run.dc.html`, then returned to NewTask. This verifies preview navigation, not an actual PC start or Run's unreviewed behavior.
- Reset the canvas-only QA draft through the external review control. External controls now provide **21** sample states. Final browser state: revision 2, Ready, **390px**.

Captures in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`: `new-task-revision-2-ready.png` and `new-task-revision-2-voice.png`.

Validation: `canvas.json` parses and `git diff --check` passes. NewTask source is 196 lines. No app build is required for these canvas/docs changes.

Limits: keyboard rendering and voice/PC responses are simulations. Actual mobile animation/keyboard, speech, worktrees, permission enforcement and durable receipts still require implementation and device verification. **NewTask revision 2 is now confirmed by “next”; skip it and Main on resume. Current review is Run.**

### NewTask acceptance — 2026-10-10

User said **“next”** after revision 2. Mark NewTask revision 2 confirmed with NEW-R2 composer/single-run changes. Earlier pending-review statements above are historical. No app work was requested. Continue with Run; do not reopen Main or NewTask by default.

## 03 — Run.dc.html — phone run chat and approval

**Status:** Canvas review — revision 1, including RUN-R1a/R1b/R1c, self-checked and open for review. **User selection:** RUN-01–RUN-07, all approved on 2026-10-10. **Canvas acceptance:** pending. Main revision 5 and NewTask revision 2 stay confirmed; skip both on resume.

Browser: [open Run canvas](http://127.0.0.1:8123/Run.dc.html). Evidence below describes the original baseline unless stated otherwise. This compares sample behavior with source, not a running mobile app. The local preview adapter loads exported props and sample state; it lives outside the repository.

### Evidence and what works

- Approval sits in thumb reach: command, working folder and effect precede deny/allow. User bubbles, plain agent text and grouped tool activity establish a readable chat hierarchy.
- Inspected approval, allow-once, allow-for-run, deny and restored composer states. Decisions/dispatch toggle work as local sample state only. All decisions immediately switch the chip to “doing”; no submitting/host-confirmation/error/answered-elsewhere state exists.
- Approval panel begins at **506px**, while the last agent paragraph ends at **521px**, covering **15px** of it. Scroller is **844px** high with **320px** fixed bottom padding, yet scroll height is also **844px**, leaving no scroll recovery. Composer uses the same fixed padding despite a different dock height. This is a canvas defect; the app uses a separate flex footer.
- Header has a 56px top offset, compared with Main's settled 16px content gap after safe area. Agent paragraphs have actual 16px side padding; no missing-gutter defect there. Header lacks PC/connection and uses “doing”, contrary to accepted “working”.
- Stop/tool rows measure **36px** high; dispatch chips **34px**; scope action/key strip **40px**; diff link **36px**. Deny/allow are **52px**. Raise smaller actions to 44px while retaining compact hierarchy.
- Stop, tool expansion, mic and `@ $ /` have no handlers. Native input is unbound: switching dispatch erases typed text. No send action exists. Placeholder clips the skill hint on phone width.
- Diff pill points to `Preview.dc.html`, though docs describe changed files. Dump/projects/inbox/stats use placeholder hash links. Revised review states must distinguish those from completed navigation.
- Read `screens.md`, `keys.md`, `structure.md`, `TASKS.md` V7/W6–W13 and `t3code-notes.md`; route `desk/run/[id].tsx`, Run components/hooks, `useDeskRuns/useDeskLog`, `useDeskLink`, key components/hooks, `deskChat`, `deskView`, `deskProtocol`, host `runs` and API handlers.
- Baseline captures: `run-review-baseline-approval.png` and `run-review-baseline-composer.png` in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`. Browser restored to original approval state.

### Proposed additions/changes — select before revising

| ID | Priority | Proposal | Reason / scope |
| --- | --- | --- | --- |
| RUN-01 | High | Match confirmed pages: normal top gap/16px gutters, “working”, compact PC name + connection/freshness, 44px stop/diff/tool/dispatch/key targets, consistent less-rounded action buttons. Keep run identity/state reachable while reading. | Board retains older spacing, wording and pill actions; host connection is invisible. Compact-header behavior follows questions after selection. |
| RUN-02 | High | Use a flex chat scroll region above a measured approval/composer dock. Adapt dock/nav to keyboard. Follow new messages only when already at bottom; otherwise show New messages action. Verify full clearance at 320/390px and desktop chat-column width. | Fixed 320px padding hides the last message. App already separates its footer and follows the bottom; preserve those behaviors and add a return-to-newest action. |
| RUN-03 | High | Complete composer: keyboard-first editable multiline message, explicit primary Send, secondary mic with recording/transcription feedback, draft retained across dispatch changes, send pending/error/retry. Short placeholder; put key hints beside strip. | Canvas has active mic but no send. Keep Run's compact composer; NewTask's large centered capture controls belong to task setup. Exact arrangement follows questions. |
| RUN-04 | High | Explain steer versus queue; show queued messages with pending/accepted/failed status and edit/cancel before dispatch. Design follow-up after a run finishes. | Chip selection does not explain interruption or prove delivery. Default dispatch, steering semantics and finished-run continuation need user answers. |
| RUN-05 | High | Complete waiting panel for approvals and linked agent questions. Preserve command/impact; distinguish allow once from host-supported run scope. Add submitting/failed/expired/answered-elsewhere states. Host confirms result before progress is reported; draft survives waiting. | Current panel disappears instantly and claims execution. Main already groups questions/approvals; Run should open existing question context without duplicating its record. Broader scope must be supported/enforced by host. No runtime permission changes in this review. |
| RUN-06 | Medium | Expand tool rows to files/command output/edit details with running/success/failure status. Diff opens changed files; Preview offered separately when available. Prototype usable `@ $ /` suggestions/token effects; label unsupported searches. | Canvas expansion/keys are inert while several work in app. Diff currently opens Preview. Preserve grouped tools and shared key vocabulary. |
| RUN-07 | High | Truthful loading/no-output/done/failed/stopping/stopped/disconnected/reconnecting/missing-run/unsupported-action states. No live claims or unverified actions while disconnected; any retained transcript explicitly historical with last-received time. Stop shows pending/error, final state after host confirmation. | Board models only waiting then “doing”. Missing run must not default to done. Stop already works for supported Cellar-started runs. Offline history visibility remains a user question. |

### Implementation gaps and existing behavior

| ID | Source-verified current behavior | Missing target / follow-up |
| --- | --- | --- |
| RUN-G01 | `RunChatPane` has separate flex footer above nav/keyboard, hidden scrollbars and bottom-following that stops when reading earlier messages. Shared gutters exist. | Canvas overlap does not prove app overlap. App header scrolls with messages; no New messages return action or PC/connection line. Small source controls and “doing” need alignment. Actual device layout awaits later verification. |
| RUN-G02 | Direct/bridge run list polls every 5s, transcript every 4s. Mailbox heartbeat carries snapshots but no transcript. Logs render agent markdown and grouped tool steps. | Numbered durable events, synchronized replay/live stream, timestamps and richer status remain W6/W7. Real branch/diff are null; samples supply them. Reading logs already works. |
| RUN-G03 | Composer has controlled TextInput, dispatch selection and local draft; changing dispatch keeps text. No Send action; mic inert. `useRunChat` always supplies disabled-reason copy. | Live dispatch/queue delivery and receipts W9; speech W12. Multiline, Send/recovery and persistent per-run draft absent. Canvas draft loss is its own unbound-field defect. |
| RUN-G04 | Approval only comes from sample data; `decide` changes local state. Real waiting run says answer at PC. Host API exposes start/stop/log, no approval response. | Durable approvals/first-answer-wins/scope/pending/error/expired/answered-elsewhere W8; actionable notifications W13. No linked entry question in Run. Reuse existing question record. |
| RUN-G05 | Tool rows expand; agent markdown works. `$` searches actual projects/entries; files/skills/prepared commands use samples only when sample mode is on, otherwise explain absence. Token plans/color-copy/nudge exist. | Canvas should catch up. Real searches W2/W10; command timing/edit diffs W6. App diff pill is non-interactive View, so changed-files navigation also missing there. |
| RUN-G06 | Stop offered for live `origin: phone` runs. Host stops recorded Cellar-started runs; direct/mailbox transport exists. Success toast + list refresh; errors toast. | No pending button state; repeat taps possible. Host-confirmed stop versus queued mailbox request is not distinguished. Unsupported PC sessions intentionally not stoppable today; show reason. W9 extends control scope. |
| RUN-G07 | Hook shows log error/network explanation and “not on the pc any more” for unfound run. Fallback state is `done` without found run. Query cache can retain transcript after direct calls disappear. | No explicit historical/last-received presentation, recovery action, unsupported-action state or unknown/missing/loading vs done distinction. Add with W6/W7 lifecycle work; cached content is not live. |
| RUN-G08 | `RunComposer` has no file/image upload tray or per-message model/reasoning picker. Its API carries draft, dispatch and key props. | RUN-R1b/R1c adds attachment upload/ready/error/removal, host-supported model/effort selection, message configuration snapshots, queue popout and Send now promotion. Wire supported capabilities and upload receipts; existing source's dispatch chips/key strip must be replaced. Pending implementation, not a completed W task. |

### Decisions and next step

- User selected **RUN-01–RUN-07** with “1 2 3 4 5 6 7” on 2026-10-10. This approves proposals, not the revised canvas or app implementation.
- RUN-Q1–RUN-Q8 below are answered. Apply them without re-asking; RUN-R1b/R1c is the operative composer arrangement. The earlier Q2/Q3 choices remain historical.
- Revise canvas first, then inspect every changed state visually/behaviorally: long text, scrolling, keyboard, connection truth, pending replies and navigation. Update notes/spec after accepted decisions.
- Run artboard, review/checkpoint docs and outside-repo preview adapter changed. App source remains unchanged. No actual approvals, installs, stops or agent messages. No build tasks marked complete.

### Questions and answers — Run

User answered on 2026-10-10: **A for RUN-Q1/2/3/5/6/7/8; B for RUN-Q4**. These choices concern the proposed product behavior; no runtime permission, real agent dispatch or stop is performed here.

| ID | Related proposals | Question and lettered choices | Answer |
| --- | --- | --- | --- |
| RUN-Q1 | RUN-01/02 | **What stays visible while scrolling Run chat?** A — Compact pinned title + state + PC connection; expand details on tap (Recommended) · B — Entire header pinned, including branch, diff and stop · C — Header scrolls away; small title/state bar appears · D — Everything scrolls; return-to-top action | **A — accepted · 2026-10-10.** |
| RUN-Q2 | RUN-03 | **How should typing, Send and voice fit into Run’s compact composer?** A — Multiline field + primary Send arrow; secondary mic swaps to Stop and shows waveform above field (Recommended) · B — Multiline field + full-width Send below; mic beside field · C — Keyboard/mic circles like NewTask; full-width Send below · D — Typing-only field and Send; voice opens separate capture sheet | **A — accepted · 2026-10-10.** |
| RUN-Q3 | RUN-04 | **Which delivery mode starts selected during an active turn?** A — Queue after this turn; choose Steer deliberately (Recommended) · B — Steer now; Queue remains available · C — Remember last choice for this run; Queue for first message · D — Require explicit mode selection for each message | **A — accepted · 2026-10-10.** |
| RUN-Q4 | RUN-04 | **What should “Steer now” mean?** A — Add guidance during current turn at next supported safe point; keep completed work (Recommended) · B — Interrupt current tool/command, then continue with guidance · C — Stop current turn and start replacement turn; confirm first · D — Ask Continue / Interrupt / Restart each time | **B — Interrupt current tool/command, then continue with guidance · 2026-10-10.** |
| RUN-Q5 | RUN-03/04/07 | **What happens when sending a follow-up after a run finishes?** A — Continue same chat/workspace; explicit Continue action, explain if host cannot resume (Recommended) · B — Open NewTask with previous chat as context · C — Offer Continue here / New task before sending · D — Finished chat stays read-only; start separately from desk | **A — accepted · 2026-10-10.** |
| RUN-Q6 | RUN-05 | **Where should pending approvals and linked agent questions appear?** A — Same bottom waiting area replaces composer; switch pending items, preserve draft, reuse existing question (Recommended) · B — Questions inline in chat; approvals pinned below · C — Keep composer available; waiting items in expandable panel above it · D — Approvals here; questions open their linked entry page | **A — accepted · 2026-10-10.** |
| RUN-Q7 | RUN-05 | **How should approval scope be offered when host supports broader permission?** A — Allow once primary; run-scoped option under explicit More options, deny always visible (Recommended) · B — Allow once / Deny only; no broader scope here · C — Allow once / Allow for run / Deny equally visible · D — Remember chosen scope within current run; label it on each approval | **A — accepted · 2026-10-10.** |
| RUN-Q8 | RUN-07 | **What should Run show when PC disconnects? All choices disable live actions and retain draft.** A — Reconnect view; saved transcript only behind View history, labelled with last-received time (Recommended) · B — Saved transcript visible immediately with historical label and last-received time · C — Reconnect view only; hide transcript until connection returns · D — User chooses Show saved chat / Reconnect on every disconnect | **A — accepted · 2026-10-10.** |

Already settled without further questions: “working” vocabulary, 16px gutters/normal top spacing, 44px small controls, scroll/dock clearance, follow-bottom only when already at bottom, expanded tool details, changed-files navigation separate from Preview, truthful unavailable states, safe retry and host-confirmed results. No duplicate question record. Existing stop support and grouped tools stay; broader host capability is not assumed.

### RUN-R1a — user composer correction — 2026-10-10 (placement superseded by RUN-R1b)

User requested removal of the separate `@ $ /` button row because these references belong inside chat, and moved the microphone into the input's top-right corner so Send is the only defining action beside the field. This overrides the earlier key-strip arrangement and refines accepted RUN-Q2; no new question is needed.

Initially applied: remove all three token buttons and the always-visible hint row; place mic top right inside the field, and Send beside it. That intermediate dock was 171px, down from 247px. The user then supplied new composer references: RUN-R1b below replaces this placement while retaining typed references and no symbol strip.

### RUN-R1b/R1c — latest composer, queue and model instructions — 2026-10-10

User requested a shared chat-box frame based on the supplied references, an unfilled plus opening file/image choices, voice in the toolbar, no permanent Queue/Steer selector, and a queued-message popout with Send now to steer. The next reference refined this to text above the toolbar. User then explicitly added the model switch. These direct instructions authorize the canvas changes; do not re-ask Q2/Q3 or restore their earlier layout.

Operative behavior:

- Multiline text above a compact toolbar in one frame: transparent Plus, Voice, Model/reasoning, primary Send. Keep Cellar colors; reference screenshots supply layout rather than a new theme. No always-visible symbol buttons, dispatch choices or explanatory dispatch strip. Default dock is **133px**, 114px less than the earlier 247px revision.
- Plus opens an upward tray with Add file / Add image. Show selected files as removable chips and image previews when available. Uploading and failed uploads block Send; retry/remove keeps the draft. Attachment-only messages are allowed. The canvas file picker reads local metadata/previews; upload status is simulated, with no host upload. On reload browser-local files require selection again rather than pretending upload persistence.
- During an active turn, Send always queues. After host acceptance, open the queue popout and retain a small count above the composer. Each row has message preview, **Send now**, Cancel and More → full text, saved settings, Edit. Editing updates that one queued item only after confirmation. Failed cancellation leaves it queued. Send now interrupts the active tool/command, then continues with the selected message; retain the item until PC confirms. Unsupported steering explains why. Failed/unknown promotion reuses its request/receipt and preserves any separate draft.
- Model and reasoning picker applies to the next message and saves a configuration snapshot on each queued message. Changing the toolbar selection leaves accepted queued messages unchanged. Editing a queued message restores its saved configuration. Real choices must come from the selected agent/host, with valid effort combinations and an unavailable explanation; the prototype uses explicitly sample options. It does not change permissions or real agent settings.
- Finished runs still use **Continue** in the same chat/workspace (RUN-Q5). Voice swaps mic to Stop, shows waveform above the frame while listening/transcribing, and allows transcript edits. Typed `@`, `$`, `/` still open suggestions inside chat.

### Run revision 1 — self-review and implementation handoff

- Rebuilt pinned compact identity/connection header and flex scroll/dock layout with 16px gutters, 44px controls, normal top gap and “working”. Header details contain full long title, workspace, changed files and separate Preview. The original 15px transcript overlap is gone; chat scrolls to its actual available edge instead of relying on fixed bottom padding.
- Added 38 review scenarios covering approval/question combinations, pending/rejected/expired/answered elsewhere, queue and delivery, lifecycle/connection, unsupported host features, voice, long content, attachments and model switching. All PC, speech, model and upload responses remain sample state. App source and task completion flags are unchanged.
- Visually checked states, long content and scrolling, 320/390px phones and 560px chat column; inspected toolbar/attachment/queue/model popouts and changed-files overlay. No board horizontal overflow in checked layouts. Phone keyboard is a 224px simulation; dock ends at 620px and nav hides while it is visible. Question note scrolls into view with Send answer pinned below. Input caret and multiline text survive rerenders.
- Exercised shared waiting tabs, scope expansion, answer failure/retry preserving choice/note, and PC-confirmed completion; composer draft survives waiting/reload. Queued edit preserves other items; cancellation failure retains the item; confirmed cancellation/application removes only the intended item. Send now failure keeps queue and stable retry ID, and confirmed interruption removes that queued message. Model changes leave queued configuration snapshots unchanged. Attachment-only sending, upload failure/retry, removal and native file picker with a synthetic text file were checked.
- Unknown delivery after reload checks the original request ID and locks resubmission; no optimistic success. Stop failure preserves state and confirms stopped/clears queue only after PC reply. Offline hides progress/actions; View history explicitly labels saved chat with last-received time; reconnect restores draft. Earlier-message reading stays in place on new output; New messages returns to bottom; bottom-following resumes there.
- Fixed defects found during self-review: state leakage after stop failure, overwritten queued messages, resolved requests retaining waiting badges, unavailable references falsely presented as resolved context, unguarded keyboard send during voice, question-note keyboard clearance, duplicate steering errors, missing configuration fallback in receipt presets, and changed-files overlay stacking above the new composer. Unavailable model reason now precedes disabled options.
- Reconciled `screens.md`, Run notes in `canvas.json`, and the Run-specific symbol/command scheduling exception in `keys.md`. Source gaps RUN-G01–G08 remain pending. Native mobile keyboard/animation, speech, file transfer/storage, supported models/efforts, durable receipts and host interruption still need implementation/device testing.
- Review captures are saved beside the local adapter in `C:/Users/MSI/.codex/visualizations/2026/10/10/01a125af-6ce9-7950-be26-44fb14017377/`: `run-revision1-composer.png`, `run-revision1-queue.png`, `run-revision1-attachments.png`, `run-revision1-model.png`.
- Final polish: model choices apply immediately; close with × or outside tap rather than a redundant Done button. This keeps all supported model/effort choices visible in the 390px review view. Static validation passed: exported logic compiles, all 38 scenario bindings render, pending/unknown receipt presets retain configuration snapshots, canvas JSON parses, and `git diff --check` is clean.

**Acceptance pending:** leave Run current. Main revision 5 and NewTask revision 2 stay confirmed. After explicit acceptance, next page is Preview.

## Subsequent page records

Append one section per page when it becomes current. Reuse the same structure: status; browser/source evidence; what works; stable proposal IDs; implementation gaps; user questions/answers; canvas revision; acceptance; affected docs/components/tasks.

## 2026-10-10 — bulk visual clone in app source

**Status:** visual pass implemented. User instruction replaces sequential page acceptance:
clone all current boards now, then discuss behavior separately. Earlier board review records
remain historical; this does not accept or implement their simulated host behavior.

- Main rev 5, NewTask rev 2 and Run R1b/R1c now drive app layouts. Shared canvas fonts,
  row grounds and typography extend across desktop, settings and later/sample boards.
- Added drawn inbox/desktop/phone/race previews and group diff/install/capture panels.
  New host actions remain unavailable or explicitly sample-only. W1–W20 stay unchecked.
- Coverage, limits and verification recorded in `../visual-clone.md`; M6 marked complete.
- 74 suites / 811 tests, types, lint, web export and Android release build pass. APK installed
  preserving data and launched; Main and NewTask keyboard layout inspected on-device.
  Browser inspected Main, NewTask, Run/model popout and desktop phone panel.
- Web publication remains blocked: automatic approval review rejected external hosting
  deployment without explicit authorization for destination and build payload.
- GitHub push was also rejected by automatic approval review; source commits remain local and no PR was created. Final web export and final APK reinstall succeeded.

## 2026-10-10 — W1 verified: real counts

User approved W1 after the behavior review. Shared `deskCounts` now drives the nav island,
sidebar and phone/desktop Desk headers. Only running is working; waiting combines blocked
entries and host-reported waiting runs. Unknown is unavailable, not zero. Samples stay out
of real totals. Coarse real waiting states say "needs you at the pc" until W8 approvals.
Retry/reconnect await confirmed reads; mailbox totals show snapshot freshness and expire.

Verification: 832 app tests, 30 desktop tests, types, lint, desktop bundle and local web
export pass. Android release installed and launched on the phone. Read-only QA host checks
covered confirmed zeros, injected failure, retry, disconnect and reconnect. Original Michu
pairing restored, existing PC host kept running, temporary host stopped. Nonzero totals and
mailbox expiry covered by controlled tests; no fabricated production tasks. See
`../how-it-works.md` for the full flow map and boundaries. W1 checked only after verification;
W2 remains next. Canvas and spec edits preserved. No GitHub push or web deployment.
