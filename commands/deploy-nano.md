---
model: haiku
---

# Deploy to Lichee Nano

Deploy files to the Lichee Nano (<nano-ip>) via SSH.

## Usage
`/deploy-nano <local-path> <remote-path>`

If no args provided, ask the user what to deploy.

## Instructions

1. Read the file(s) at the local path
2. For each file, base64-encode the content (strip Windows CRLF → LF first)
3. SSH upload via: `wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip> "echo <b64> | base64 -d > <remote-path>; chmod +x <remote-path>"`
4. Verify: SSH back and `ls -la <remote-path>` + `head -1 <remote-path>`
5. If the file is a service script (init.d, cron), ask if the user wants to restart/reload it

## Important
- NEVER pipe stdin from PowerShell (BOM+CRLF corruption) — always use base64 argument
- busybox on nano: use `killall` not `pkill`
- `killall -HUP dnsmasq` to reload DNS config without restart