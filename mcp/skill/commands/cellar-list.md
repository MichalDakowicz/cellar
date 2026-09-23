---
description: What is open in the cellar for the repo you are in
argument-hint: [project | all | inbox]
allowed-tools: mcp__cellar__cellar_orient, mcp__cellar__cellar_list_entries, mcp__cellar__cellar_list_projects, Read, Write, Artifact
---

Show what is waiting in the cellar. This is a lookup: do not claim anything, do not change
any code, do not start work.

Scope: $ARGUMENTS

With no scope, call `cellar_orient` with the absolute path of the directory you are working
in. It resolves the project from the repo path — so never ask which project this is. Then
call `cellar_list_entries` for that project with `states: ["blocked", "doing", "open"]` and
`json: true`.

With a scope, pass it to `cellar_list_entries` as `project`, with `states: ["open"]` and
`json: true`. `all` and `inbox` are accepted verbatim; anything else is matched as a project
name. If the name does not resolve, call `cellar_list_projects` and show what exists rather
than guessing.

Publish the rows as the live view — the cellar skill's "The live view" section has the
template, the data block and how to update the one page in place. Cut the rows into
sections by state, in this order and leaving out any that are empty: `blocked on you`,
`being worked`, `open`. `heading` is the project name (or `all`, or `inbox`), `sub` the counts.

In the terminal, one line: the heading, the counts and the link, then how to start one:
`pick up cellar entry <id>`. Without an `Artifact` tool, print the rows the server returns
as they come instead — `id / kind / state / age / project / thought`, already aligned; do
not rebuild them as a markdown table and do not summarise them into prose.
