---
name: vodloop-ops
description: Run the vodloop 24/7 Kick rebroadcast end to end - health check in one command, diagnose airing and diversity, change and deploy the Oracle v2 code, test chat commands against the state and in the live Kick chat, manage channel rewards and the About panels through the Chrome MCP, place Kick VODs by their frames, act on the board's SD card and on the PC filler (remplisseur). Use whenever the user mentions vodloop, nanatty247, the 24/7 channel, its chat bot or commands (!stay, !skip, !schedule...), its rewards or panels, the board/hangar/SD, the remplisseur, Oracle, or says the channel loops, lacks variety, runs dry, or a command does nothing.
---

# vodloop-ops

Repo `C:/Users/<user>/Downloads/02 - Projects/vodloop`, branch `nanatty247-channel`.
Run every command from there. What runs is v2 (`v2/oracle/*` on Oracle
`/home/ubuntu/v2/bin`, `v2/claw/hangar` on the board, `v2/pc/remplisseur.py` on
the PC, `v2/nano/veille.sh` on the Nano). `bin/` and `app/` are v1, stopped since
2026-09-17: never diagnose from them.

## Start here (every session)

1. Prerequisites, already in place on kil's PC: `deploy/hosts.env` (gitignored,
   keys `ORACLE ORACLE_KEY CLAW CLAW_KEY`, format in `tools/drift.py` header),
   `ssh oracle` alias in `~/.ssh/config`, the claw key inside WSL. If one is missing,
   tools exit with "adresses manquantes": ask kil for that one thing, never guess hosts.
2. `python tools/gate.py` - one pass, real N/N (7/7 on 2026-10-08, ~3 min): dead
   names in the suites, guard rules, relay, drift deployed vs committed, the v2
   suite run **against the deployed modules on Oracle**, every chat command against
   the live state (read only). `--local` skips the network (4/4), `--witness`
   proves each check can go red. Anything under N/N is the first thing to fix.
3. Read the last section of `HANDOFF.md` (gitignored, local notes) for what is
   pending.

kil's standing rule (2026-10-05): never ask him questions about vodloop, decide
and act. Exception: "evaluate", "réfléchis", "propose" = report only, write
nothing, and tell any agent you started to undo what it wrote.

## Machines

