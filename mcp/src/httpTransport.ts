import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import type { CtxProvider } from './context.ts';
import { createCellarServer } from './mcpServer.ts';

/**
 * MCP over one HTTP request, with no session kept between them.
 *
 * The SDK ships a Streamable HTTP transport, but it is written against node's
 * `http` request and response objects, and the hosted half of this server runs
 * on Deno where there are none — there is a `Request` and there is whatever you
 * return. So the transport is the small half: one message in, one message out,
 * and the SDK does the protocol.
 *
 * Statelessness is not a shortcut, it is the shape of the thing. A server this
 * size has nothing worth remembering between calls: every tool reads the cellar
 * fresh, and the token in the header is the whole session. So each request
 * builds a server, answers, and throws it away, and two agents can hold the
 * same URL at once without either of them knowing.
 */

export class OneShotTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  /** The first thing the server says back, or null if it says nothing. */
  readonly reply: Promise<JSONRPCMessage | null>;

  private settle!: (reply: JSONRPCMessage | null) => void;

  constructor() {
    this.reply = new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    this.settle(message);
  }

  async close(): Promise<void> {
    // Settling with null is what stops a notification hanging the request: the
    // server closes without ever answering, and a promise nobody resolves is a
    // request that never returns.
    this.settle(null);
    this.onclose?.();
  }

  /** Hand the server the message that arrived in the body. */
  deliver(message: JSONRPCMessage): void {
    this.onmessage?.(message);
  }
}

/**
 * Run one JSON-RPC message through a throwaway server.
 *
 * A notification — no `id` — is delivered and not waited for, because nothing
 * is coming back and waiting would mean waiting forever. `notifications/
 * initialized` is the one that actually arrives, right after the handshake.
 */
export async function handleMessage(
  getCtx: CtxProvider,
  message: JSONRPCMessage,
): Promise<JSONRPCMessage | null> {
  const server = createCellarServer(getCtx);
  const transport = new OneShotTransport();
  await server.connect(transport);

  transport.deliver(message);
  const reply = 'id' in message ? await transport.reply : null;

  await server.close();
  return reply;
}
