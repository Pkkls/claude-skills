---
model: haiku
---

# Steam Inventory Monitor — Manual Scan

Run the inventory monitor scan and send report.

## Instructions

1. Set environment and run:
   ```powershell
   $env:DB_PATH = "C:\Users\<user>\Downloads\filefs\mnt\user-data\outputs\csrust-monitor-v2\inventory.db"
   $env:STEAM_USER_ID = "76561198062816537"
   Set-Location "C:\Users\<user>\Downloads\02 - Projects\inventory-monitor"
   python main.py --scan --send
   ```
   `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID` viennent de l'env persistant (voir Notes), pas du prompt.

2. Report: total items, total value, notable changes.

## Notes
- Scans CS2 + Rust inventories.
- Sends daily report to Telegram bot @pkkls_bot.
- DB shared with csrust-monitor-v2.
- Secrets : poser une fois via `setx TELEGRAM_BOT_TOKEN "<token>"` et `setx TELEGRAM_CHAT_ID "<telegram-chat-id>"` (nouveaux shells les héritent). Ne jamais remettre le token en dur ici.