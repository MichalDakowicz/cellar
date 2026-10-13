const encode = (data: string | Uint8Array) => btoa(typeof data === 'string' ? data : String.fromCharCode(...data)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
type Credentials = { project_id: string; client_email: string; private_key: string };
let cached: { token: string; expires: number } | null = null;
function credentials(): Credentials {
  const raw = Deno.env.get('CELLAR_FCM_SERVICE_ACCOUNT');
  if (!raw) throw new Error('FCM sender credentials are not configured.');
  return JSON.parse(raw);
}
async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const account = credentials();
  const issued = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = encode(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: issued, exp: issued + 3600 }));
  const keyText = account.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(keyText), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${body}`));
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${body}.${encode(new Uint8Array(signature))}` }) });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error('FCM sender authentication failed.');
  cached = { token: result.access_token, expires: Date.now() + Number(result.expires_in) * 1000 }; return cached.token;
}
/** Data-only wake. Phone retrieves canonical, fenced payload before presenting it. */
export async function pushWake(token: string, id: string, generation: number): Promise<'sent' | 'unregistered'> {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials().project_id}/messages:send`, {
    method: 'POST', headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { token, android: { priority: 'high', ttl: '60s', collapse_key: id }, data: { cellarNoticeId: id, generation: String(generation) } } }),
  });
  if (response.ok) return 'sent';
  const result = await response.json();
  if (JSON.stringify(result).includes('UNREGISTERED')) return 'unregistered';
  throw new Error(`FCM send failed (${response.status}).`);
}
