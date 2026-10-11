// Crawl a website the way a bot sees it, and diff it against the previous crawl.
//
// node crawl.mjs --base https://site.tld --out <dir> [--profile <dir> [--copy-profile]] [--cdp http://127.0.0.1:9222]
//                [--start /,/other] [--max 60] [--wait 2500] [--keep toutes,tab,onglet,vue,mode,section]
//                [--skip "logout|deconnexion|id="] [--no-tabs] [--headed]
//
// Breadth-first over every internal link (menu, page bodies, links revealed by tabs). On each page it clicks every
// role=tab element (read-only: tabs only switch what is shown) and records headings, tabs and action buttons, with
// numbers masked so counters do not read as changes. Writes:
//   <out>/pages/<path>.txt   page text, one section per tab
//   <out>/site-map.json      { path: { title, tabs, heads, buttons, links } }
//   <out>/site-map.prev.json previous map, if any
//   <out>/site-changes.txt   what appeared / disappeared since the previous crawl
// Never clicks anything but tabs. Stops on HTTP 429 and says so.
//
// Playwright is loaded from the current directory's node_modules: run it from the bot's project folder.
import { createRequire } from 'node:module';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);
if (!args.base || !args.out) {
  console.error('usage: node crawl.mjs --base https://site.tld --out <dir> [--profile <dir>] [--cdp <url>] ...');
  process.exit(2);
}
const BASE = String(args.base).replace(/\/$/, '');
const OUT = String(args.out);
const MAX = +(args.max ?? 60);
const WAIT = +(args.wait ?? 2500);
const KEEP = new RegExp(`^(${String(args.keep ?? 'toutes,tab,onglet,vue,mode,section,all,view').split(',').join('|')})=`, 'i');
const SKIP = new RegExp(String(args.skip ?? 'logout|deconnexion|signout|/api/|delete|supprimer'), 'i');
const START = String(args.start ?? '/').split(',');

