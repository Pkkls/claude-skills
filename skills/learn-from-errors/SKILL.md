---
name: learn-from-errors
description: Turn what went wrong in recent Claude Code sessions into durable rules in the right skill or memory, with evidence from the transcripts, then sync the claude-skills repo. Use when kil says "apprends de tes erreurs", "améliore les skills avec tes erreurs", "/learn-from-errors", at the end of any session where an attempt failed, or when the same mistake shows up twice.
---

# Learn from errors

A lesson is worth writing only if it changes what the next session does.
Evidence first, then the smallest rule that would have prevented the incident.

## 1. Collect, don't remember

Run inside ctx_execute (never read whole transcripts into context):

```
node "C:\Users\<user>\Downloads\02 - Projects\claude-skills\skills\learn-from-errors\incidents.mjs" --dry
```

One JSON line per incident since the last run: tool errors, denials and hook
blocks, and kil's corrections ("non", "affreux", "toujours pareil"...), each with
the two messages that followed (the fix, or kil's reaction). Options:
`--since 2026-10-01`, `--project <dir substring>`, `--all`. Drop `--dry` on the
last run so the next one starts after it. Add incidents the script cannot see:
a result kil rejected without an error, a step skipped, a wrong claim of "done".

## 2. Triage before writing

| # | symptom (exact text) | root cause | verified? | already written? | target |

- **Root cause**: what was actually wrong, not the first error message. A retry
  that worked after a change names the cause; a retry that worked unchanged is
  flakiness: write that.
- **Verified?**: yes only if the fix was seen working in the transcript or is
  re-checked now. Otherwise the rule says "suspected" and how to check it.
- **Already written?**: grep the target first. A rule that exists but was not
  followed needs better wording or a better place (inside the step where it
  bites), not a duplicate.
- **Drop**: typos, own code bugs fixed in the same turn with no general lesson,
  anything that only mattered to that conversation. Count them in the report.

## 3. Pick the target

| The lesson is about | Write it in |
|---|---|
| one project's workflow (store, deploy, vodloop) | that repo's `.claude/skills/<skill>/SKILL.md` |
| a cross-project task (YouTube, promo video, site bots) | `~/.claude/skills/<skill>/SKILL.md` |
| no skill fits and it will recur | a new skill: trigger-rich description, steps, "Erreurs déjà commises" |
| how kil wants me to work | memory `feedback` file + one MEMORY.md line |
| tool or harness behaviour (hooks, shells, MCP limits) | memory, linked from the skills that hit it |

## 4. Write the rule

- `- YYYY-MM-DD : <exact symptom> → <cause> → <what works: exact command, selector, path or value>.`
- Imperative, no story, one line when possible.
- Put it where the reader will be at that moment: in the step it concerns, and
  in "Erreurs déjà commises" only as the index.
- When a list passes ~10 entries, fold repeated lessons into the steps and
  delete the entries they replace. A skill gets shorter as it matures.
- Never: secrets, passwords, tokens, personal data, streamer or third-party names.

## 5. Ship

A new skill folder must first exist in the repo (`skills/<name>` or
`projects/<repo>/<name>`), or the sync skips it. Then:

```
powershell -File "C:\Users\<user>\Downloads\02 - Projects\claude-skills\sync.ps1"
```

Project repos (vodloop, kick-chat-translator) keep their skill edits uncommitted
unless kil asks: say so in the report.

## 6. Report

Incidents found / lessons written / dropped (with why), every changed file as an
absolute path, the sync commit hash, and the unverified lessons listed as such.
