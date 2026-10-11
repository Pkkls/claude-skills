---
model: haiku
---

# Nano Backup — Manual Trigger

Trigger an encrypted backup of the Lichee Nano.

## Instructions

1. Run the backup script:
   ```powershell
   & "C:\Users\<user>\nano-backups\run-backup.cmd"
   ```

2. Check logs:
   ```powershell
   Get-Content "C:\Users\<user>\nano-backup.log" -Tail 20
   ```

3. Report: success/fail, backup size, timestamp.

## Verify (monthly)
To run integrity verification:
```powershell
& "C:\Program Files\Git\bin\bash.exe" -lc "/c/Users/<user>/nano-backups/bin/nano-verify.sh"
```