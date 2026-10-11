import fs from 'node:fs';
const t = (await (await fetch('http://127.0.0.1:9222/json')).json()).find((x) => x.type === 'page' && x.url.includes('/devconsole/'));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((ok) => (ws.onopen = ok));
ws.onmessage = (e) => { const m = JSON.parse(e.data); fs.writeFileSync(process.argv[2], Buffer.from(m.result.data, 'base64')); ws.close(); };
ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'jpeg', quality: 60 } }));
