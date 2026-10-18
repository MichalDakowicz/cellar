import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

export type RpcRow = { id?: string | number; method?: string; params?: any; result?: any; error?: { code?: number; message: string } };
/** Provider stdio is private to the host. Phone clients never receive an arbitrary RPC bridge. */
export class CodexRpc {
  readonly child: ChildProcessWithoutNullStreams;
  private next = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  constructor(path: string, cwd: string, env: NodeJS.ProcessEnv, receive: (row: RpcRow) => void, diagnostic: (text: string) => void, extraArgs: string[] = []) {
    const accountArgs = env.CELLAR_API_ACCOUNT === '1' ? ['-c', 'model_provider="cellar_api"', '-c', 'model_providers.cellar_api.name="OpenAI"', '-c', 'model_providers.cellar_api.base_url="https://api.openai.com/v1"', '-c', 'model_providers.cellar_api.env_key="OPENAI_API_KEY"', '-c', 'model_providers.cellar_api.wire_api="responses"'] : [];
    this.child = spawn(path, ['app-server', '--listen', 'stdio://', ...accountArgs, ...extraArgs], { cwd, env, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = createInterface({ input: this.child.stdout });
    lines.on('line', (line) => {
      try {
        const row = JSON.parse(line) as RpcRow;
        const call = typeof row.id === 'number' && !row.method ? this.pending.get(row.id) : null;
        if (call) { clearTimeout(call.timer); this.pending.delete(row.id as number); if (row.error) call.reject(new Error(row.error.message)); else call.resolve(row.result); }
        else receive(row);
      } catch (error) { diagnostic(`Invalid provider message: ${error instanceof Error ? error.message : String(error)}`); this.child.kill(); }
    });
    this.child.stderr.on('data', (chunk) => diagnostic(String(chunk)));
    this.child.on('exit', (code, signal) => diagnostic(`Codex process exited: code=${code ?? 'none'} signal=${signal ?? 'none'} executable=${path}`));
    const fail = (error: Error) => { for (const call of this.pending.values()) { clearTimeout(call.timer); call.reject(error); } this.pending.clear(); };
    this.child.on('error', fail); this.child.on('exit', () => fail(new Error('Codex app-server disconnected.')));
  }
  send(row: RpcRow): Promise<void> {
    return new Promise((resolve, reject) => this.child.stdin.write(JSON.stringify(row) + '\n', (error) => error ? reject(error) : resolve()));
  }
  call(method: string, params: unknown): Promise<any> {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Codex ${method} timed out.`)); }, 30_000);
      this.pending.set(id, { resolve, reject, timer });
      void this.send({ id, method, params }).catch((error) => { clearTimeout(timer); this.pending.delete(id); reject(error); });
    });
  }
}
