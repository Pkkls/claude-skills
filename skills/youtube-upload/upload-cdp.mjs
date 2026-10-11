// Upload one video to YouTube Studio through the DEBUG CHROME on port 9222 (CDP),
// for files above the 10 MB limit of the Chrome MCP's file_upload.
//   node yt-upload-cdp.mjs <absolute mp4 path> [UNLISTED|PUBLIC|PRIVATE]
// Steps match the youtube-upload skill: open the upload dialog, set the file,
// "not made for kids", Next x3, visibility, Save, read the link.
import fs from 'node:fs';
import path from 'node:path';

const FILE = process.argv[2];
const VIS = (process.argv[3] ?? 'UNLISTED').toUpperCase();
const CH = 'UCqmlq6S6BO-aaAC_5z-PfYA'; // pkkls
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'yt-upload-shots');
if (!FILE || !fs.existsSync(FILE)) throw new Error('give an existing file');
if (!['UNLISTED', 'PUBLIC', 'PRIVATE'].includes(VIS)) throw new Error('visibility?');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const t = await (await fetch(`http://127.0.0.1:9222/json/new?https://studio.youtube.com/channel/${CH}/videos/upload?d=ud`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error('cannot reach the tab')); });
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.ko(new Error(m.error.message)) : p.ok(m.result); } };
const send = (method, params = {}) => new Promise((ok, ko) => { const i = ++id; pending.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params })); });
const DEEP = `(sel) => { const walk = (root) => { const hit = root.querySelector(sel); if (hit) return hit; for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const h = walk(el.shadowRoot); if (h) return h; } return null; }; return walk(document); }`;
const value = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
const handle = async (sel) => (await send('Runtime.evaluate', { expression: `(${DEEP})(${JSON.stringify(sel)})` })).result;
async function waitFor(sel, ms = 40000) {
  for (let k = 0; k < ms / 500; k++) { const h = await handle(sel); if (h.objectId && h.subtype !== 'null') return h; await sleep(500); }
  throw new Error(`not found in time: ${sel}`);
}
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64')); }
// a real mouse click at the element's centre, after scrolling it into view
async function click(sel, label) {
  const h = await waitFor(sel);
  const box = await send('Runtime.callFunctionOn', { objectId: h.objectId, returnByValue: true, functionDeclaration: 'function () { this.scrollIntoView({ block: "center" }); const r = this.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, disabled: this.hasAttribute("disabled") || this.getAttribute("aria-disabled") === "true" }; }' });
  const b = box.result.value;
  if (!b.w) throw new Error(`${label}: not visible`);
  if (b.disabled) throw new Error(`${label}: disabled`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  console.log(`clicked: ${label}`);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Page.bringToFront');
await sleep(4000);
const who = await value(`(() => { const t = document.querySelector('#channel-title, ytcp-navigation-drawer #entity-name'); return (t && t.textContent.trim()) || document.title; })()`);
console.log('studio page:', who);

const input = await waitFor('input[type=file]');
await send('DOM.setFileInputFiles', { files: [FILE], objectId: input.objectId });
console.log('file set:', path.basename(FILE));
await waitFor('#title-textarea');
await sleep(3000);
await shot('1-details');

const link = async () => value(`(() => { const D = ${DEEP}; const a = D('a[href*="youtu.be/"]') || D('a[href*="/watch?v="]'); return a ? a.href : null; })()`);
let url = null;
for (let k = 0; k < 40 && !url; k++) { url = await link(); if (!url) await sleep(500); }
console.log('link:', url);

await click('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]', 'not made for kids');
await sleep(800);
for (let k = 1; k <= 3; k++) { await click('#next-button', `next ${k}`); await sleep(2000); }
await shot('2-visibility');
await click(`tp-yt-paper-radio-button[name="${VIS}"]`, VIS.toLowerCase());
await sleep(800);
const checked = await value(`(() => { const r = (${DEEP})('tp-yt-paper-radio-button[name="${VIS}"]'); return !!r && (r.hasAttribute('checked') || r.getAttribute('aria-checked') === 'true'); })()`);
console.log('visibility checked:', checked);
if (!checked) throw new Error('visibility not set, nothing saved');

// Save waits for the upload itself to finish
for (let k = 0; k < 240; k++) {
  const status = await value(`(() => { const D = ${DEEP}; const p = D('ytcp-video-upload-progress'); return p ? p.innerText.replace(/\\s+/g, ' ').trim() : ''; })()`);
  const done = await value(`(() => { const b = (${DEEP})('#done-button'); return !!b && !b.hasAttribute('disabled') && b.getAttribute('aria-disabled') !== 'true'; })()`);
  if (k % 10 === 0) console.log('progress:', status.slice(0, 120));
  if (done && !/importation|uploading|\d+\s?%/i.test(status)) break;
  await sleep(1000);
}
await click('#done-button', 'save');
await sleep(4000);
await shot('3-saved');
const after = (await link()) ?? url;
console.log('final link:', after);
const vid = (after || '').match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1];
if (vid) {
  const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
  console.log('oembed:', o.status, o.ok ? JSON.stringify(await o.json()).slice(0, 160) : '');
}
ws.close();
