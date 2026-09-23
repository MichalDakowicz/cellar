---
description: Search cellar thoughts, and the lines under them, by text
argument-hint: <text to search for>
allowed-tools: mcp__cellar__cellar_list_entries, mcp__cellar__cellar_get_entry, Read, Write, Artifact
---

Find thoughts matching: $ARGUMENTS

Call `cellar_list_entries` with that text as `search`, `project: "all"` and `json: true`.
Searching every project is the point — a thought about the repo you are standing in is often
filed under another one, and a search that only looked here would miss it. The match covers
the thought itself and every line appended to it.

Narrow only if the user asked for it: a project name goes in `project`, a kind in `kinds`,
a state in `states`.

If nothing comes back, try once more with `archived: true` and say plainly that the only
matches are put away — archived means the user filed it away on purpose. Do not invent a
different search they did not ask for.

Publish the matches as the live view — the cellar skill's "The live view" section has the
template and how to update the one page in place. `lookup` is `find`, `heading` the search
text, one section per project the matches fall in, titled with the project name.

In the terminal, one line: how many matched, across which projects, and the link. Without
an `Artifact` tool, print the rows as they come back instead. A single strong match is worth
expanding with `cellar_get_entry`; a list of ten is not. This is a lookup — do not claim
anything and do not start work.
