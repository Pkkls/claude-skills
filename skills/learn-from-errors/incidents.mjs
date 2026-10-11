// Pull the moments where something went wrong out of Claude Code transcripts,
// so the lessons come from evidence and not from memory.
//   node incidents.mjs [--since 2026-10-10] [--project <substring>] [--all] [--dry]
// Without --since, starts where the last run stopped (state in ~/.claude/learn-from-errors.json).
// --dry leaves that state alone. One JSON line per incident: when, session, kind,
// tool, what failed, and the next 2 messages (what fixed it, or what kil said).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const STATE = path.join(os.homedir(), '.claude', 'learn-from-errors.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const since = arg('--since') ?? (process.argv.includes('--all') ? '1970-01-01' : state.last ?? new Date(Date.now() - 7 * 864e5).toISOString());
const only = arg('--project');
const root = path.join(os.homedir(), '.claude', 'projects');

// what kil says when something is wrong
const SAYS = /\b(non|pas ça|affreux|nul|faux|toujours pareil|marche pas|arr[eê]te|tu as oublié|t'as oublié|lésin|cassé|wrong|broken|again)\b/i;

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.jsonl') && fs.statSync(p).mtime.toISOString() >= since) files.push(p);
  }
})(root);

const flat = (c) => {
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  return c.map((x) => {
    if (x.type === 'text') return x.text;
    if (x.type === 'tool_result') return Array.isArray(x.content) ? x.content.map((y) => y.text ?? '').join(' ') : String(x.content ?? '');
    return '';
  }).join(' ');
};
const short = (s, n) => s.replace(/\s+/g, ' ').trim().slice(0, n);

let count = 0, queued = 0;
for (const f of files) {
  if (only && !f.includes(only)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const tools = new Map();
  lines.forEach((o, i) => {
    if ((o.timestamp ?? '') < since) return;
    const c = o.message?.content;
    if (Array.isArray(c)) for (const x of c) if (x.type === 'tool_use') tools.set(x.id, { name: x.name, input: short(JSON.stringify(x.input), 300) });
    const next = () => lines.slice(i + 1)
      .filter((y) => y.message && ['user', 'assistant'].includes(y.message.role))
      .map((y) => `${y.message.role}: ${short(flat(y.message.content), 220)}`)
      .filter((t) => t.length > 14).slice(0, 2);
    const emit = (kind, extra) => {
      count++;
      console.log(JSON.stringify({ when: o.timestamp, session: path.basename(f, '.jsonl').slice(0, 8), project: path.basename(path.dirname(f)), kind, ...extra, next: next() }));
    };
    // typed while the agent works: stored as an attachment, never as a user message (autonomy-log E91)
    if (o.attachment?.type === 'queued_command') {
      queued++;
      const q = String(o.attachment.prompt ?? '');
      if (!q.trimStart().startsWith('<') && q.length < 600 && SAYS.test(q)) emit('kil_said', { said: short(q, 300), queued: true });
      return;
    }
    if (o.message?.role !== 'user') return;
    if (Array.isArray(c)) {
      for (const x of c) {
        if (x.type !== 'tool_result') continue;
        const t = flat([x]);
        const denied = /Permission for this action was denied|hook error|was denied by/i.test(t);
        if (x.is_error || denied) {
          const tool = tools.get(x.tool_use_id) ?? {};
          emit(denied ? 'denied' : 'tool_error', { tool: tool.name, input: tool.input, error: short(t, 300) });
        }
      }
    }
    const said = Array.isArray(c) ? c.filter((x) => x.type === 'text').map((x) => x.text).join(' ') : typeof c === 'string' ? c : '';
    if (said && !said.trimStart().startsWith('<') && said.length < 600 && SAYS.test(said)) emit('kil_said', { said: short(said, 300) });
  });
}
if (!only && !process.argv.includes('--dry')) fs.writeFileSync(STATE, JSON.stringify({ last: new Date().toISOString() }));
console.error(`${count} incident(s) since ${since} in ${files.length} transcript(s), ${queued} mid-turn message(s) read`);
