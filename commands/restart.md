---
model: haiku
---

# Restart Service

Restart a specific service on Nano, Claw, or PC.

## Usage
`/restart <service>` where service is: pkkls, watcher, dot-proxy, dnsmasq, claw-bot, orchestrator, all-nano

## Instructions

### Nano services (<nano-ip>)
SSH prefix: `wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip>`

- **pkkls**: `killall python3; sleep 1; nohup python3 /opt/pkkls_bot.py >> /tmp/pkkls_bot.log 2>&1 &`
  WARNING: killall python3 kills ALL python — use only if watcher restart is OK too.
  Safer: `kill $(ps | grep pkkls_bot | grep -v grep | awk '{print $1}'); nohup python3 /opt/pkkls_bot.py >> /tmp/pkkls_bot.log 2>&1 &`

- **watcher**: `kill $(ps | grep item_watcher | grep -v grep | awk '{print $1}'); cd /root/cs2-watcher && nohup python3 -m src.item_watcher >> /tmp/cs2_watcher.log 2>&1 &`

- **dot-proxy**: `/etc/init.d/S55dot-proxy stop; /etc/init.d/S55dot-proxy start`

- **dnsmasq**: `/etc/init.d/S60dnsmasq restart`

- **all-nano**: Run keepalive-all.sh after killing services: `killall python3 dot-proxy dnsmasq 2>/dev/null; sleep 2; /usr/local/bin/keepalive-all.sh; /etc/init.d/S60dnsmasq start`

### Claw bot (<claw-ip>)
SSH prefix: `wsl ssh -i /home/<user>/.ssh/claw_key root@<claw-ip>`
- **claw-bot**: `/etc/init.d/S90localbot restart`

### Windows
- **orchestrator**: Kill and relaunch via `Start-Process wscript.exe -ArgumentList '"C:\Users\<user>\Downloads\filefs\orchestrator\run_silent.vbs"'`

After restart, verify the service is running.