| | Access | Holds |
|---|---|---|
| Oracle | `ssh oracle`, `scp ... oracle:` | channel `/home/ubuntu/v2/nanatty247` (`state/`, `queue/`, `aired/`, `log/`, `channel.env`), code `/home/ubuntu/v2/bin`, `board-history.txt`, services `vodloop-v2-{push,feed,cut,bot,dash}@nanatty247`, cron `supply.py` (10 min), `watch.py --apply` (5 min) |
| Board (Claw) | `MSYS_NO_PATHCONV=1 wsl ssh -i /home/<user>/.ssh/claw_key root@<claw-ip>` | `/root/v2/hangar.conf`, SD stock `/root/v2/hangar/nanatty247/`, `pieces.tsv`, `walls.tsv`, `fetched.tsv`, `hangar.log` (local time, UTC+2) |
| PC | local | remplisseur `dist/vodloop-remplisseur.exe` (two processes is normal: PyInstaller onefile), panel and API `http://127.0.0.1:8791/api/state`, parts on `D:/vodloop-remplisseur/part/`, log `%LOCALAPPDATA%/vodloop-remplisseur/`. Tasks `vodloop-remplisseur-garde` (10 min, relaunches it `--fond`), `vodloop-weekly` (`E:\vodloop\hd\weekly.py`, outside the repo) |
| Nano | `wsl ssh -i /home/<user>/.ssh/nano_key root@<nano-ip>` | `/usr/local/bin/vodloop-veille` (cron `*/10`, restarts the board's crond), log `/root/vodloop-veille.log` |

`channel.env` holds the Kick stream key and the Telegram token: never print it
whole, grep the keys you need.

Flow: the PC downloads whole videos (yt-dlp), fresh broadcast days first, and
copies them to the SD; the board cuts one random hour at a time and ships it to
Oracle on demand, least busy day first; Oracle cuts into 5 min chunks and pushes
to Kick. The PC also sends hours straight to Oracle until `want.json`
`distinct_seconds` (one hour per broadcast day waiting) reaches 30 h. What the
PC copied or sent stays for good in `D:/vodloop-remplisseur/archive` (videos go
private on YouTube: it may be the last copy). After 45 min without the PC's beat
(`state/pc_beat`), `watch.py` hands downloads back to the board
(`board_ctl.json` pause=0) and takes them back when the PC returns.

Rules on air, stock target, what is missing to run forever, and the
2026-10-08 losses: `ops/diffusion.txt` (kil's own reference, keep it current).
Rebroadcast audit and lessons: the `vodloop-repeats` skill.

## Facts that cost a day each to learn

- Since 2026-09-28 the board ships **one random hour** of a stocked stream at a time.
  Files and `aired.tsv` lines are **piece keys** `p` + first 8 chars of the id + hour
  (`pZTwp8wz403`), never equal to an 11-char YouTube id. Any lookup by id must map
  the piece back (`supply.as_videos`, `chan.country_of(title, vid)`).
- "Same streams every day" is the drip of one stream's hours over several days,
  not a replay. Check `units.tsv` for literal repeats before believing a loop.
- `hangar.conf` overrides hangar defaults (`RECENT=1000` there). Read it before
  reasoning about the board's draw.
- The bot speaks as account 130390208, a plain viewer: no badge, 15 s cooldown.
  Kick sends its replies back as webhooks; the bot skips them by `message_id`.
  A command sent through the API arrives as that account, so owner-only commands
  (`!givepoints`) are refused that way by design: edit `bot.json` with a backup.
- Countries come from titles (`chan.PLACES`, flags as last resort). Kick VODs name
  no place: they are `kick vods` unless `chan.KICK_VOD_PLACES` holds proof.
  **kil: a Kick VOD is not Japan by default.** Never infer a place by date or habit.
- `EXCLUDE_COUNTRIES` bans a country from every tier; files of it on the SD are dead weight.
- `state/rejected.tsv` is permanent (unfetchable, wrong format). A country whose
  every video is in it does not exist for the viewers, whatever the catalogue
  says (Vietnam on 2026-10-08). `supply.excluded()` also holds what aired within
  `REFETCH_DAYS`, which is temporary: count the two apart.
- `!travel <place>`: a city is a text search in titles, a country also matches by
  `country_of`, so frame-placed Kick VODs answer to their country only.
- kil, 2026-10-08: no stream twice within 24 h (`DAY_APART_HOURS`, cut.draw).
  Chunks cut but not sent count as on air. Supply asks with at most one hour per
  stream counted (`supply.one_hour_each`) and `ship_next` prefers streams with
  nothing waiting. Check: no `aucun stream repose` in `log/` and, per recording,
  one airing per 24 h in `units.tsv`. The title carries `youtu.be/<id>`.
- `walls.tsv` keeps the whole history: count walls over the last 24 h by
  timestamp, never its raw line count.
- SD under ~22 GB free with videos waiting on the PC is a full card, by design,
  not a stalled copy.

## Diagnose

1. `python tools/gate.py` (see above); `python tools/drift.py` alone for drift detail.
2. On Oracle: `state/want.json` (`runway_seconds`, `queue_files`), `tail log/supply.log`
   (`candidats N/M`), `state/aired.tsv`, `state/units.tsv` (one line per 5 min
   chunk aired), `state/pulse.jsonl` (`cmd` events with `out`: answered / silent /
   unknown / cooldown / error).
3. `tools/stock.py` (ssh line in its docstring) for what the channel holds and can get.
4. Channel dry or low: PC API (`queued`, `copy`, `error`, `paused`), SD `df /root`,
   board `hangar.log`, walls over 24 h. The on-call runbook `ops/ingenieur.txt`
   lists the known repairs and their limits; follow it rather than improvise.
5. Analyse with a script on the box, print only the answer. Old tracebacks in
   logs: check their date and that the code line still exists before blaming
   current code.

## Change code

- Edit `v2/oracle/*`, keep LF endings, match the comment style (dated, measured).
- Tests: `PYTHONIOENCODING=utf-8 python tests/test_v2.py` (not `-I`: needs
  `requests`), other suites in `tests/`. All must pass; a test that expected the
  old behaviour is updated, not deleted. After renaming or deleting a function,
  `python tools/deadrefs.py`: a suite that dies on AttributeError checks nothing
  after that line.
- Before deploying a classifier or ranking change, diff old vs new on the real
  catalogue on Oracle (load the deployed module with importlib as `old`) and show
  that only the intended rows move.

## Deploy

`python tools/deploy.py <file.py ...> [--restart bot|cut|dash ...]`
backs up as `.avant-deploy-<epoch>`, compiles on Oracle before swapping, checks
md5 for every file, prints the pusher PID before/after. Never restart the
pusher (ends the broadcast). The feeder only by hand, it blinks. `supply.py`
runs from cron every 10 min: verify the next `candidats` line after deploying it.
Restarting the bot re-runs `sync_rewards()`, which creates missing Kick rewards.
Pass bare names (`deploy.py cut.py`), not `v2/oracle/cut.py`: it prefixes the
path itself and says "absent". `supply.py` without `--apply` writes no
`want.json`: to see a change, wait for the cron line (every 10 min).
Done = `python tools/gate.py` back at N/N (drift 0, suite green on the deployed code).
`state/unlisted.tsv` (since 4528e2c) is written only by `refresh_catalog`, once per
24 h (`CATALOG_TTL`): its absence right after a deploy is not a failure.

## Test chat commands

1. Against the real state, read only: `tools/cmds.py` (docstring has the ssh line;
   also run by `gate.py`). It stubs every action and lists what it would have done.
   Never call bot functions on the live state any other way: on 2026-10-08 an
   unstubbed run skipped the stream and forced a pick.
2. Full matrix by role (viewer/og/mod/owner) on a hardlinked copy: copy
   `state/` for real (`cp -a`), hardlink media dirs (`cp -al`), copy every module
   for real (a symlinked module puts the deployed dir first on `sys.path` and the
   old `bot.py` gets imported), replace `kickapi` functions before `import bot`.
3. Live: `tools/livechat.py "!cmd" ...` on Oracle. Public, acts on the stream,
   one message per 17 s. Exit 0 only if every command was seen and answered.

## Kick channel (Chrome MCP)

Load the Chrome tools in one ToolSearch, open a new tab, check the logged-in
account is **Nanatty247** (top right avatar / heading) before any edit; if not,
ask kil to switch, never type a password.
- Which account (2026-10-10): `find` "signed-in user avatar button" gives its name
  (one browser was on **StormRock**, not Nanatty247), or in a page
  `fetch('/api/v1/user')` gives `username` (null = logged out). Several Chrome
  extensions may be connected: each one is a different account; switching
  browsers drops the previous one from the MCP. A Playwright MCP window kil
  logged into in an earlier session comes back logged out after a restart: the
  login does not survive it. Check before promising an edit.
- Live panels can be read without any login: `GET kick.com/api/v2/channels/nanatty247/links`
  lists them (order, id, image URL, created/updated). Compare the images with
  `kick-panels/*.png` to know which still need uploading.
- Panels: source `kick-panels/src/panels.html`, render `cd kick-panels/src && python render.py`
  (every panel must print OK: max 2x width). Look at each PNG. On
  `kick.com/nanatty247/about`: "Éditer le panneau", `find` the 5 file inputs,
  `file_upload` the PNG on the right one, click that card's "Mise à jour", wait for
  "Votre panneau a été mis à jour", then reload the public page and look.
  Click by screenshot coordinates: `getBoundingClientRect` from javascript_tool is
  in CSS pixels and missed the button once. If "Éditer le panneau" does not open
  the editor via its ref, click it from a screenshot.
  Only the cards whose image changed get "Mise à jour"; after rendering, restore
  the untouched PNGs with `git checkout` so only the edited panel is committed.
- Places panel: list only places proven to resolve. On Oracle, with a copy of the
  modules, for each place count `bot.place_match` hits over the shelf and over
  `supply.catalog_titles()` minus `supply.excluded()`, read only. Zero, or all
  rejected, means it leaves the panel.
- Pin a chat message (2026-10-08): on `kick.com/nanatty247`, type it as Nanatty247
  (the bot account cannot pin). A click by coordinates on the input did not focus
  it and the typed text was lost: `find` the chat textbox, click its ref, type,
  zoom on the input to check the text, Enter. Hover the sent message, `find` the
  "Épingler" button and click its ref (the trash icon sits right next to it).
  Done when the banner "Envoyé par Nanatty247" with the text shows at the top of
  the chat. Send kil's text verbatim, flag an apparent typo in the report.
- `!stay` / Stay reward: removed and deployed 2026-10-08, reward deleted on
  Kick. kil: "l'infra ne permet pas de tenir" (one hour per file, a day rests
  24 h). Panels 2 and 3 rendered without it; on 2026-10-10 the live ones still
  show Stay (checked through the links API), upload still pending a Nanatty247 login.
- Rewards: defined in `bot.REWARDS`; created on bot restart, costs pushed only by
  `bot.py --rewards`. Check with `kickapi.rewards()` on Oracle.
- Avatar and banner: `python tools/brand.py nanatty247 [outdir]`.

## Place Kick VODs

List them (`chan.country_of(title) == chan.KICK_VODS` over `catalog.tsv`, id + yymmdd),
`python tools/vodframes.py list.txt outdir`, read every sheet. Add to
`chan.KICK_VOD_PLACES` (key = first 8 chars of the id) only with a readable sign,
evidence in the comment. Then verify each key matches exactly one catalogue id
with the same date (ids mix `l`/`I` and `v`/`w` on sheets), test, diff, deploy.

## Board / SD / PC

Read `hangar.conf`, `hangar.log`, the SD listing first. The hangar lock
(`/tmp/hangar.lock`) is held during a download, which also stops shipping and
the history push to Oracle. Delete on the SD only by explicit full paths listed
just before, never by glob.
- Remplisseur stuck (no copy for 1 h, videos queued, SD over 22 GB free):
  `POST /api/quit` on 8791, then relaunch `dist\vodloop-remplisseur.exe --fond`.
  Rebuild as done on 2026-10-10 (no .spec is kept): run
  `tests/test_remplisseur_gone.py` and `tests/test_remplisseur_hours.py`; build to a
  scratch dir, never over the running exe: from `v2/pc`,
  `python -m PyInstaller --noconfirm --onefile --noconsole --name vodloop-remplisseur --distpath <tmp>/dist --workpath <tmp>/build --specpath <tmp> --add-data "<abs>/v2/pc/panel.html;." remplisseur.py`;
  pick a moment with no download (`/api/state` downloads empty, no yt-dlp.exe);
  `POST /api/quit`, wait for 0 processes, keep the old exe as
  `dist/vodloop-remplisseur.exe.avant-<epoch>`, copy the new one, then
  `schtasks /run /tn vodloop-remplisseur-garde` (starts it with its real args and
  dir). Done = `/api/state` answers and the log has no Traceback after the restart.
  `curl` in Bash is blocked by the context-mode hook here: run these in ctx_execute.
  Code change: edit `v2/pc/remplisseur.py`, rebuild with PyInstaller
  `--onefile --noconsole`, quit the running one first (single instance by port).
  Build from `v2/pc` with `--add-data "<absolute path>/panel.html;."` when
  `--specpath` points elsewhere. Quitting an older build leaves yt-dlp running
  (yt-dlp.exe is two processes plus ffmpeg): `taskkill /IM yt-dlp.exe /T /F`
  after the quit, before relaunching, or the orphan holds its `.part`.
- Never delete media to make room or variety (videos get made private): see
  the `vodloop-repeats` skill, "My mistakes".
- YouTube "Sign in to confirm you're not a bot": `python tools/cookies.py --check
  <jar>` then `--install` (never read the jar yourself).
- PC as a bulk relay to Oracle: `python tools/relay.py --plan` first.
- Irreplaceable state backup (registries, catalogue, bot state, ~124 KB):
  `python tools/statesave.py` (dry run), `--pull` to `backups/<chan>/<date>/`.

## Finish

Commit on `nanatty247-channel` (imperative title, no em dash, Co-Authored-By line),
push, and log the session in `HANDOFF.md` with deployed md5s. Report the
`gate.py` N/N you ended on.