const require = createRequire(join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const key = (href) => {
  let u;
  try { u = new URL(href, BASE); } catch { return null; }
  if (u.origin !== new URL(BASE).origin) return null;
  const keep = [...u.searchParams].filter(([k, v]) => KEEP.test(`${k}=${v}`)).map(([k, v]) => `${k}=${v}`).join('&');
  return u.pathname + (keep ? `?${keep}` : '');
};
const file = (p) => (p === '/' ? '_root' : p.replace(/\W+/g, '_').replace(/^_|_$/g, '')) + '.txt';

let browser, context;
if (args.cdp) {
  browser = await chromium.connectOverCDP(String(args.cdp));
  context = browser.contexts()[0] ?? (await browser.newContext());
} else if (args.profile) {
  let dir = String(args.profile);
  if (args['copy-profile']) { // the bot holds a lock on its profile: crawl a copy (cookies and storage come along)
    const tmp = mkdtempSync(join(tmpdir(), 'crawl-profile-'));
    cpSync(dir, tmp, { recursive: true, filter: (s) => !/Singleton|lockfile|\\Cache\\|\/Cache\//i.test(s) });
    dir = tmp;
  }
  context = await chromium.launchPersistentContext(dir, { headless: !args.headed });
} else {
  browser = await chromium.launch({ headless: !args.headed });
  context = await browser.newContext();
}
const page = context.pages()[0] ?? (await context.newPage());
let throttled = false;
page.on('response', (r) => { if (r.status() === 429) throttled = true; });

mkdirSync(join(OUT, 'pages'), { recursive: true });
const seen = new Set();
const queue = START.map(key).filter(Boolean);
const map = {};

const read = () =>
  page.evaluate(() => {
    const root = document.querySelector('main') ?? document.body;
    const txt = (e) =>
      (e.innerText || e.value || e.getAttribute('aria-label') || e.title || '')
        .replace(/\s+/g, ' ').trim().replace(/\d[\d\s.,]*/g, '#').slice(0, 60);
    const uniq = (els) => [...new Set([...els].map(txt).filter((t) => t && t.length > 1))];
    return {
      title: document.title,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      tabs: uniq(root.querySelectorAll('[role=tab]')),
      heads: uniq(root.querySelectorAll('h1, h2, h3, h4, summary, legend, th, [role=heading]')),
      buttons: uniq(root.querySelectorAll('button:not([role=tab]), select, input, [role=button]')),
    };
  });

while (queue.length && Object.keys(map).length < MAX && !throttled) {
  const p = queue.shift();
  if (seen.has(p)) continue;
  seen.add(p);
  const res = await page.goto(BASE + p, { waitUntil: 'domcontentloaded' }).catch(() => null);
  if (!res) continue;
  await page.waitForTimeout(WAIT);
  if (throttled) break;
  const r = await read().catch(() => ({ title: '', links: [], tabs: [], heads: [], buttons: [] }));
  let text = await page.locator('main').innerText().catch(() => page.locator('body').innerText().catch(() => ''));
  if (!args['no-tabs']) {
    for (const name of r.tabs.slice(0, 12)) {
      const tab = page.getByRole('tab', { name, exact: true }).first();
      if (!(await tab.isVisible().catch(() => false))) continue;
      await tab.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
      const t = await read().catch(() => null);
      if (!t) continue;
      r.heads.push(...t.heads.map((h) => `${name} > ${h}`));
      r.buttons.push(...t.buttons.map((b) => `${name} > ${b}`));
      r.links.push(...t.links);
      text += `\n\n== tab ${name} ==\n` + (await page.locator('main').innerText().catch(() => ''));
    }
  }
  map[p] = { title: r.title, tabs: r.tabs, heads: [...new Set(r.heads)], buttons: [...new Set(r.buttons)], links: [] };
  writeFileSync(join(OUT, 'pages', file(p)), text);
  for (const l of r.links) {
    if (SKIP.test(l)) continue;
    const k = key(l);
    if (!k) continue;
    if (!map[p].links.includes(k)) map[p].links.push(k);
    if (!seen.has(k) && !queue.includes(k)) queue.push(k);
  }
  process.stdout.write(`${Object.keys(map).length}/${MAX} ${p}\n`);
}
await (browser ?? context).close();

const mapFile = join(OUT, 'site-map.json');
const old = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : null;
if (old) writeFileSync(join(OUT, 'site-map.prev.json'), JSON.stringify(old, null, 1));
writeFileSync(mapFile, JSON.stringify(map, null, 1));

const changes = [];
if (old) {
  for (const [p, v] of Object.entries(map)) {
    const o = old[p];
    if (!o) { changes.push(`+ page ${p}  (${[...v.tabs, ...v.heads].slice(0, 6).join(', ')})`); continue; }
    for (const k of ['tabs', 'heads', 'buttons']) {
      const add = v[k].filter((x) => !o[k]?.includes(x));
      const del = (o[k] ?? []).filter((x) => !v[k].includes(x));
      if (add.length) changes.push(`+ ${p} ${k}: ${add.join(' | ')}`);
      if (del.length) changes.push(`- ${p} ${k}: ${del.join(' | ')}`);
    }
  }
  for (const p of Object.keys(old)) if (!map[p]) changes.push(`- page ${p}`);
}
const unvisited = queue.filter((q) => !seen.has(q));
const head = [
  `${new Date().toISOString()}  ${Object.keys(map).length} pages`,
  throttled ? 'STOPPED: HTTP 429 (rate limited). Crawl incomplete, wait before retrying.' : '',
  unvisited.length ? `not visited (max ${MAX} reached): ${unvisited.slice(0, 30).join(' ')}` : '',
  old ? `${changes.length} change(s) since previous crawl` : 'first crawl: reference saved, no diff',
].filter(Boolean);
writeFileSync(join(OUT, 'site-changes.txt'), [...head, '', ...changes].join('\n'));
console.log(head.join('\n'));
