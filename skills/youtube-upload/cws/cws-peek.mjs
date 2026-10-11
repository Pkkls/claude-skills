const ts = (await (await fetch('http://127.0.0.1:9222/json')).json()).filter((x) => x.type === 'page' && x.url.includes('/devconsole/'));
console.log(ts.map((x) => x.url));
const ws = new WebSocket(ts[0].webSocketDebuggerUrl); await new Promise((ok) => (ws.onopen = ok));
ws.onmessage = (e) => { const m = JSON.parse(e.data); console.log(JSON.stringify(m.result?.result?.value ?? m).slice(0, 1500)); ws.close(); };
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { returnByValue: true, expression: `({ state: document.body.innerText.slice(document.body.innerText.indexOf('État'), document.body.innerText.indexOf('État') + 60), btns: [...document.querySelectorAll('button, [role=button]')].filter((e) => e.getClientRects().length).map((b) => b.textContent.trim().slice(0, 30) + (b.disabled || b.getAttribute('aria-disabled') === 'true' ? ' [off]' : '')).slice(0, 12) })` } }));
