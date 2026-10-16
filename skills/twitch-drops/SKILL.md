---
name: twitch-drops
description: 'Check and steer the Twitch drops farm (gochujanglover) run by twitchd on the PC: campaigns, watched channel, progress, claims, refused subscription drops, unlinked accounts. Use when kil asks "ETAT twitch", "où en est le drop twitch", why a Twitch drop is stuck, or mentions twitchd, gochujanglover, Twitch drops, Watch to Redeem or Subscribe to Redeem.'
---

# Twitch drops (twitchd)

Farm: `twitchd` on the **PC** (not the Nano: the player is a Chromium, 128 MB is too small). Source and runtime dir: `~/Downloads/02 - Projects/kick-xp-farmer/twitchd`. Scheduled task `TwitchDrops` (at logon) runs `run-pc.ps1`, which restarts `twitchd.exe -log twitchd.log` 1 min after any exit. twitchd starts and restarts `player.js` (Playwright Chromium) itself; the player exits by itself if twitchd dies.

## Screen

`powershell -File twitch-ui.ps1` (in the twitchd dir) is the live screen, twin of `clawd-ui.ps1`: watched channel, every running campaign with its **tag**, page by page (left/right, PgUp/PgDn), **Tab** cycles a tag filter, detail of the selected campaign's drops, **P** priority, **+/-** move, **R** refuse/allow, **B** switch now, last claims and receptions, log. It only talks to the twitchd API on `127.0.0.1:8098` (`GET /api`, `POST /api/prefs`, `POST /api/switch`); priority and refusals are saved in `prefs-<compte>.json`.

Campaign tags: `REGARDEE`, `TEMPS`, `HYBRIDE` (Watch drops farmed, Subscribe drops refused), `ABONNEMENT` (only subs: refused), `NON LIE`, `A RECLAMER`, `RECLAMEE`, `REFUSEE` (by kil), `BLOQUE`.

For ETAT, the same screen as text, no console needed:
```powershell
& "$HOME\Downloads\02 - Projects\kick-xp-farmer\twitchd\twitch-ui.ps1" -Snapshot            # page 1, all tags
& "...\twitch-ui.ps1" -Snapshot -Tag TEMPS -Select 0                                         # one tag
```

## ETAT = these commands, then the table

Never print `accounts.json` or `cookies.json` (tokens).

```bash
cd "/c/Users/<user>/Downloads/02 - Projects/kick-xp-farmer/twitchd"
powershell -NoProfile -Command "(Get-ScheduledTask TwitchDrops).State; Get-Process twitchd -EA SilentlyContinue | Select Id,StartTime"
echo "regarde: $(cat watch-gochujanglover.txt)"
grep -E "watch:|CLAIM|STALL|decouverte|lecteur|session refusee|run-pc" twitchd.log | tail -12
head -2 status-gochujanglover.txt
grep -B1 ": TEMPS\|: A RECLAMER\|: RECLAME" status-gochujanglover.txt | grep -v "^--" | head -40
for k in TEMPS ABONNEMENT "COMPTE NON LIE" RECLAME "A RECLAMER"; do echo "$k: $(grep -c ": $k" status-gochujanglover.txt)"; done
```

`status-<compte>.txt` is rewritten every minute: one line per drop of every active campaign, sorted by end date, with its label:

| label | meaning |
|---|---|
| `TEMPS (Watch to Redeem) n/m min` | earned by watching: farmed |
| `ABONNEMENT (Subscribe to Redeem, N sub) REFUSE` | needs paid subs: **never farmed, never paid** (kil's rule), shown only |
| `COMPTE NON LIE (<url>)` | the game account must be linked at that URL: kil's call, never link for him |
| `A RECLAMER` / `RECLAME` | reached, claim pending / done |
| `BLOQUE` / `EXPIRE` | previous drop needed / window over |

Hybrid campaigns (one Watch drop and one Subscribe drop) are judged drop by drop.

Report: what is watched and for which campaign, the TEMPS drops in progress with minutes left, claims since last check, counts per label, and the COMPTE NON LIE campaigns kil might want to link (game + URL).

## Measuring that it really earns

The only proof is Twitch's own counter, read at the minute. Log lines `drops: X : n/m` come from the inventory and lag a little; the session is exact:

```powershell
$d = "$HOME\Downloads\02 - Projects\kick-xp-farmer\twitchd"; $a = (Get-Content "$d\accounts.json" -Raw | ConvertFrom-Json)[0]
$h = @{ 'Client-Id' = $a.app_client_id; Authorization = "OAuth $($a.app_token)" }
$login = (Get-Content "$d\watch-gochujanglover.txt").Trim()
$id = (Invoke-RestMethod https://gql.twitch.tv/gql -Method Post -Headers $h -Body (@{ query = "query { user(login:`"$login`") { id } }" } | ConvertTo-Json)).data.user.id
$b = @{ operationName = 'DropCurrentSessionContext'; variables = @{ channelID = $id; channelLogin = '' }; extensions = @{ persistedQuery = @{ version = 1; sha256Hash = '4d06b702d25d652afb9ef835d2a550031f1cf762b193523a92166f40ea3d142b' } } } | ConvertTo-Json -Depth 5
(Invoke-RestMethod https://gql.twitch.tv/gql -Method Post -Headers $h -Body $b).data.currentUser.dropCurrentSession | Select-Object currentMinutesWatched, requiredMinutesWatched
```
Run it twice, 60 s apart: expected +1. Without `channelID` the op returns `null` even while earning.

## Rules learned (2026-10-16)

- **Only a real player earns.** HLS playlist + HEAD on every segment + spade (TwitchDropsMiner's method of 2026-10-09) gave 3 min in 45 min; the playback token says `ci_gb=False`. Chromium (Playwright `channel:'chromium'` headless) gave +1 min/min. Do not "optimize" the player away.
- The player needs the **full cookie export** in `cookies.json` (`twilight-user` and `persistent` are mandatory, otherwise the page shows "Log in to Twitch"; the player then exits with code 2 and twitchd alerts). The GDPR banner must be rejected (done by player.js).
- Tokens: `auth_token` = web cookie (inventory, directory, playback); `app_token` = SmartBox client `ue6666...` from `twitchd.exe -login gochujanglover` (kil enters the code on twitch.tv/activate). The Android client `kd1un...` is refused by Twitch since early October (TDM issue #1165). The app token passes the integrity check for claims and pages the directory; the web client gets `IntegrityCheckFailed` on `dropCampaigns`, `dropCampaign`, `claimDropRewards` and page 2+ of `streams`.
- Discovery (hourly): pages of `streams(systemFilters:[DROPS_ENABLED])` then `channel(id).viewerDropCampaigns` on 2 channels per game. Max **15 aliases** per GQL query. `viewerDropCampaigns` progress is not personal: inventory wins, and `gameEventDrops` marks already-received rewards so a finished campaign is not watched again (the Fortnite Llama trap from Kick).
- Claim verified for real: `CLAIM Hearthstone Community Day / Tavern Ticket -> ELIGIBLE_FOR_ALL` on 2026-10-16 21:26, inventory `isClaimed: true`, farming went on with the next tiers by itself. `ELIGIBLE_FOR_ALL` is the success status.
- Some rewards are **granted by Twitch without any claim** (Streamer Awards badge, 2026-10-16 20:25): they only show up in `gameEventDrops`; twitchd logs `drops: RECU <name>` and lists them under DERNIERS CLAIMS. A reward at n/n with no CLAIM line is not a bug if a RECU line or a `gameEventDrops` entry exists.
- `requiredSubs > 0` = Subscribe to Redeem. Twitch Gaming badge campaigns (Witcher 3, Elden Ring, Castlevania...) are all 1 sub / 0 min.
- A campaign frozen 15 min on a channel: channel set aside 30 min; frozen on 2 channels: campaign set aside 6 h (STALL lines).
- Stop: create `twitchd/STOP` (run-pc idles) then kill `twitchd.exe` by PID; never kill `node.exe` by name (the orchestrator runs on node). Restart: delete `STOP`.
- Rebuild: `go test ./... && go build -o twitchd.exe .` needs twitchd stopped first (Windows locks the running exe).
