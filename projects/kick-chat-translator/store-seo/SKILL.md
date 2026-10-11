---
name: store-seo
description: Audit and improve how Kick Chat Translator is found and chosen on the Chrome Web Store and addons.mozilla.org, in each of its eleven listing languages. Covers the name, the short and detailed descriptions, the screenshots, keyword research and ranking. Use it whenever the user mentions store SEO or ASO, listing optimization, keywords, the store ranking or position, installs, impressions or users per country, the store screenshots, or the extension's name or summary in some language. Also use it for "why don't people find the extension" or a request to rewrite or translate the store texts, even when the user never says "SEO". To ship a release to the stores, use publish-stores.
---

# Store SEO

The listing is found through three fields per language: the name, the short description and the detailed
description. It is then chosen on its screenshots. This skill measures where the listing stands, finds
the queries worth ranking for, changes the fields and proves the change reached the stores. Everything the
stores show comes from this repository, so every change is a diff that can be reviewed.

## Where each field lives

| Field | Store | Source | Limit | Reaches the store by |
|---|---|---|---|---|
| Name | both | `public/_locales/<dir>/messages.json` → `extName` | 45 (test) | the package (Chrome); the package and `amo.mjs listing` (AMO) |
| Short description | Chrome | same file → `extDescription` | 132 | the package |
| Summary | AMO | `store/amo/summary/<lang>.txt` | 250 | `amo.mjs listing` |
| Detailed description | Chrome | `store/chrome/description/<lang>.txt` | 16000 | kil pastes it in the dashboard, since no API can set it |
| Description | AMO | `store/amo/description/<lang>.txt` | 15000 | `amo.mjs listing` |
| Screenshots | Chrome | `test/e2e/store-fixture/<lang>/01..05.png` | 1280x800 | kil uploads them in the dashboard, per language |
| Target queries | both | `store/keywords.json` | | read by `rank.mjs` |

The listing languages are `en fr es pt-BR tr ru ar ja ko zh cs`. The `_locales` directories are spelled
the Chrome way: `pt_BR` and `zh_CN`. Chrome ignores a bare `pt` or `zh`, and `locales.test.ts` enforces
this. AMO has no Arabic locale. `store/README.md` has the text rules: no em or en dash, accents in every
paragraph of 120+ characters, no version number in a description, and the tone of each language.

## 1. Measure before touching anything

```bash
node scripts/stores/rank.mjs      # position per query and language, Chrome users, AMO daily users
node scripts/stores/verify.mjs    # what each store serves, compared with the repository
```

`rank.mjs` reads the first page of Chrome's search, which is its ten server-rendered results, so "-"
means "not in the top 10". On AMO it reads the first 50 results. The weekly `Stores verify` workflow runs
both and writes the ranking table to the job summary, so the history lives in the Actions tab.

