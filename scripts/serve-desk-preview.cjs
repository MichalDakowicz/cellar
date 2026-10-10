// Run with a separate Metro on 8088: npx expo start --web --port 8088.
const http = require('node:http');
http.createServer((req, res) => {
  if (!req.url.startsWith('/?') && req.url !== '/') {
    http.get(`http://127.0.0.1:8088${req.url}`, (upstream) => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res);
    }).on('error', () => { res.writeHead(502); res.end(); });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Desk visual preview</title><style>html,body,#root{margin:0;min-height:100%;background:#0a0a0a}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="http://127.0.0.1:8088/src/dev/deskVisualPreview.bundle?platform=web&dev=true&hot=false"></script></body></html>');
}).listen(8134, '127.0.0.1', () => console.log('Desk visual preview: http://127.0.0.1:8134'));
