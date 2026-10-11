---
model: haiku
---

# CS2 Skin Radar — Manual Scan

Run the CS2 Skin Radar analysis manually and report results.

## Instructions

1. Execute the radar:
   ```
   cd /d "C:\Users\<user>\Downloads\02 - Projects\cs2-skin-radar" && .venv\Scripts\python.exe main.py
   ```
   Use PowerShell (not Bash — needs Windows venv path).

2. Wait for completion. Read the last 20 lines of output for the summary.

3. If it fails with import errors: check `.venv` exists, run `pip install -r requirements.txt` if needed.

4. Report: number of skins analyzed, top signals found, any errors.

## Notes
- The script sends results to Telegram bot @cs2skinradar_bot automatically.
- Data is stored in `data/` directory (SQLite + JSON).
- Config in `config.py` and `.env`.