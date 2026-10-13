const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(process.cwd(), 'artifacts/qa/push-secrets');
const url = /^EXPO_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/m.exec(readFileSync('.env', 'utf8'))?.[1].trim().replace(/^["']|["']$/g, '');
if (!url || !/^https:\/\/[a-z]+\.supabase\.co$/.test(url)) throw new Error('Invalid project URL.');
const secret = readFileSync(join(root, 'cron-secret'), 'utf8').trim();
if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error('Invalid cron secret.');
const sql = `begin;
do $setup$ declare saved uuid; begin
  select id into saved from vault.secrets where name='cellar_push_cron_secret';
  if saved is null then perform vault.create_secret('${secret}','cellar_push_cron_secret','Cellar desk push worker');
  else perform vault.update_secret(saved,'${secret}','cellar_push_cron_secret','Cellar desk push worker'); end if;
  select id into saved from vault.secrets where name='cellar_push_url';
  if saved is null then perform vault.create_secret('${url}/functions/v1/desk-push','cellar_push_url','Cellar push endpoint');
  else perform vault.update_secret(saved,'${url}/functions/v1/desk-push','cellar_push_url','Cellar push endpoint'); end if;
end $setup$;
select cron.schedule('cellar-desk-push','15 seconds',$command$
  select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='cellar_push_url'),
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cellar_push_cron_secret')),
    body:='{"kind":"worker"}'::jsonb,timeout_milliseconds:=10000);
$command$);
commit;`;
writeFileSync(join(root, 'cron.sql'), sql, { mode: 0o600 });
console.log('Private cron activation file prepared; no secret printed.');
