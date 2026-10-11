// One-off: put the promo video link in the Chrome Web Store listing, through
// the dashboard's own page over CDP (no extension may act on the dashboard).
//   node cws-video.mjs survey             read-only
//   node cws-video.mjs set <youtube url>  write the field, save the draft, read back
const PORT = 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const t = targets.find((x) => x.type === 'page' && x.url.includes('/devconsole/'));
  if (!t) throw new Error('no dashboard tab open on port 9222');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error('cannot reach the tab')); });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.ko(new Error(m.error.message)) : p.ok(m.result); } };
  const send = (method, params = {}) => new Promise((ok, ko) => { const i = ++id; pending.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.bringToFront');
  return { send, evaluate, close: () => ws.close(), url: t.url };
}

// Marks the promo video field (data-kt-cws=video) and reports what is around it.
const FIND = `(() => {
  const vis = (e) => e.getClientRects().length > 0;
  const label = (e) => (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.closest('[class*=field], label, section')?.innerText || e.getAttribute('placeholder') || '').replace(/\\s+/g, ' ').trim();
  const inputs = [...document.querySelectorAll('input')].filter((i) => vis(i) && /^(text|url|)$/.test(i.type));
  const video = inputs.find((i) => /vid[eé]o|video|youtube/i.test(label(i)));
  if (video) video.setAttribute('data-kt-cws', 'video');
  const body = document.body.innerText;
  const near = (re) => { const m = body.match(re); return m ? body.slice(Math.max(0, m.index - 120), m.index + 200).replace(/\\s+/g, ' ') : null; };
  return {
    url: location.href,
    inputs: inputs.map((i) => ({ label: label(i).slice(0, 90), value: i.value.slice(0, 80) })),
    video: video ? { label: label(video).slice(0, 120), value: video.value } : null,
    status: near(/(publi[ée]|en attente|en cours d.examen|brouillon|pending review|published|draft)/i),
    buttons: [...new Set([...document.querySelectorAll('button, [role=button]')].filter(vis).map((b) => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 40)).filter(Boolean))].slice(0, 30),
  };
})()`;

const cmd = process.argv[2];
const page = await open();
if (!page.url.match(/\/edit$/)) {
  await page.send('Page.navigate', { url: page.url.replace(/\/edit\/.*$/, '/edit') });
  await sleep(6000);
}
if (cmd === 'survey') {
  console.log(JSON.stringify(await page.evaluate(FIND), null, 1));
} else if (cmd === 'state') {
  // read-only: is anything already waiting in the draft, and what package does it hold
  const btn = `(() => { const b = [...document.querySelectorAll('button, [role=button]')].filter((e) => e.getClientRects().length).find((e) => /envoyer pour examen|submit for review/i.test(e.textContent)); return b ? { text: b.textContent.trim(), disabled: !!(b.disabled || b.getAttribute('aria-disabled') === 'true') } : null; })()`;
  console.log('submit button now:', JSON.stringify(await page.evaluate(btn)));
  const tabs = await page.evaluate(`[...new Set([...document.querySelectorAll('a[href]')].filter((a) => a.getClientRects().length && a.href.includes('/devconsole/')).map((a) => a.textContent.trim().slice(0, 30) + ' -> ' + a.href))]`);
  console.log(tabs.join('\n'));
  const pkg = tabs.map((l) => l.split(' -> ')[1]).find((h) => /\/edit\/package/.test(h));
  if (pkg) {
    await page.send('Page.navigate', { url: pkg });
    await sleep(6000);
    console.log('--- package tab\n' + (await page.evaluate(`document.querySelector('main, [role=main]')?.innerText ?? document.body.innerText`)).replace(/\n{2,}/g, '\n').slice(0, 1500));
    await page.send('Page.navigate', { url: pkg.replace(/\/package$/, '') });
    await sleep(5000);
  }
} else if (cmd === 'inputs') {
  // read-only: every visible text input with the text of its own field block
  await page.send('Page.reload', { ignoreCache: true });
  await sleep(8000);
  console.log(JSON.stringify(await page.evaluate(`(() => {
    const vis = (e) => e.getClientRects().length > 0;
    return [...document.querySelectorAll('input')].filter((i) => vis(i) && /^(text|url|)$/.test(i.type)).map((i, k) => {
      let box = i.parentElement;
      while (box && box.querySelectorAll('input').length === 1 && box.parentElement && box.parentElement.querySelectorAll('input').length === 1) box = box.parentElement;
      return { k, value: i.value, own: (box?.innerText || '').replace(/\\s+/g, ' ').slice(0, 110), aria: i.getAttribute('aria-label') };
    });
  })()`), null, 1));
} else if (cmd === 'setvideo') {
  // node cws-video.mjs setvideo <new url>: writes every promo video field that
  // holds a YouTube URL on the current listing language, saves, reloads, reads back
  const url = process.argv[3];
  if (!/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(url ?? '')) throw new Error('give https://www.youtube.com/watch?v=...');
  await page.send('Page.reload', { ignoreCache: true });
  await sleep(8000);
  const MARK = `(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const own = (i) => { let box = i.parentElement; while (box && box.parentElement && box.parentElement.querySelectorAll('input').length === 1) box = box.parentElement; return (box?.innerText || '').replace(/\\s+/g, ' '); };
    const out = [];
    [...document.querySelectorAll('input')].filter((i) => vis(i) && /^(text|url|)$/.test(i.type)).forEach((i) => {
      const t = own(i);
      if (/vid[eé]o promotionnelle|promo video/i.test(t)) { const key = 'v' + out.length; i.setAttribute('data-kt-cws', key); out.push({ key, label: t.slice(0, 50), value: i.value }); }
    });
    const save = [...document.querySelectorAll('button, [role=button]')].filter(vis).find((e) => /enregistrer le brouillon|save draft/i.test(e.textContent));
    if (save) save.setAttribute('data-kt-cws', 'save');
    return { fields: out, save: !!save };
  })()`;
  const found = await page.evaluate(MARK);
  console.log('before:', JSON.stringify(found.fields));
  if (!found.save || !found.fields.length) throw new Error('fields or save button not found');
  const centre = (k) => page.evaluate(`(() => { const e = document.querySelector('[data-kt-cws=${k}]'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const click = async (at) => { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at }); for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 }); };
  for (const f of found.fields) {
    if (f.value === url) continue;
    await click(await centre(f.key));
    await page.evaluate(`document.querySelector('[data-kt-cws=${f.key}]').select()`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    for (const ch of url) { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, key: ch, unmodifiedText: ch }); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); }
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(600);
    const back = await page.evaluate(`document.querySelector('[data-kt-cws=${f.key}]').value`);
    if (back !== url) throw new Error(`${f.label}: read-back differs (${back}), nothing saved`);
  }
  const waitSaved = async () => {
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const said = await page.evaluate(`(() => { const t = [...document.querySelectorAll('[role=status], [role=alert], [aria-live]')].map((e) => e.textContent.trim()).find((t) => /enregistr|saved/i.test(t)); const b = document.querySelector('[data-kt-cws=save]'); return t || (b && (b.disabled || b.getAttribute('aria-disabled') === 'true') ? 'save button off' : ''); })()`);
      if (said) return said;
    }
    return '';
  };
  console.log('save enabled before click:', await page.evaluate(`(() => { const b = document.querySelector('[data-kt-cws=save]'); return !(b.disabled || b.getAttribute('aria-disabled') === 'true'); })()`));
  await click(await centre('save'));
  let ok = await waitSaved();
  if (!ok) { await page.evaluate(`document.querySelector('[data-kt-cws=save]').click()`); ok = await waitSaved(); }
  console.log('save:', ok || 'no confirmation seen in 30s');
  await page.send('Page.reload', { ignoreCache: true });
  await sleep(8000);
  console.log('after reload:', JSON.stringify((await page.evaluate(MARK)).fields));
} else if (cmd === 'draftdesc') {
  // read-only: the draft description of the language the picker shows now
  console.log(JSON.stringify(await page.evaluate(`(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const areas = [...document.querySelectorAll('textarea')].filter(vis);
    const desc = areas.sort((a, b) => b.value.length - a.value.length)[0];
    const picker = [...document.querySelectorAll('select, [role=combobox], [aria-haspopup=listbox]')].filter(vis).map((c) => c.textContent.trim().slice(0, 40));
    return { picker, len: desc?.value.length, text: desc?.value };
  })()`)));
} else if (cmd === 'video') {
  // node cws-video.mjs video <old id> <new url> [--dry]
  // Global field once, then every listing language: its localized field is
  // replaced only where it still holds the old video; an empty one stays empty.
  const [oldId, url] = [process.argv[3], process.argv[4]];
  const dry = process.argv.includes('--dry');
  if (!/^[\w-]{11}$/.test(oldId ?? '') || !/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(url ?? '')) throw new Error('usage: video <old id> <https://www.youtube.com/watch?v=...>');
  const LANGS = ['en', 'fr', 'es', 'pt-BR', 'tr', 'ru', 'ar', 'ja', 'ko', 'zh-CN', 'cs'];
  const vis = `const vis = (e) => e.getClientRects().length > 0;`;
  const mark = `(() => { ${vis}
    const lab = (e) => (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.closest('[class*=field], label, section')?.innerText || '').replace(/\\s+/g, ' ');
    const ins = [...document.querySelectorAll('input')].filter(vis);
    const g = ins.find((i) => /vid[eé]o promotionnelle internationale|global promo video/i.test(lab(i)));
    const l = ins.find((i) => /vid[eé]o promotionnelle localis[eé]e|localized promo video/i.test(lab(i)));
    if (g) g.setAttribute('data-kt-cws', 'vglobal');
    if (l) l.setAttribute('data-kt-cws', 'vlocal');
    const save = [...document.querySelectorAll('button, [role=button]')].filter(vis).find((e) => /enregistrer le brouillon|save draft/i.test(e.textContent));
    if (save) save.setAttribute('data-kt-cws', 'save');
    const picker = [...document.querySelectorAll('select, [role=combobox], [aria-haspopup=listbox]')].filter(vis).find((c) => /^\\s*(langue|language)/i.test(c.textContent));
    if (picker) picker.setAttribute('data-kt-cws', 'picker');
    return { global: g?.value ?? null, local: l?.value ?? null, save: !!save, picker: picker?.textContent.trim().slice(0, 40) ?? null };
  })()`;
  const centre = (k) => page.evaluate(`(() => { const e = document.querySelector('[data-kt-cws=${k}]'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const click = async (at) => { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at }); for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 }); };
  const write = async (k, text) => {
    await click(await centre(k));
    await page.evaluate(`document.querySelector('[data-kt-cws=${k}]').select()`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    await page.send('Input.insertText', { text });
    await sleep(300);
    const back = await page.evaluate(`document.querySelector('[data-kt-cws=${k}]').value`);
    if (back !== text) throw new Error(`${k}: read-back differs (${back})`);
  };
  const save = async () => {
    const waitSaved = async () => {
      for (let i = 0; i < 30; i++) {
        await sleep(500);
        const said = await page.evaluate(`(() => { const t = [...document.querySelectorAll('[role=status], [role=alert], [aria-live]')].map((e) => e.textContent.trim()).find((t) => /enregistr|saved/i.test(t)); const b = document.querySelector('[data-kt-cws=save]'); return t || (b && (b.disabled || b.getAttribute('aria-disabled') === 'true') ? 'save off' : ''); })()`);
        if (said) return said;
      }
      return '';
    };
    await click(await centre('save'));
    let ok = await waitSaved();
    if (!ok) { await page.evaluate(`document.querySelector('[data-kt-cws=save]').click()`); ok = await waitSaved(); }
    return ok;
  };
  // the language picker, as cws-listing.mjs drives it: options read "<name> – <code>"
  const choose = async (code) => {
    await click(await centre('picker'));
    await sleep(800);
    const at = await page.evaluate(`(() => { const re = new RegExp('–\\\\s*${code}(?![A-Za-z_])'); const o = [...document.querySelectorAll('[role=option], mat-option, li')].filter((e) => e.getClientRects().length).find((e) => re.test(e.textContent)); if (!o) return null; o.scrollIntoView({ block: 'center' }); const r = o.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    if (!at) return false;
    await click(at);
    await sleep(1800);
    return true;
  };
  const report = [];
  let first = await page.evaluate(mark);
  if (!first.picker || first.global === null) throw new Error('page not as expected: ' + JSON.stringify(first));
  if (first.global !== url) {
    if (!dry) { await write('vglobal', url); report.push(`global: ${first.global || '(empty)'} -> new, save: ${await save()}`); }
    else report.push(`global: ${first.global || '(empty)'} -> would change`);
  } else report.push('global: already new');
  for (const code of LANGS) {
    if (!(await choose(code))) { report.push(`${code}: not offered by the picker`); continue; }
    const f = await page.evaluate(mark);
    if (f.local === null) { report.push(`${code}: no localized field`); continue; }
    if (f.local.includes(oldId)) {
      if (dry) { report.push(`${code}: old video -> would change`); continue; }
      await write('vlocal', url);
      report.push(`${code}: old -> new, save: ${await save()}`);
    } else report.push(`${code}: ${f.local || '(empty, the global one applies)'} -> left as is`);
  }
  console.log(report.join('\n'));
} else if (cmd === 'set') {
  const url = process.argv[3];
  if (!/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}$/.test(url ?? '')) throw new Error('give a YouTube watch URL');
  const found = await page.evaluate(FIND);
  if (!found.video) throw new Error('promo video field not found: run survey');
  console.log('before:', found.video.value || '(empty)');
  const at = await page.evaluate(`(() => { const e = document.querySelector('[data-kt-cws=video]'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 });
  await page.evaluate(`document.querySelector('[data-kt-cws=video]').select()`);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
  await page.send('Input.insertText', { text: url });
  await sleep(400);
  const typed = await page.evaluate(`document.querySelector('[data-kt-cws=video]').value`);
  if (typed !== url) throw new Error(`read-back differs: ${typed}`);
  // Visible save only, then wait for the dashboard to say it saved (the lesson of cws-listing.mjs justify).
  const hasSave = await page.evaluate(`(() => { const b = [...document.querySelectorAll('button, [role=button]')].filter((e) => e.getClientRects().length).find((e) => /enregistrer le brouillon|save draft/i.test(e.textContent)); if (!b) return false; b.setAttribute('data-kt-cws', 'save'); return true; })()`);
  if (!hasSave) throw new Error('no visible save button');
  const saved = async () => {
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const said = await page.evaluate(`(() => { const toast = [...document.querySelectorAll('[role=status], [role=alert], [aria-live]')].map((e) => e.textContent.trim()).find((t) => /enregistr|saved/i.test(t)); const b = document.querySelector('[data-kt-cws=save]'); return toast || (b && (b.disabled || b.getAttribute('aria-disabled') === 'true') ? 'save button off: nothing left to save' : ''); })()`);
      if (said) return said;
    }
    return '';
  };
  const sb = await page.evaluate(`(() => { const e = document.querySelector('[data-kt-cws=save]'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...sb });
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, ...sb, button: 'left', clickCount: 1 });
  let ok = await saved();
  if (!ok) { await page.evaluate(`document.querySelector('[data-kt-cws=save]').click()`); ok = await saved(); }
  console.log('save:', ok || 'no confirmation seen in 30s');
  // Read back from the server, not from the field just typed into.
  await page.send('Page.reload', { ignoreCache: true });
  await sleep(7000);
  const after = await page.evaluate(FIND);
  console.log('after reload:', after.video?.value || '(empty)');
  console.log('status:', after.status);
} else {
  console.error('usage: cws-video.mjs survey | set <youtube url>');
}
page.close();
