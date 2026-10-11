# Recopie l'état courant des skills depuis la machine vers ce dépôt (public), caviarde, vérifie, puis commit et push
$here = $PSScriptRoot
$u = "$env:USERPROFILE\.claude"
foreach ($s in Get-ChildItem "$here\skills" -Directory) { Copy-Item "$u\skills\$($s.Name)\*" $s.FullName -Recurse -Force }
Copy-Item "$u\commands\*.md" "$here\commands\" -Force
$projects = @{ 'kick-chat-translator' = "$env:USERPROFILE\Downloads\kick-chat-translator"; 'vodloop' = "$env:USERPROFILE\Downloads\02 - Projects\vodloop" }
foreach ($p in $projects.Keys) { foreach ($s in Get-ChildItem "$here\projects\$p" -Directory) { Copy-Item "$($projects[$p])\.claude\skills\$($s.Name)\*" $s.FullName -Recurse -Force } }
Remove-Item "$here\skills\youtube-upload\yt-upload-shots" -Recurse -Force -ErrorAction SilentlyContinue
# Travail privé : reste sur la machine
Remove-Item "$here\skills\autonomy-log\window-events-6i.json", "$here\skills\autonomy-log\w1-review-6i.md" -Force -ErrorAction SilentlyContinue
& "$here\private.ps1" -Paths "$here\skills", "$here\projects", "$here\commands"
# Garde : rien de privé ne part
$pat = @('192\.168\.') + (Get-Content "$here\private.map" -Encoding UTF8 | Where-Object { $_ -match "`t" } | ForEach-Object { [regex]::Escape(($_ -split "`t")[0]) })
$leak = Get-ChildItem "$here\skills", "$here\projects", "$here\commands" -Recurse -File | Select-String -Pattern $pat
if ($leak) { Write-Output "STOP, valeur privee restante :"; $leak; exit 1 }
git -C $here add skills projects commands
git -C $here commit -m "Sync skills from the machine" 2>$null
git -C $here push
