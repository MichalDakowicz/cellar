#!/bin/sh
# Sets a machine up to work the cellar, so one that has never cloned this repo
# can still read it.
#
#   curl -fsSL https://cellar-stash.web.app/skill/install.sh | sh
#
# With a token in the environment it also registers the MCP server, which is
# the whole setup in one line:
#
#   curl -fsSL .../install.sh | CELLAR_TOKEN='...' CELLAR_MCP_URL='...' sh
#
# Env vars rather than arguments because a script read off a pipe has no argv
# to read — `sh` is running the stream, and its own arguments are not the
# script's.
#
# It writes ~/.claude/skills/cellar/SKILL.md, one file per command in
# ~/.claude/commands, and — only when a token is given — the cellar entry in
# ~/.claude.json. The first two are overwritten, because the copy on the server
# is the one that matches the deployed tools.
set -eu

base="${CELLAR_SKILL_URL:-https://cellar-stash.web.app/skill}"
skills="$HOME/.claude/skills/cellar"
commands="$HOME/.claude/commands"

mkdir -p "$skills" "$commands"

curl -fsSL "$base/SKILL.md" -o "$skills/SKILL.md"
echo "skill    $skills/SKILL.md"

# The list is fetched rather than hardcoded: a command added to mcp/skill/commands
# ships with the next web deploy and installs here without this file changing.
curl -fsSL "$base/commands.txt" | tr -d '\r' | while read -r name; do
  [ -n "$name" ] || continue
  curl -fsSL "$base/commands/$name" -o "$commands/$name"
  echo "command  $commands/$name"
done

# The MCP half. Fetched and run rather than written inline so the PowerShell
# installer and this one register the server identically (mcp-entry.mjs).
if [ -n "${CELLAR_TOKEN:-}" ] && [ -n "${CELLAR_MCP_URL:-}" ]; then
  # A directory, so the file can keep its .mjs name — see mcp-entry.mjs.
  work="$(mktemp -d)"
  curl -fsSL "$base/mcp-entry.mjs" -o "$work/mcp-entry.mjs"
  node "$work/mcp-entry.mjs"
  rm -rf "$work"
else
  echo 'mcp      skipped — set CELLAR_TOKEN and CELLAR_MCP_URL to register the server too'
fi

echo
echo "restart the agent to pick them up, then /cellar-list"
