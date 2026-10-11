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
   once the memory prose was resolved, 83/461 false, 66/83 present); its event table is
   `window-events-6i.json` here, kept out of autonomy-log because it names private work.
   `sync.ps1` copies this whole directory to Pkkls/claude-skills (private, checked
   2026-10-11), so the table lives there too: move it out before that repo goes public.
   `verdict-brief.txt` is history now. 99 memory claims stay unresolved, 60 of them need
   Oracle; W11 flips back only if 29 of 99 are false. The external read of the README is
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
