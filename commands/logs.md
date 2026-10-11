---
model: sonnet
---

# Quick Logs Viewer

View recent logs from any service.

## Usage
`/logs <service>` where service is: orchestrator, pkkls, watcher, dot-proxy, backup, nano

## Instructions

### orchestrator
```powershell
Get-Content "C:\Users\<user>\Downloads\filefs\orchestrator\orchestrator.log" -Tail 30
```

### pkkls
```bash
wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip> "tail -30 /tmp/pkkls_bot.log"
```

### watcher
```bash
wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip> "tail -30 /tmp/cs2_watcher.log"
```

### dot-proxy
```bash
wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip> "tail -30 /tmp/dot-proxy.log"
```

### backup
```powershell
Get-Content "C:\Users\<user>\nano-backup.log" -Tail 30
```

### nano (daily-maint)
```bash
wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip> "tail -30 /root/watchdog.log"
```

If no arg given, show last 5 lines of ALL logs in parallel.