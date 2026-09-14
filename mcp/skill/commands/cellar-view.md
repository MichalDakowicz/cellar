---
description: Read one cellar entry in full — both halves of its thread
argument-hint: <entry id>
allowed-tools: mcp__cellar__cellar_get_entry, mcp__cellar__cellar_list_entries
---

Show entry `$ARGUMENTS` with `cellar_get_entry`. Any unambiguous id prefix resolves, so the
eight characters a listing prints are enough.

If no id was given, or the argument does not resolve to one, call `cellar_list_entries` with
it as `search` and show what matched. Never guess which entry was meant.

Print what comes back whole: the thought, what the user added since, what has already been
reported back, the repo it belongs to, and the brief for its kind. The two halves of the
thread are kept apart on purpose — the user's own additions and an agent's reported lines
are never interleaved — so keep them apart here too.

Reading does not claim it. If the user wants it worked, `pick up cellar entry <id>` is the
line that loads the cellar skill and the whole claim → work → report → finish loop.
