/**
 * What the phone's camera app opens when it reads the pairing code.
 *
 * The code is a plain web link to this pc so any camera can read it. This page
 * is that link's answer: a button that opens Cellar with the pairing in the
 * deep link. The secret is in the URL fragment, which the browser never sent —
 * the script on the page reads it locally and builds the link from it. The
 * server sees a bare `GET /pair`.
 *
 * The page knows the scheme and nothing else. A pair it cannot read gets a
 * sentence instead of a dead button.
 */
export function pairPage(name: string): string {
  const safe = name.replace(/[<>&"]/g, '');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>pair with ${safe}</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#09090b;color:#fafafa;font:16px/1.5 system-ui,sans-serif}
main{max-width:22rem;padding:24px;text-align:center}
h1{font-size:22px;margin:0 0 8px;letter-spacing:-.01em}
p{color:#a1a1aa;margin:0 0 24px;font-size:14px}
a{display:inline-block;padding:12px 22px;border-radius:999px;background:#64748b;color:#fff;
text-decoration:none;font-weight:600}
</style></head><body><main>
<h1>pair with ${safe}</h1>
<p id="say">open cellar to finish — it keeps this pc so the phone can start work on it.</p>
<a id="go" href="#">open cellar</a>
</main><script>
var raw = location.hash.slice(1), go = document.getElementById('go');
var q = {}; raw.split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) q[p.slice(0, i)] = p.slice(i + 1); });
if (!q.d || !q.k) {
  document.getElementById('say').textContent = 'this link is missing its pairing — scan the code on the pc again.';
  go.style.display = 'none';
} else {
  go.href = 'cellar://desk-pair?h=' + encodeURIComponent(location.hostname) + '&p=' + encodeURIComponent(location.port)
    + '&d=' + q.d + '&k=' + q.k + '&n=' + (q.n || '');
  location.replace(go.href);
}
</script></body></html>`;
}
