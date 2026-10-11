---
model: sonnet
---

# PC Performance Check

Quick diagnostic of PC performance.

## Instructions

Run all in parallel:

### 1. CPU + RAM
```powershell
$cpu = (Get-CimInstance Win32_Processor).LoadPercentage
$os = Get-CimInstance Win32_OperatingSystem
$ramUsed = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 1)
$ramTotal = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
"CPU: ${cpu}% | RAM: ${ramUsed}/${ramTotal} GB"
```

### 2. Top processes by memory
```powershell
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, @{N='MB';E={[math]::Round($_.WorkingSet64/1MB)}} | Format-Table -AutoSize
```

### 3. Disk
```powershell
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}}, @{N='TotalGB';E={[math]::Round($_.Size/1GB,1)}} | Format-Table -AutoSize
```

### 4. GPU (if nvidia-smi available)
```powershell
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader 2>$null || "nvidia-smi not found"
```

## Output
Compact summary with any red flags (>80% RAM, >90% disk, high GPU temp).