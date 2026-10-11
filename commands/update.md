---
model: sonnet
---

# Update Dependencies

Check and update dependencies across all projects.

## Instructions

Run these checks in parallel:

### 1. Orchestrator (Node)
```powershell
Set-Location "C:\Users\<user>\Downloads\filefs\orchestrator"
npm outdated 2>&1
```

### 2. CS2 Skin Radar (Python)
```powershell
Set-Location "C:\Users\<user>\Downloads\02 - Projects\cs2-skin-radar"
.venv\Scripts\pip.exe list --outdated --format=columns 2>&1
```

### 3. Inventory Monitor (Python)
```powershell
Set-Location "C:\Users\<user>\Downloads\02 - Projects\inventory-monitor"
pip list --outdated --format=columns 2>&1
```

### 4. Kick Chat Translator (Node/TS)
```powershell
Set-Location "C:\Users\<user>\Downloads\kick-chat-translator"
npm outdated 2>&1
```

## Output
Present a single table of outdated packages grouped by project.
Only update if user confirms. For extensions (kick-chat-translator), warn about breaking changes.