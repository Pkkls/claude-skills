# Remplace les valeurs privees (private.map, jamais commite) dans les fichiers texte d'un dossier.
# -Reverse remet les vraies valeurs (utilise par install.ps1).
param([Parameter(Mandatory)][string[]]$Paths, [switch]$Reverse)
$map = "$PSScriptRoot\private.map"
if (-not (Test-Path $map)) { Write-Output "private.map absent : rien remplace"; return }
$pairs = Get-Content $map -Encoding UTF8 | Where-Object { $_ -match "`t" } | ForEach-Object { , ($_ -split "`t", 2) }
if ($Reverse) { $pairs = $pairs | ForEach-Object { , @($_[1], $_[0]) } }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$ext = '.md', '.txt', '.ps1', '.sh', '.mjs', '.js', '.json', '.py', '.cmd', '.vbs'
foreach ($p in $Paths) {
  Get-ChildItem $p -Recurse -File | Where-Object { $ext -contains $_.Extension } | ForEach-Object {
    $t = [IO.File]::ReadAllText($_.FullName)
    $n = $t
    foreach ($pr in $pairs) { $n = $n.Replace($pr[0], $pr[1]) }
    if ($n -ne $t) { [IO.File]::WriteAllText($_.FullName, $n, $utf8) }
  }
}
