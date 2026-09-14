---
description: What is open in the cellar for the repo you are in
argument-hint: [project | all | inbox]
allowed-tools: mcp__cellar__cellar_orient, mcp__cellar__cellar_list_entries, mcp__cellar__cellar_list_projects
---

Show what is waiting in the cellar. This is a lookup: do not claim anything, do not change
any code, do not start work.

Scope: $ARGUMENTS

With no scope, call `cellar_orient` with the absolute path of the directory you are working
in. It resolves the project from the repo path and returns what is open, what another
session already holds and what is blocked — so never ask which project this is.

With a scope, pass it to `cellar_list_entries` as `project`, with `states: ["open"]`.
`all` and `inbox` are accepted verbatim; anything else is matched as a project name. If the
name does not resolve, call `cellar_list_projects` and show what exists rather than
guessing.

Print the rows the server returns as they come — `id / kind / state / age / project /
thought`. They are already aligned and already short; do not rebuild them as a markdown
table and do not summarise them into prose. Close with how to start one:
`pick up cellar entry <id>`.
