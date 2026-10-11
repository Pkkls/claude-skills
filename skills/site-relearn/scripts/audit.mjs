// Check every piece of UI text a bot depends on against fresh page dumps.
//
// node audit.mjs --src bot.mjs[,other.mjs] --pages <dir-of-txt-dumps>[,<dir2>] [--json out.json]
//
// Pulls from the source: getByRole(..., { name }), getByText(...), hasText, :has-text("..."), text=..., goto paths,
// and quoted UI strings inside .match(/.../) on page text. String literals are looked up as substrings
// (case-sensitive), regex literals are tested; dynamic expressions are listed as "dynamic" for a human look.
// Every page text is searched, because one selector can serve several pages.
// Output: one line per dependency: FOUND / MISSING / DYNAMIC, with source lines and where it was found.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);
if (!args.src || !args.pages) {
  console.error('usage: node audit.mjs --src bot.mjs --pages dump/ [--json out.json]');
  process.exit(2);
}

const pages = [];
for (const dir of String(args.pages).split(',')) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isFile() && /\.(txt|html?)$/i.test(f)) pages.push([f, readFileSync(p, 'utf8')]);
  }
}

const deps = new Map();
const add = (kind, raw, line, file) => {
  const k = `${kind}\u0000${raw}`;
  if (!deps.has(k)) deps.set(k, { kind, raw, where: [] });
  deps.get(k).where.push(`${file}:${line}`);
};
const PATTERNS = [
  ['role-name', /getByRole\(\s*['"][\w-]+['"]\s*,\s*\{\s*name:\s*(\/(?:\\.|[^/\n])+\/[a-z]*|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`[^`]*`|[\w.$]+)/g],
  ['text', /getByText\(\s*(\/(?:\\.|[^/\n])+\/[a-z]*|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`[^`]*`|[\w.$]+)/g],
  ['label', /getBy(?:Label|Placeholder|Title)\(\s*(\/(?:\\.|[^/\n])+\/[a-z]*|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/g],
  ['has-text', /hasText:\s*(\/(?:\\.|[^/\n])+\/[a-z]*|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`[^`]*`|new RegExp[^,}]+|[\w.$]+)/g],
  ['css-text', /:has-text\(\s*["']([^"']+)["']\s*\)/g],
  ['text-engine', /['"`]text=([^'"`]+)['"`]/g],
  ['path', /goto\(\s*[\w.$]*\s*\+?\s*['"`](\/[^'"`]*)['"`]/g],
  ['parsed-text', /\.match(?:All)?\(\s*(\/(?:\\.|[^/\n])*[A-Za-zÀ-ÿ]{4,}(?:\\.|[^/\n])*\/[a-z]*)/g],
];
for (const file of String(args.src).split(',')) {
  readFileSync(file, 'utf8').split('\n').forEach((l, i) => {
    for (const [kind, re] of PATTERNS) for (const m of l.matchAll(re)) add(kind, m[1].trim(), i + 1, file);
  });
}

const test = (raw) => {
  const rx = raw.match(/^\/((?:\\.|[^/])+)\/([a-z]*)$/);
  if (rx) {
    let re;
    try { re = new RegExp(rx[1], rx[2].replace(/[gy]/g, '') + 'm'); } catch { return { status: 'DYNAMIC' }; }
    const hit = pages.filter(([, t]) => re.test(t)).map(([f]) => f);
    return { status: hit.length ? 'FOUND' : 'MISSING', in: hit };
  }
  const lit = raw.match(/^(['"])((?:\\.|(?!\1).)*)\1$/);
  if (lit) {
    const s = lit[2].replace(/\\(.)/g, '$1');
    const hit = pages.filter(([, t]) => t.includes(s)).map(([f]) => f);
    return { status: hit.length ? 'FOUND' : 'MISSING', in: hit };
  }
  return { status: 'DYNAMIC' };
};

const rows = [...deps.values()].map((d) => ({ ...d, ...test(d.kind === 'path' || d.kind === 'css-text' || d.kind === 'text-engine' ? JSON.stringify(d.raw) : d.raw) }));
// a path is "found" when some dump or link list mentions it
for (const r of rows) if (r.kind === 'path') {
  const p = r.raw.split('?')[0];
  const hit = pages.filter(([f, t]) => t.includes(p) || f.includes(p.replace(/\W+/g, '_').replace(/^_|_$/g, ''))).map(([f]) => f);
  Object.assign(r, { status: hit.length ? 'FOUND' : 'MISSING', in: hit });
}

const order = { MISSING: 0, DYNAMIC: 1, FOUND: 2 };
rows.sort((a, b) => order[a.status] - order[b.status] || a.where[0].localeCompare(b.where[0], undefined, { numeric: true }));
const count = (s) => rows.filter((r) => r.status === s).length;
console.log(`${rows.length} UI dependencies over ${pages.length} page dumps: ${count('FOUND')} found, ${count('MISSING')} missing, ${count('DYNAMIC')} dynamic`);
for (const r of rows) {
  const where = r.where.slice(0, 4).join(',') + (r.where.length > 4 ? ` +${r.where.length - 4}` : '');
  const seenIn = r.in?.length ? `  in ${r.in.slice(0, 3).join(',')}${r.in.length > 3 ? ` +${r.in.length - 3}` : ''}` : '';
  console.log(`${r.status.padEnd(7)} ${r.kind.padEnd(11)} ${r.raw.slice(0, 70).padEnd(70)} ${where}${seenIn}`);
}
if (args.json) writeFileSync(String(args.json), JSON.stringify(rows, null, 1));
