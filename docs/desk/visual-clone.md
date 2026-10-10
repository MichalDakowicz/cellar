# Canvas visual clone — 2026-10-10

The user's bulk-clone instruction supersedes the sequential acceptance checkpoint in
`canvas/updates.md`. It does not approve or complete any Pass 2 wiring task.

## Coverage

| Canvas | Application surface |
| --- | --- |
| Main rev 5 | Phone Desk: PC identity, global waiting cards, compact slots, commands, run scope, working/history rows |
| NewTask rev 2 | Fixed-top sheet, pinned header/footer, editable transcript, keyboard primary, worktree/checkout, agent/mode, optional thoughts |
| Run R1b/R1c | Pinned compact identity/disclosure, transcript, shared text/toolbar frame, attachment/model/queue popouts, approval scopes |
| Preview / Screen | Framed inbox sample and landscape desktop sample; existing live pages preserved |
| PhoneNotify / PhoneQuestion / QuestionCard | Notification cards, answer choices and shared waiting/question typography |
| PhoneShare / PhoneRace / PhoneNight | Share sheet, drawn race previews and morning summary |
| DeskHome / DeskChat / DeskProjects | Desktop sidebar, capture bar, run rows/list/rail, sample phone, project desk panel |
| DeskPhone / DeskGroupRun | Phone mirror, install/capture/logcat/settings panels, per-project rows, sample diffs and ship controls |
| DeskUsage / DeskRecipes / DeskHosts | Settings pages, row surfaces, text hierarchy, shared controls |
| Map / Keys / Notes | Reference boards; existing key help/settings cover product-facing content |

Spline Sans and IBM Plex Mono are bundled locally with OFL license files. Shared row
grounds use theme tokens so the existing light theme keeps working.

New host controls remain presentation only. Sample models are not advertised as real
agent capabilities. Attachments, queued delivery, voice, worktrees, ADB controls, model
switching and group shipping still need the unchecked W tasks. Local disclosures and
visual selectors do not send host requests.

## Verification

- Root tests: 74 suites, 811 tests passed; TypeScript, lint and diff whitespace check passed.
- Web export succeeded and includes all three font assets.
- Android release assembled, installed with app data preserved, launched successfully;
  process present and no AndroidRuntime/ReactNativeJS error output in checked logs.
- On-device Main and NewTask inspected. NewTask keeps its top/header fixed and footer
  above the real keyboard; body scrolls independently.
- Browser inspected the phone and desktop boards listed in the README QA entry, including
  Run's model popout. Run also checked at 320px with no horizontal overflow. Isolated QA
  entry uses sample props and mounts no auth/database/host clients; see README commands.
- Firebase deployment and GitHub branch push were rejected by automatic approval review
  because destination and publication payload need explicit user authorization. Commits,
  PR description and web build remain local; no review PR was created.

This is the visual checkpoint before behavior work. Native speech, upload, host delivery,
receipt recovery and agent permissions have not been implemented or validated here.
