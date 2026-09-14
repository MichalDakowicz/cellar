import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { clearSession, createCellarClient, writeSession } from './client.ts';
import { SESSION_FILE } from './config.ts';

/**
 * Signs the MCP server in, once.
 *
 * It is a separate command rather than a tool because an MCP server talks JSON
 * over stdio — there is no prompt it could put a password on, and a tool that
 * took one as an argument would put it in a transcript. Run it by hand:
 *
 *   cd cellar/mcp && npm run login
 *
 * The account is the same one the app signs into; it is the same Supabase
 * project as Radar, Lidar, Sonar and Pulsar.
 */

async function ask(question: string, hidden: boolean): Promise<string> {
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

async function main(): Promise<void> {
  if (process.argv.includes('--out')) {
    clearSession();
    stdout.write(`Signed out. Removed ${SESSION_FILE}\n`);
    return;
  }

  const email = process.env.CELLAR_EMAIL ?? (await ask('Cellar account email: ', false));
  const password = process.env.CELLAR_PASSWORD ?? (await ask('Password: ', true));

  const client = createCellarClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    stdout.write(`Could not sign in: ${error?.message ?? 'no session returned'}\n`);
    process.exitCode = 1;
    return;
  }

  writeSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  stdout.write(`Signed in as ${data.user?.email ?? email}. Session saved to ${SESSION_FILE}\n`);
}

void main();
