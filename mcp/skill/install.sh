#!/bin/sh
# Installs the cellar skill and its lookup commands from the server, so a
# machine that has never cloned this repo can still read the cellar.
#
#   curl -fsSL https://cellar-stash.web.app/skill/install.sh | sh
#
# It writes two places and nothing else: ~/.claude/skills/cellar/SKILL.md and
# one file per command in ~/.claude/commands. Both are overwritten, because the
# copy on the server is the one that matches the deployed tools.
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

echo
echo "restart the agent to pick them up, then /cellar-list"
