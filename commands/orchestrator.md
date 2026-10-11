---
model: sonnet
---

# Orchestrator Management

View, restart, or modify the Windows task orchestrator.

## Usage
`/orchestrator [status|restart|log|edit]`

## Instructions

### status (default)
```powershell
$hb = Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\.heartbeat" -ErrorAction SilentlyContinue
if ($hb) { "Alive (heartbeat: $hb)" } else { "No heartbeat file — may be down" }
Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\.last-run.json"
Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\orchestrator.log" -Tail 5
```

### restart
1. Kill existing: `Get-Process node | Where-Object {$_.CommandLine -match "orchestrator"} | Stop-Process -Force`
2. Relaunch: `Start-Process wscript.exe -ArgumentList '"C:\Users\<user>\Downloads\filefs\orchestrator\run_silent.vbs"'`
3. Wait 2s, show last 5 log lines to confirm.

### log
```powershell
Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\orchestrator.log" -Tail 30
```

### edit
Open `C:\Users\<user>\Downloads\filefs\orchestrator\schedule.json` for editing.
After editing, always restart the orchestrator.

## Config
- Schedule config: `C:\Users\<user>\Downloads\filefs\orchestrator\schedule.json`
- State file: `C:\Users\<user>\Downloads\filefs\orchestrator\.last-run.json`
- Logs: `C:\Users\<user>\Downloads\filefs\orchestrator\orchestrator.log`