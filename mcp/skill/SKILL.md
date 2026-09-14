---
name: cellar
description: Work the one-line thoughts dumped in Cellar about the repo you are in — pick one up, do it, report back in the user's voice, or ask when the thought is too thin to act on. Use when the user says "what's in the cellar", "anything dumped for this repo", "work the cellar", "pick up a thought/glitch/idea", when they ask what is left to do on a project, or whenever the cellar_* MCP tools are available and the session is about clearing dumped work. Also use before finishing a session in a linked repo, to catch anything worth dropping back in.
---

# Cellar

Cellar is a mind dump. One-line thoughts about things the user is building, filed under
projects, each with a **kind** (idea, removal, glitch, question, research, copy, design) and
a **state** (open, doing, blocked, done, dropped).

The thought is one line and **the reasoning behind it was never written down.** That single
fact drives everything below.

## The loop

```
cellar_orient  →  claim  →  work  →  append lines  →  finish
                                  ↘  ask  →  blocked, stop
```

1. **`cellar_orient`** with the absolute path you are working in. One call gives you the
   project, its repo, what is open, what another session already holds, what is blocked.
   Do this before anything else; never ask the user which project this is.
2. **`cellar_claim_entry`** before touching code for a thought. It is atomic — if you are
   told someone else has it, pick another. It returns the full brief: the thought, what the
   user added since, what has already been reported, the kind's job, and the voice rules.
3. **Work it**, in the repo the brief names.
4. **`cellar_append_line`** for each real finding, as you go.
5. **`cellar_finish_entry`** as `done` or `dropped`, with one line saying what happened.

Claim one entry at a time and finish it before claiming the next. A queue of half-claimed
thoughts is worse than an untouched one.

## The lookups, when you are not working anything

Three slash commands sit beside this skill for the times you only want to see what is there.
They are read-only and they do not claim:

| command        | for                                                           |
| -------------- | ------------------------------------------------------------- |
| `/cellar-list` | what is open here, or in a named project, `all` or `inbox`     |
| `/cellar-find` | search the thoughts and the lines under them, across projects  |
| `/cellar-view` | one entry in full, by id prefix                                |

They live in `mcp/skill/commands/` and install next to this file — `mcp/README.md` has the
copy. Picking something up is still `pick up cellar entry <id>`, which lands back here.

## Ask instead of guessing

`cellar_ask` puts a question on the entry and blocks it. **This is a correct outcome.** It
appears in the user's inbox and nothing moves until they answer.

- **idea** and **removal** — ask essentially always. An idea is a direction, not a spec, and
  a removal destroys work. Name what it would mean concretely and what you would do, then
  ask before building or deleting.
- **everything else** — ask when two readings of the line would lead to different work.

Ask **one concrete question, naming the options**. "which surface — the dump field, the
filter sheet, or both?" is answerable in four words. "could you clarify what you meant?" is
not, and it will sit there.

A blocked entry with a sharp question is better than a confident wrong build. It is also
better than a `done` the user later discovers was not.

## What each kind is asking for

| kind         | the job                                                                |
| ------------ | ---------------------------------------------------------------------- |
| **idea**     | work out what it would actually mean, then **ask before building**      |
| **removal**  | find everything it touches, say what goes with it, **ask before deleting** |
| **glitch**   | reproduce, fix, cover with a test, report the cause in one line         |
| **question** | answer from the repo — do not change code to answer a question          |
| **research** | find out, report back compactly, no code changes unless asked           |
| **copy**     | write the string, matching the voice already in that UI                 |
| **design**   | general design work — layout, hierarchy, how a screen should feel       |

`design` does not mean "check it against a design system". Only reach for one if the project
actually has one.

## Write like they do

Your lines sit in a list directly beneath the user's own thoughts. An assistant voice there
makes the list unreadable, and the list is the whole app.

- lowercase, one line, no full stop
- say what changed or what you found — **not** that you did it
- no markdown, no code fences, no bullets
- name the file or the surface when that is the useful part

> `fixed the nav island jump — keyboardVerticalOffset was missing on the dump field`
>
> not: `I've successfully resolved the issue by adding the missing prop.`

Lines are collapsed to one line and capped server-side, so a paragraph arrives truncated.
Send the sentence worth reading in six months. One line per real finding.

## The rest

- **`cellar_create_entry`** — something you found that is worth keeping but is not this
  entry. It lands open for the user to triage; never claim it straight back. Not a progress
  log — that is `cellar_append_line` on the entry you hold.
- **`cellar_archive_entry`** — already true, fixed elsewhere, no longer applies. Reason
  required. **There is no delete**: nothing in this app is destroyed to get it out of the
  way.
- **`cellar_unclaim_entry`** — you ran out of room or the user moved on. Put it back.
- **`cellar_link_repo`** — `cellar_orient` found no project for a repo that clearly has one.
  Linking it is the one change that stops the question recurring in every future session.
  Offer it; do not invent a new project on your own.

## Never

- work a thought you have not claimed
- re-claim something `blocked` — it is waiting on the user, not on you
- touch an `archived` entry; it was put away on purpose
- mark `done` what you did not finish
- ask the user for their password — if a tool says the server is not signed in, tell them
  to run `npm run login` in `cellar/mcp`. If they say the account has no password because
  it was made with Google, point them at Cellar's settings → *password for agent tools*
