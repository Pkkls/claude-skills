# Copie les skills globaux et les commandes de ce dépôt dans ~/.claude, puis remet les valeurs locales (private.map) si présentes
$here = $PSScriptRoot
Copy-Item "$here\skills\*" "$env:USERPROFILE\.claude\skills\" -Recurse -Force
Copy-Item "$here\commands\*.md" "$env:USERPROFILE\.claude\commands\" -Force
$dest = (Get-ChildItem "$here\skills" -Directory | ForEach-Object { "$env:USERPROFILE\.claude\skills\$($_.Name)" }) + "$env:USERPROFILE\.claude\commands"
& "$here\private.ps1" -Paths $dest -Reverse
Write-Output "skills et commandes installes dans $env:USERPROFILE\.claude"
