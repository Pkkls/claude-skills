---
name: autonomy-log
description: Steward the public autonomy-log record (Pkkls/autonomy-log), which Claude owns on kil's behalf. Use whenever kil mentions autonomy-log, the ledger, "la thèse", the record of agent errors, the 6i verdict, or asks to record, audit or catch up on what went wrong in recent agent work.
---

# autonomy-log

Checkout: `C:\Users\<user>\Downloads\02 - Projects\autonomy-log`. Public. Claude is the
steward (kil, 2026-10-10: "it's you afterward, je suis juste un interlocuteur").
English, thesis voice, in the repo. French with kil in chat.

## Start of every session

1. Read `AGENTS.md` in full. It binds, including PRC-0 and the LOOP.
2. `git fetch && git status`, then `python check_agents.py` (0 ok, 2 unpublished, 1 stop).
3. Open work: record anything new since the last entry. The 6i verdict was scored on
   2026-10-10 and finished 2026-10-11 (20 held, 5 refuted: W5, W6, W15, and W11/W12
   once the memory prose was resolved, 93/499 false, 71/93 present); its event table is
   `window-events-6i.json` here, kept out of autonomy-log because it names private work.
   Pkkls/claude-skills is PUBLIC since 2026-10-11: `sync.ps1` drops this table and
   `w1-review-6i.md`, replaces local values through `private.map` (never committed) and
   refuses to push if one remains. Its old history is Pkkls/claude-skills-private.
   `verdict-brief.txt` is history now. 60 memory claims stay unresolved (devices not
   plugged, Telegram server side, changes with no date); W11 flips back only if 19 of 60
   are false. Claim table and verdicts: scratchpad of session 21699698 (res-all.jsonl). The external read of the README is
   assigned to kil (task).

## Rules paid for (each one cost an entry)

- Push only through `sh ~/.claude/skills/autonomy-log/ship.sh` from the repo root,
  after the commit. A push chained after `echo EXIT=$?` went out red (E88).
- Never write a count you did not just derive by a command: "112 entries" and
  "9 of 9" were both written from memory on 2026-10-10 and both wrong (E85 class).
- Operator corrections typed mid-turn are `queued_command` attachments, not user
  messages. Read both channels in any transcript scan (E91). The extractor
  (`learn-from-errors/incidents.mjs`) reads both since 2026-10-10.
- Transcripts: `~/.claude/projects/` holds desktop and terminal sessions alike
  (`entrypoint` says which; kil moved to the terminal around 2026-10-02..06).
  `AppData/Roaming/Claude/local-agent-mode-sessions` holds 22 older agent-mode
  transcripts, April to July 2026, none after 2026-09-01.
- Any check added or repaired is witnessed red in a throwaway worktree
  (`git worktree add --detach <scratch> HEAD`, break, commit there, run, remove).
- Private repositories, channels, machines, accounts: mechanism only, never names.
  Check visibility with `gh repo view` before naming any repository; it moves.
- GitHub `blob/` pages answer 503 to scripts (D19): use the API or raw URLs.
- `git show rev:path` in Git Bash needs `MSYS_NO_PATHCONV=1`.
- Edit RESEARCH below `### Verdict` only: ids like `| W13 |` occur first in the
  pre-registration, and INV-13 now fails on any change above the heading (E99).
- Multi-line text with apostrophes goes through Write, never a Bash heredoc; and a
  repair is run in the same `&&` chain as what depends on it, never on the next line
  (E88 twice, then E99).
- The board: `MSYS_NO_PATHCONV=1 wsl ssh -i /home/<user>/.ssh/nano_key ...`; estimate each
  probe, read /proc/loadavg before and after, and say so if one went out without.
- Every remote probe, ANY host (boards, `ssh oracle`, others), carries a written estimate
  of what each command reads. No unbounded recursive read (the cloud host's v2 dir is
  video, E101). Wrap the remote script in the far side's own `timeout 60`: a local
  timeout leaves the remote command running. Filter `crontab -l` and env files
  (`grep -v -iE 'token|key|secret'`) before they reach disk.
- An irreversible step (publish, visibility, store submit) runs alone, in its own
  command, after the checks' output has been read. `&&` after a check that prints a
  count gates on nothing (E102, third time after E88 and E99).
- Memory is per working directory, 13 islands (D20). Rules that must bind everywhere go
  in this skill or the global instructions, not in one island.
- "Read-only" in a delegated prompt does not bind (E100): a resolver ran a writing
  `verify.py` and started adb. Before using a delegated result, check modification
  times and process start times for its run window. Extractors also import facts from
  other files into a claim's parenthesis; audit the quote, not the claim text.
- The board's state as of a past date: decrypt the backup of that day from
  `nano-backups` git history into the scratchpad (key `~/.nano-backup.key`, command in
  `bin/nano-verify.sh`), and delete it after: it holds secrets.
- A brief's leads are leads: of six on 2026-10-10, one was refuted by its own
  quote's absence from the obvious channel, one by a re-measurement.

## Authority

AST-25 (2026-10-10): reversible changes to kil's tooling (hooks, skills, memory,
extractors, the board's backup manifest) are applied, witnessed and recorded. Store
listings, repository visibility and running services' state stay proposals.

## Not to do

- Rewrite history or force-push (AST-02, AST-23). "Start from scratch" never means that.
- Fill a quiet stretch with entries (AST-17). A null result is reported, not written up.
