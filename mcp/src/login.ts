import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { clearSession, createAuthClient, writeSession } from './client.ts';
import { SESSION_FILE } from './config.ts';
import { CALLBACK_URL, signInWithGoogle } from './oauth.ts';

/**
 * Signs the MCP server in, once.
 *
 * A separate command rather than a tool because an MCP server talks JSON over
 * stdio — there is no prompt it could put a browser or a password on, and a
 * tool that took one as an argument would put it in a transcript.
 *
 *   cd cellar/mcp && npm run login
 *
 * Three ways in, because the account is the one shared with Radar, Lidar, Sonar
 * and Pulsar, and it may well have been created with Google and never given a
 * password at all.
 */

type Mode = 'google' | 'code' | 'password';

async function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }

  // readline echoes what it reads, so the output stream is muted for the
  // duration and the prompt is written before muting.
  stdout.write(question);
  const muted = rl as unknown as { output: { write: (chunk: string) => void } };
  const realWrite = muted.output.write.bind(muted.output);
  muted.output.write = () => {};
  const answer = await rl.question('');
  muted.output.write = realWrite;
  stdout.write('\n');
  rl.close();
  return answer.trim();
}

async function chooseMode(): Promise<Mode> {
  stdout.write(
    [
      '',
      'How do you sign into Cellar?',
      '',
      '  1  Google, in a browser        (the usual one)',
      '  2  A code emailed to me        (no password needed)',
      '  3  Email and password',
      '',
    ].join('\n'),
  );
  const answer = (await ask('Pick 1, 2 or 3 [1]: ')) || '1';
  if (answer.startsWith('2')) return 'code';
  if (answer.startsWith('3')) return 'password';
  return 'google';
}

async function run(mode: Mode): Promise<ReturnType<typeof createAuthClient>> {
  const client = createAuthClient();

  if (mode === 'google') {
    stdout.write(
      `\nIf this fails saying the redirect is not allowed, add ${CALLBACK_URL} once under\n` +
        'Supabase dashboard → Authentication → URL Configuration → Redirect URLs.\n',
    );
    await signInWithGoogle(client);
    return client;
  }

  if (mode === 'code') {
    const email = process.env.CELLAR_EMAIL ?? (await ask('Email on the account: '));
    // shouldCreateUser false: this signs into the existing account or fails.
    // Silently making a second, empty account on a typo would be worse than an
    // error, because it would look like the cellar had emptied itself.
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw error;

    stdout.write(
      [
        '',
        'Check your email.',
        '',
        'Supabase sends either a six-digit code or a sign-in link, depending on how the',
        'email template is written — so either works here. Paste the code, or copy the',
        'link address out of the email and paste the whole thing.',
        '',
      ].join('\n'),
    );
    await verifyEmail(client, email, await ask('Code or link: '));
    return client;
  }

  const email = process.env.CELLAR_EMAIL ?? (await ask('Email: '));
  const password = process.env.CELLAR_PASSWORD ?? (await ask('Password: ', true));
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

/**
 * Accepts either half of what the email might contain.
 *
 * The default Supabase template is a link and nothing else, so a login that
 * only took a six-digit code would be broken on a stock project — and the
 * failure would look like "no code arrived" rather than "your template has no
 * code in it", which is the sort of thing that costs an evening.
 *
 * A pasted link carries the same one-time token as a query parameter; it is
 * spelled `token` on the older /verify links and `token_hash` on newer ones.
 * Pulling it out and verifying it here is the same exchange the browser would
 * have done, minus the redirect nobody wants.
 */
async function verifyEmail(client: ReturnType<typeof createAuthClient>, email: string, answer: string): Promise<void> {
  const trimmed = answer.trim();
  if (!trimmed) throw new Error('Nothing pasted.');

  if (/^\d{6}$/.test(trimmed)) {
    const { error } = await client.auth.verifyOtp({ email, token: trimmed, type: 'email' });
    if (error) throw error;
    return;
  }

  let hash: string | null = null;
  try {
    const url = new URL(trimmed);
    hash = url.searchParams.get('token_hash') ?? url.searchParams.get('token');
  } catch {
    throw new Error('That is neither a six-digit code nor a link. Paste one of the two.');
  }
  if (!hash) throw new Error('That link has no sign-in token in it. Copy the whole address.');

  const { error } = await client.auth.verifyOtp({ token_hash: hash, type: 'email' });
  if (error) throw error;
}

function requestedMode(): Mode | null {
  const argument = process.argv.find((value) => value.startsWith('--'))?.slice(2);
  if (argument === 'google' || argument === 'code' || argument === 'password') return argument;
  // Credentials in the environment mean this is not being run by a person.
  if (process.env.CELLAR_PASSWORD) return 'password';
  return null;
}

async function main(): Promise<void> {
  if (process.argv.includes('--out')) {
    clearSession();
    stdout.write(`Signed out. Removed ${SESSION_FILE}\n`);
    return;
  }

  try {
    const client = await run(requestedMode() ?? (await chooseMode()));
    const { data } = await client.auth.getSession();
    if (!data.session) throw new Error('Signed in, but no session came back.');

    writeSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    stdout.write(`\nSigned in as ${data.session.user.email ?? data.session.user.id}.\n`);
    stdout.write(`Session saved to ${SESSION_FILE}\n`);
  } catch (error) {
    stdout.write(`\nCould not sign in: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

void main();
