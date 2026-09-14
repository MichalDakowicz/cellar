# Installs the cellar skill and its lookup commands from the server, so a
# machine that has never cloned this repo can still read the cellar.
#
#   irm https://cellar-stash.web.app/skill/install.ps1 | iex
#
# It writes two places and nothing else: ~\.claude\skills\cellar\SKILL.md and
# one file per command in ~\.claude\commands. Both are overwritten, because the
# copy on the server is the one that matches the deployed tools.
$ErrorActionPreference = 'Stop'

$base = if ($env:CELLAR_SKILL_URL) { $env:CELLAR_SKILL_URL } else { 'https://cellar-stash.web.app/skill' }
$skills = Join-Path $HOME '.claude\skills\cellar'
$commands = Join-Path $HOME '.claude\commands'

New-Item -ItemType Directory -Force -Path $skills, $commands | Out-Null

Invoke-WebRequest "$base/SKILL.md" -OutFile (Join-Path $skills 'SKILL.md') -UseBasicParsing
Write-Host "skill    $(Join-Path $skills 'SKILL.md')"

# The list is fetched rather than hardcoded: a command added to mcp/skill/commands
# ships with the next web deploy and installs here without this file changing.
$names = (Invoke-WebRequest "$base/commands.txt" -UseBasicParsing).Content -split "`r?`n" | Where-Object { $_ -ne '' }
foreach ($name in $names) {
    $out = Join-Path $commands $name
    Invoke-WebRequest "$base/commands/$name" -OutFile $out -UseBasicParsing
    Write-Host "command  $out"
}

Write-Host ''
Write-Host 'restart the agent to pick them up, then /cellar-list'
