---
description: Read one cellar entry in full — both halves of its thread
argument-hint: <entry id>
allowed-tools: mcp__cellar__cellar_get_entry, mcp__cellar__cellar_list_entries, Read, Write, Artifact
---

Show entry `$ARGUMENTS` with `cellar_get_entry`. Any unambiguous id prefix resolves, so the
eight characters a listing prints are enough.

If no id was given, or the argument does not resolve to one, call `cellar_list_entries` with
it as `search` and show what matched. Never guess which entry was meant.

Publish it as the live view — the cellar skill's "The live view" section has the template,
the `entry` shape and how to update the one page in place. Carry across the thought, what
the user added since, what has already been reported back, the repo it belongs to and every
question with its options and answer. The two halves of the thread are kept apart on
purpose — the user's own additions and an agent's reported lines are never interleaved — so
`yours` and `agent_lines` stay separate lists.

In the terminal, one line: the thought, its state and the link. Without an `Artifact` tool,
print what `cellar_get_entry` returns whole instead, the halves still apart.

Reading does not claim it. If the user wants it worked, `pick up cellar entry <id>` is the
line that loads the cellar skill and the whole claim → work → report → finish loop.
