// node cws-setfield.mjs <tab: edit|edit/privacy> <current value> <new value>
// real key events + Tab (the form ignores Input.insertText), save, reload, read back
const [tab, from, to] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = (await (await fetch('http://127.0.0.1:9222/json')).json()).find((x) => x.type === 'page' && x.url.includes('/devconsole/'));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((ok) => (ws.onopen = ok));
let id = 0; const P = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); const p = P.get(m.id); if (p) { P.delete(m.id); p(m.result); } };
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; P.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.value;
const base = t.url.replace(/\/edit.*$/, '');
await send('Page.bringToFront');
await send('Page.navigate', { url: `${base}/${tab}` }); await sleep(8000);
const at = await ev(`(() => { const i = [...document.querySelectorAll('input')].find((e) => e.getClientRects().length && e.value === ${JSON.stringify(from)}); if (!i) return null; i.setAttribute('data-kt', 'f'); i.scrollIntoView({ block: 'center' }); const r = i.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
if (!at) { console.log('field with that value not found'); process.exit(1); }
await ev(`(() => { const i = document.querySelector('[data-kt=f]'); i.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(to)}); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); i.dispatchEvent(new Event('blur')); })()`);
await sleep(800);
console.log('typed:', await ev(`document.querySelector('[data-kt=f]').value`));
console.log('save:', await ev(`(async () => { const b = [...document.querySelectorAll('button')].filter((e) => e.getClientRects().length).find((e) => e.textContent.trim() === 'Enregistrer le brouillon'); if (!b || b.disabled) return 'save off'; b.click(); await new Promise((r) => setTimeout(r, 5000)); return 'clicked'; })()`));
await send('Page.navigate', { url: `${base}/${tab}` }); await sleep(8000);
console.log('after reload has new value:', await ev(`[...document.querySelectorAll('input')].some((e) => e.value === ${JSON.stringify(to)})`));
await send('Page.navigate', { url: `${base}/edit` }); await sleep(4000);
ws.close();
