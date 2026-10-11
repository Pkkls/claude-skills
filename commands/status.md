---
model: haiku
---

# Infrastructure Status Check

Check all bots, services, and scheduled tasks across all machines.

## Instructions

Run ALL 3 checks in parallel (3 separate Bash/PowerShell calls simultaneously):

### 1. Lichee Nano (<nano-ip>)
```bash
wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip> "echo '=PROCS='; ps | grep -E 'pkkls_bot|item_watcher|dot-proxy|dnsmasq' | grep -v grep; echo '=DISK='; df / | awk 'NR==2{print \$5}'; echo '=RAM='; free | awk 'NR==2{printf \"%d/%dMB\n\", (\$3)/1024, (\$2)/1024}'; echo '=CRON='; wc -l < /etc/crontabs/root; echo '=UP='; uptime"
```

### 2. Lichee Claw (<claw-ip>)
```bash
wsl ssh -i /home/<user>/.ssh/claw_key root@<claw-ip> "ps | grep -E 'bot\.py' | grep -v grep; uptime" 2>&1 || echo "Claw unreachable"
```

### 3. Windows Orchestrator
```powershell
try { Get-Process node -ErrorAction Stop | Where-Object {$_.CommandLine -match "orchestrator"} | Select-Object Id, CPU } catch { "not running" }
Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\orchestrator.log" -Tail 5
Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\.last-run.json"
```

### Output format
Present as a single compact status table:
```
## Infra Status -- YYYY-MM-DD
| Service      | Host | Status | Details        |
|-------------|------|--------|----------------|
| pkkls_bot   | Nano | OK/DOWN | pid or down   |
| cs2-watcher | Nano | OK/DOWN | pid or down   |
| dot-proxy   | Nano | OK/DOWN | pid or down   |
| dnsmasq     | Nano | OK/DOWN | pid or down   |
| local-claude| Claw | OK/DOWN | pid or down   |
| orchestrator| PC   | OK/DOWN | last run info |
| Nano disk   | Nano | --     | usage %       |
| Nano RAM    | Nano | --     | used/total MB |
```