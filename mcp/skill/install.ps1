# Sets a machine up to work the cellar, so one that has never cloned this repo
# can still read it.
#
#   irm https://cellar-stash.web.app/skill/install.ps1 | iex
#
# With a token in the environment it also registers the MCP server, which is
# the whole setup in one line:
#
#   $env:CELLAR_TOKEN='...'; $env:CELLAR_MCP_URL='...'; irm .../install.ps1 | iex
#
# Env vars rather than parameters because a script read off a pipe has no argv
# to read — `iex` runs the text, and there is nowhere to put an argument.
#
# It writes ~\.claude\skills\cellar\SKILL.md and the live-view.html beside it,
# one file per command in ~\.claude\commands, and — only when a token is given —
# the cellar entry in
# ~\.claude.json. The first two are overwritten, because the copy on the server
# is the one that matches the deployed tools.
$ErrorActionPreference = 'Stop'

$base = if ($env:CELLAR_SKILL_URL) { $env:CELLAR_SKILL_URL } else { 'https://cellar-stash.web.app/skill' }
$skills = Join-Path $HOME '.claude\skills\cellar'
$commands = Join-Path $HOME '.claude\commands'

New-Item -ItemType Directory -Force -Path $skills, $commands | Out-Null

Invoke-WebRequest "$base/SKILL.md" -OutFile (Join-Path $skills 'SKILL.md') -UseBasicParsing
Write-Host "skill    $(Join-Path $skills 'SKILL.md')"

# The page the lookups fill and publish as one live view (SKILL.md, "The live view").
Invoke-WebRequest "$base/live-view.html" -OutFile (Join-Path $skills 'live-view.html') -UseBasicParsing
Write-Host "page     $(Join-Path $skills 'live-view.html')"

# The list is fetched rather than hardcoded: a command added to mcp/skill/commands
# ships with the next web deploy and installs here without this file changing.
$names = (Invoke-WebRequest "$base/commands.txt" -UseBasicParsing).Content -split "`r?`n" | Where-Object { $_ -ne '' }
foreach ($name in $names) {
    $out = Join-Path $commands $name
    Invoke-WebRequest "$base/commands/$name" -OutFile $out -UseBasicParsing
    Write-Host "command  $out"
}

# The MCP half. Fetched and run rather than written inline so the shell
# installer and this one register the server identically (mcp-entry.mjs).
if ($env:CELLAR_TOKEN -and $env:CELLAR_MCP_URL) {
    # Saved as .mjs on purpose — see the header of mcp-entry.mjs.
    $entry = Join-Path ([System.IO.Path]::GetTempPath()) 'cellar-mcp-entry.mjs'
    Invoke-WebRequest "$base/mcp-entry.mjs" -OutFile $entry -UseBasicParsing
    try { node $entry } finally { Remove-Item $entry -ErrorAction SilentlyContinue }
} else {
    Write-Host 'mcp      skipped — set CELLAR_TOKEN and CELLAR_MCP_URL to register the server too'
}

Write-Host ''
Write-Host 'restart the agent to pick them up, then /cellar-list'
