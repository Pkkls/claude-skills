// node cws-click.mjs "<exact button text>" : element click, inside the open dialog if one exists
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = (await (await fetch('http://127.0.0.1:9222/json')).json()).find((x) => x.type === 'page' && x.url.includes('/devconsole/'));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((ok) => (ws.onopen = ok));
ws.onmessage = (e) => { const m = JSON.parse(e.data); console.log(JSON.stringify(m.result.result.value)); ws.close(); };
const label = process.argv[2];
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { returnByValue: true, awaitPromise: true, expression: `(async () => {
  const vis = (e) => e.getClientRects().length > 0;
  const dlg = [...document.querySelectorAll('[role=dialog], [role=alertdialog], mat-dialog-container, .mdc-dialog__surface')].filter((e) => vis(e) && e.innerText.trim()).pop();
  const root = dlg || document;
  const b = [...root.querySelectorAll('button, [role=button]')].filter(vis).filter((e) => e.textContent.trim().toLowerCase() === ${JSON.stringify(label.toLowerCase())}).pop();
  if (!b) return { clicked: false, inDialog: !!dlg, dialog: dlg ? dlg.innerText.slice(0, 400) : null };
  b.click();
  await new Promise((r) => setTimeout(r, 4000));
  const d2 = [...document.querySelectorAll('[role=dialog], [role=alertdialog], mat-dialog-container, .mdc-dialog__surface')].filter((e) => vis(e) && e.innerText.trim()).pop();
  const s = document.body.innerText; const i = s.indexOf('État');
  return { clicked: true, inDialog: !!dlg, dialogNow: d2 ? d2.innerText.replace(/\s+/g, ' ').slice(0, 500) : null, state: s.slice(i, i + 40) };
})()` } }));
