// Local operator helper. Sender keys and cron secrets stay in ignored files; never print them.
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { randomBytes } = require('node:crypto');
async function main() {
  const firebaseRoot = process.argv[2];
  if (!firebaseRoot) throw new Error('Pass the installed firebase-tools directory.');
  const auth = require(join(firebaseRoot, 'lib/auth.js'));
  const account = auth.getProjectDefaultAccount(process.cwd()) ?? auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Sign in with Firebase CLI first.');
  const tokens = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']);
  const accessToken = tokens.access_token;
  if (!accessToken) throw new Error('Firebase CLI did not return an access token.');
  async function api(url, body, method = 'POST') {
    const reply = await fetch(url, { method, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await reply.json();
    if (!reply.ok) { const error = new Error(`Google API failed (${reply.status}): ${result.error?.status ?? 'unknown'}`); error.status = reply.status; throw error; }
    return result;
  }
  const config = JSON.parse(readFileSync('config/google-services.json', 'utf8'));
  const project = config.project_info.project_id;
  const number = config.project_info.project_number;
  const email = `cellar-push@${project}.iam.gserviceaccount.com`;
  const accountUrl = `https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/${email}`;
  let serviceAccount;
  try { serviceAccount = await api(accountUrl, null, 'GET'); }
  catch (error) {
    if (error.status !== 404) throw error;
    serviceAccount = await api(`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`, { accountId: 'cellar-push', serviceAccount: { displayName: 'Cellar push sender', description: 'Sends Cellar desk notifications via FCM only.' } });
  }
  const policyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${project}`;
  const policy = await api(`${policyUrl}:getIamPolicy`, { options: { requestedPolicyVersion: 3 } });
  const member = `serviceAccount:${serviceAccount.email}`;
  let binding = policy.bindings.find((b) => b.role === 'roles/firebasecloudmessaging.admin' && !b.condition);
  if (!binding) { binding = { role: 'roles/firebasecloudmessaging.admin', members: [] }; policy.bindings.push(binding); }
  if (!binding.members.includes(member)) { binding.members.push(member); await api(`${policyUrl}:setIamPolicy`, { policy }); }
  for (const service of ['fcm.googleapis.com']) await api(`https://serviceusage.googleapis.com/v1/projects/${number}/services/${service}:enable`, {});
  const dir = join(process.cwd(), 'artifacts/qa/push-secrets'); mkdirSync(dir, { recursive: true });
  const file = join(dir, 'fcm-sender.json');
  if (!existsSync(file)) {
    const key = await api(`${accountUrl}/keys`, { privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE' });
    writeFileSync(file, Buffer.from(key.privateKeyData, 'base64'), { mode: 0o600 });
  }
  const cronFile = join(dir, 'cron-secret');
  if (!existsSync(cronFile)) writeFileSync(cronFile, randomBytes(32).toString('hex'), { mode: 0o600 });
  const sender = JSON.stringify(JSON.parse(readFileSync(file, 'utf8')));
  writeFileSync(join(dir, 'supabase.env'), `CELLAR_FCM_SERVICE_ACCOUNT=${sender}\nCELLAR_PUSH_CRON_SECRET=${readFileSync(cronFile, 'utf8')}\n`, { mode: 0o600 });
  console.log(`Cellar FCM sender prepared in ${project}; secrets saved privately for upload.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