Installs and impressions per country exist only in the dashboards: the Chrome Developer Dashboard (item >
Analytics) and the AMO Developer Hub (the add-on's Statistics). Neither page can be scripted from here:
Chrome forbids automation of the Web Store (see publish-stores). Ask kil for the figures, and name the
site each time.

Baseline, 2026-09-26, before the localised names shipped:

| | Chrome | AMO |
|---|---|---|
| users | 138 | 5 daily |
| "kick chat translator", every language | 1 | 1 |
| "kick translator" (en) | 2 | 21 |
| "live chat translator" / "chat translator" (en) | - / - | 18 / 28 |
| generic "chat translator" in fr, es, pt-BR, tr, ru, ar, cs | - | - |
| "kick チャット 翻訳" (ja) | 4 | 1 |

What this says: the brand query is won everywhere. The upside is the generic query of each language
("traducteur chat", "tradutor de chat", "переводчик чата"...), where the listing did not appear at all.

## 2. Keyword research

Three free sources, no key needed:

- Google suggest: `https://suggestqueries.google.com/complete/search?client=firefox&hl=<hl>&q=<seed>`.
  It returns what people type. An empty answer means nobody types that query often enough.
- Chrome's search page: `https://chromewebstore.google.com/search/<q>?hl=<hl>`. The item ids of its first
  ten results are in the HTML as `/detail/<slug>/<32 letters a-p>`.
- AMO's search API: `https://addons.mozilla.org/api/v5/addons/search/?q=<q>&app=firefox&type=extension&lang=<locale>`.

Seed each language with the brand plus the local words for "chat", "translator", "translate", "live" and
"extension". Keep the queries that suggest returns. Found on 2026-09-26: queries naming Kick have almost
no suggestions outside English, while the generic ones do. That is why the names now end with the generic
query of their language. "twitch chat translator" is heavily searched, but the extension does not work on
Twitch, so it stays out of the name: that would be misleading metadata, which both stores reject.

Record the queries worth tracking in `store/keywords.json`, with "kick chat translator" first in each
language as the control.

## 3. Audit

This method is adapted from ASOScan's metadata-audit. Score each language on five points, and always print
the score with its denominator:

1. The name carries the brand and the generic query of that language.
2. The short description (Chrome) and the summary (AMO) name Kick, the chat and translation, in words that
   language searches with.
3. The first paragraph of the detailed description carries the generic query. Chrome shows it first and
   indexes it.
4. Nothing goes stale: no version number, and the "what's new" part sits below the features.
5. The screenshots are in that language: the chat translated into it, the interface in it (English for
   Czech, which the interface does not speak yet), and the reply typed in it.

The total is out of 55 (11 languages x 5). A full score means the fields are complete and in place. It
says nothing about whether the copy is good or whether the listing will rank, so read the text yourself
too, and treat any gain as a hypothesis until `rank.mjs` shows it.

Report with this template:

```
### Store SEO audit, <date>
Score: <n>/55   (Chrome users <n>, AMO daily users <n>)

Quick wins:
1. <field> <lang>: "<current>" -> "<new>" (<chars>/<limit>), <why: which query, what evidence>

Field by field, per language that loses points:
- <lang> name (<used>/45): "<current>" -> "<new>", <why>
- <lang> short description (<used>/132): ...
- <lang> first paragraph: ...
- <lang> screenshots: ...

Ranking since the last run: <query> <lang> <old> -> <new>
```

Every suggestion comes as the exact text with its character count, and tied to a query from section 2 or
to a measurement. Do not make up claims, awards or superlatives ("best", "#1"), and do not promise a rank.

## 4. Change the fields

- Edit the files in the table, never a store form. Then run:
  ```bash
  npm test                                   # locales.test.ts: name <= 45 and starts with the brand, blurb <= 132
  node scripts/stores/payloads.mjs <dir>     # refuses dashes, lost accents, versions, AMO summary > 250
  py test/audits/audit_fiche.py              # field limits, permissions justified
  ```
- Write the name as the brand, then the generic query: `Kick Chat Translator: <query>`. Use French
  spacing before the colon in French, and a full-width colon in Japanese and Chinese. Do not stack
  keywords, since both stores penalise keyword spam in names.
- `package.json`'s `description` must equal the English `extDescription` (a test enforces it).
- Translations have no native reviewer. Check each paragraph by translating it back to English, and keep
  the tone of the text around it: the Turkish description says "sen" while its blurb says "siz", as the
  blurb always has.
- A change to the name or short description ships only with a release. That means a version tag and the
  publish-stores workflow. The Chrome detailed descriptions and screenshots then wait for kil: regenerate
  the copy page (https://claude.ai/artifact/CZ28h6CwWsMeFVjUWFNNwu) from `payloads.mjs`'s
  `cws-description-<lang>.txt`, and give him the screenshot folder path.
- After approval, `verify.mjs` must come back clean, and `rank.mjs` measures the effect a week later.

## 5. Screenshots

```bash
node test/e2e/store-shots-fixture.mjs --lang=ko       # one listing language, into test/e2e/store-fixture/ko/
node test/e2e/store-shots-fixture.mjs --gif           # English, plus the README images and readme/demo.gif
```

It needs Playwright (`UX_KIT`, see the README), plus ffmpeg for `--gif`. Add `KT_HEADLESS=1` to run without
a window. The room is made up: invented handles, a local fake engine, and the lines of every language in
`test/e2e/store-shots-lines.mjs`. Each image is checked for its subject before it counts. After an
English run, copy `test/e2e/readme/*` into `screenshots/` for the README.

Never take store images with `store-shots.mjs`. It follows a real live channel, and on 2026-09-26 it
landed on a stream whose chat was abusive, with real people's handles in the frame.

Things the fixture has to imitate from Kick, each learned by a broken image:
- `#channel-chatroom` clips (`overflow: hidden`). The language panel sizes itself on the ancestor that
  clips its button. Without that ancestor it fell back to the button's own box and came out 80 px tall,
  with the list spilling over the chat in all eleven languages. The row count check still passed, so the
  panel check now also requires the list to fit inside its panel.
- The compose box applies a synthetic `beforeinput` the way Lexical does. Tab inserts the translation
  through one, which a plain contenteditable ignores.
- The compose preview's visibility is `data-state="ready"`, not a `hidden` attribute. The old check tested
  the attribute and was always true.
- Typing again the exact text that was already previewed does not reopen the preview. The GIF reloads
  the page first.

## Journal

2026-09-26, first pass (branch `feat/store-seo`): localised names and blurbs in 11 languages, the AMO name
sent by the API, Chrome descriptions reordered (a keyword hook first, the features, then what's new),
`keywords.json`, `rank.mjs` in the weekly workflow, the fixture harness localised (55 images) plus a GIF,
and the READMEs rewritten in 4 languages. Measure the effect with `rank.mjs` once the release is live.

2026-10-09, conversion pass (branch `claude/store-listing-vkyd3t`): aimed at the install rate (85 installs for
210 first visits, 40.5%), not the ranking. Both descriptions in 11 languages rebuilt as a hook with the generic
query, a "can't follow the chat?" paragraph, three numbered steps, a "•" feature list, privacy, open source. The
long "what's new" block left the Chrome descriptions: it went stale with each release and buried the features;
`notes/` and the GitHub releases carry it. Blurbs and AMO summaries now lead with "free". Measure with the
dashboards' install/visit ratio a few weeks after it ships, against 40.5%.
