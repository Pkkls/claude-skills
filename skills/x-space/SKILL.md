---
name: x-space
description: Listen to a live X/Twitter Space on this PC without logging in to x.com. Use when the user shares an x.com/i/spaces/... link (including /peek) and wants to hear it, or says they can't listen to a Space.
---

# X Space listener

Scripts: `C:\Users\<user>\Downloads\02 - Projects\x-space-listener` (repo github.com/Pkkls/x-space-listener). Needs `yt-dlp` and `ffplay` on PATH.

1. Stop any previous player so audio does not double up:
   `Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | ? CommandLine -like '*space.ps1*' | % { Stop-Process -Id $_.ProcessId -Force }; Get-Process ffplay -EA 0 | Stop-Process -Force`
2. Launch detached (auto-restarts ffplay on crash, stops when the window is closed or the Space ends):
   `Start-Process powershell -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','"C:\Users\<user>\Downloads\02 - Projects\x-space-listener\space.ps1"','-Url','<space url>')`
3. Wait ~15s, then verify with `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\<user>\Downloads\02 - Projects\x-space-listener\check.ps1"`.
   Audible = ffplay running, session active, not muted, peak > 0. Report the output device name.
4. Log: `%TEMP%\x-space-<id>.log`. If it says "no stream", the Space ended or was never live.

"Continue infiniment" / non-stop: add `'-Forever'` to the ArgumentList. ffplay then reopens even after the window is closed, and polls every 30s while the Space is offline. Stop it with the step 1 command.

Never report playback as ongoing without re-running check.ps1 first. Only the user can confirm they actually hear it.
