---
name: site-relearn
description: 'Re-learn a site a Playwright/Puppeteer/Selenium bot or scraper automates after it changed: crawl, diff, audit the selectors and UI texts the bot uses, adapt and verify on logs. Use when a bot stopped working, farms less, got slower, or kil says the site changed, "a été mis à jour", "rescanner/réapprendre le site", "mettre le bot à jour".'
---

# Site relearn

A bot encodes yesterday's website: button labels, page paths, which tab is open by default, what a list contains.
When the site moves, the bot rarely crashes. It silently does something worse (farms a weak zone forever, skips a
feature, clicks the wrong thing). This skill rebuilds the bot's picture of the site from evidence, then changes
the bot where the evidence says it is wrong.

Work in this order. Each step feeds the next, and skipping the evidence steps is how you end up patching symptoms.

## 1. Measure the symptom before touching anything

Find the bot's own record of what it does (log file, state file, dashboard API, database) and quantify the
problem: a rate per hour before and after, a counter that stopped moving, an action that now repeats every cycle.
Locate the moment it changed, and what the bot was deciding right then.

This number is the success criterion for the whole job, and it often points straight at the cause (a decision
line like "target 209, picked zone 52-60" says more than any crawl).

## 2. Crawl the whole site, not just the menu

Menus get reorganised; pages drop out of them but stay reachable from inside other pages. Default views are often
filtered ("my level", "my items", page 1 of N) while the full list lives behind a tab or a query parameter
(`?toutes=1`, `?all=1`, `?tab=...`).

Prefer, in order:
1. **The bot's own crawler**, if it has one: it uses the logged-in session and the bot's rate limiter. Check it
   follows links inside pages (not only the nav) and opens tabs; extend it if not.
2. **`scripts/crawl.mjs`** from this skill, run from the bot's project folder (it loads that folder's Playwright):
   ```
   node <skill>/scripts/crawl.mjs --base https://site.tld --out dump/crawl --profile <bot profile> --copy-profile
   ```
   `--copy-profile` crawls a copy when the bot holds a lock on its browser profile. `--cdp <url>` attaches to a
   running Chrome instead. `--keep toutes,tab,...` lists query parameters that select a view (kept), every other
   parameter is treated as an id (dropped) so the crawl does not explode over items. `--max` caps pages.

The crawler only ever clicks `role=tab` elements: tabs change what is shown, never game or account state. It stops
on HTTP 429. Mind the rate: if the bot is running against the same site, crawl through the bot, or pause it, or
crawl slowly (`--wait 4000`), since two clients from one IP can trigger the site's limiter and stall the bot.

Output: `pages/*.txt` (text, one section per tab), `site-map.json` (headings, tabs, buttons per page, numbers
masked), `site-changes.txt` (diff against the previous crawl; the first crawl is the reference). If older dumps
exist from before the change (the bot's own `dump/`, git history), keep them: they are the only "before" picture.

## 3. Audit the bot's dependencies against the fresh pages

```
node <skill>/scripts/audit.mjs --src bot.mjs[,other.js] --pages dump/crawl/pages[,dump] [--json audit.json]
```

It lists every UI text the code relies on (role names, getByText, hasText, `:has-text`, goto paths, and
French/English words inside regexes applied to page text) as FOUND, MISSING or DYNAMIC, with source lines.

Read MISSING as "investigate", not "broken":
- regexes that parse the bot's own log or state lines show up as MISSING, ignore them;
- a label can exist only in a state the crawl did not reach (mid-fight, after a click, a popup), check the
  bot's state-specific dumps for those;
- CSS `text-transform` makes `innerText` uppercase while the DOM text is not: compare case-insensitively before
  calling it renamed;
- a label that moved inside a tab will show as FOUND only if the crawl opened that tab.

DYNAMIC entries (built from variables) need a quick human look at the code.

## 4. Think it through: what changed, and what does the bot believe that is no longer true?

Write the reasoning down for the user, briefly, as findings with evidence. Typical classes, all seen in practice:

- **Filtered default view**: the page the bot reads now shows a subset (current-level zones only), so every
  decision built on "the list" is capped. Fix: read the full view (`?all`, the "all" tab), not the default.
- **Stale cache**: a list read once per launch, still trusted after the player/account changed (level, prestige,
  region). Fix: refresh on the change that invalidates it, and merge rather than replace.
- **Fallback that hides failure**: `find(...) ?? lastItem` quietly picks something wrong forever; an exit
  condition that the new situation can never meet (a "climb until defeat" loop in a zone it cannot lose). Fix: make
  the "nothing better" case explicit and exit the mode.
- **Renamed or moved control**: label or path changed, the bot's click times out or a `.catch(() => {})` swallows
  it. Fix: new label, ideally a role-based locator that survives wording changes.
- **New feature**: a page, tab or button with no counterpart in the code. Decide with the user's goals what the
  bot should do with it (see step 5).
- **Repeated work**: a costly step queued every cycle instead of on change (rebuild after every fight). Fix:
  trigger it on the event that actually requires it.
- **Probing instead of reading**: the bot learns a constraint (locked item, level requirement, sold out) only by
  opening each target and getting refused, one request per target, which turns into a request storm and gets
  rate-limited. Lists usually already show it ("Niveau 185 requis" in red on the card). Fix: parse the constraint
  from the list page once, filter before choosing, and keep the refusal check only as a backstop.

Separate facts (crawl, logs, code lines) from hypotheses, and say which ones you verified.

## 5. Adapt the bot

Make the smallest change per finding, in the bot's own style, with a comment saying why (the site fact it relies
on, dated). For new features, design what the bot does with them:
- **Read-only discovery** (open tabs, read panels, parse new stats/buffs/equipment fields, follow new pages) is
  safe to automate fully, and it is what lets the bot keep learning on its own.
- **Actions that spend, sell, destroy, reset or send** (sell, break, buy, prestige, confirm, delete, trade,
  message) are only automated with an explicit rule from the user, scoring that the user agreed to, and the
  user's "keep when in doubt" style guards. Never let a bot press an unknown button to "see what it does".
- Make the bot notice the next change by itself: a periodic or deploy-triggered crawl, a structural diff
  (pages, tabs, headings, buttons), and a visible report (log line, dashboard, notification). Detection runs on
  its own; handlers for new actions come back to a human with the report.

## 6. Restart and verify on the symptom

- Syntax-check before restarting (`node --check`, `python -m py_compile`, ...).
- **State files**: stop the bot first (it may rewrite state every few seconds), copy the file to `.bak`, and edit
  it with the language that wrote it. Never round-trip JSON through a tool that can fail to parse it (PowerShell's
  ConvertFrom-Json rejects keys that differ only by case) and then write the result back: a failed read followed by
  a write empties the file.
- If the bot runs under a supervisor or relaunch loop, restart the process, not the supervisor, and confirm the
  new process started after the edit (process start time > file mtime).
- Watch the log until the original symptom moves: the zone/rate/counter from step 1, not "no error". Report the
  before/after numbers. If you could not observe it yet, say so and say what to watch.
- Commit with the reasoning in the message, and update the project's handoff/notes file if it has one.

## Report to the user

Findings (cause -> evidence -> fix), the before/after metric, what is verified vs still to watch, and the paths
of the crawl, audit and changed files. Mention any new feature found and not automated, and why.
