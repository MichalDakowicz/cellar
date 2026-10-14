import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/** SDK resolves CLAUDE_CONFIG_DIR on import. A private worker prevents cross-account env races. */
export function forkClaudeSession(sessionId: string, cwd: string, anchor: string, env: NodeJS.ProcessEnv): Promise<{ sessionId: string }> {
  const require = createRequire(__filename);
  const sdk = pathToFileURL(require.resolve('@anthropic-ai/claude-agent-sdk')).href;
  return new Promise((resolve, reject) => {
    const worker = new Worker(`const {parentPort,workerData}=require('node:worker_threads');
      import(workerData.sdk).then(m=>m.forkSession(workerData.sessionId,{dir:workerData.cwd,upToMessageId:workerData.anchor}))
      .then(result=>parentPort.postMessage({result})).catch(error=>parentPort.postMessage({error:String(error)}));`,
    { eval: true, env: Object.fromEntries(Object.entries(env).filter((pair): pair is [string, string] => typeof pair[1] === 'string')), workerData: { sdk, sessionId, cwd, anchor } });
    const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Claude checkpoint fork timed out; original conversation retained.')); }, 30000);
    worker.once('message', (message) => { clearTimeout(timer); void worker.terminate(); if (typeof message.result?.sessionId === 'string') resolve(message.result); else reject(new Error(message.error ?? 'Claude did not confirm a fork.')); });
    worker.once('error', (error) => { clearTimeout(timer); reject(error); });
    worker.once('exit', (code) => { clearTimeout(timer); if (code !== 0) reject(new Error(`Claude fork worker exited ${code}.`)); });
  });
}
