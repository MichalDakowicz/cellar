import type { ServerResponse } from 'node:http';

/**
 * The pc's screen, as a picture that keeps changing.
 *
 * MJPEG — one long response, a JPEG per part — because every phone browser
 * plays it in a plain `<img>` with no script, no codec and no player. It is a
 * look, not a remote desktop: a few frames a second, no input.
 *
 * One capture loop however many are watching, running only while someone is,
 * and a viewer whose connection has not drained the last frame skips the next
 * one rather than queueing it. The frames come from Electron's screen capture,
 * handed in as a function so this file never imports Electron.
 */

export type FrameSource = () => Promise<Buffer | null>;

const BOUNDARY = 'cellar-desk-frame';
const FRAME_MS = 300;

export class ScreenFeed {
  private readonly viewers = new Set<ServerResponse>();
  private running = false;

  constructor(private readonly frames: FrameSource) {}

  watch(res: ServerResponse): void {
    res.writeHead(200, {
      'content-type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
      'cache-control': 'no-store',
      connection: 'close',
    });
    this.viewers.add(res);
    res.on('close', () => this.viewers.delete(res));
    if (!this.running) void this.loop();
  }

  private async loop(): Promise<void> {
    this.running = true;
    while (this.viewers.size > 0) {
      const started = Date.now();
      let frame: Buffer | null = null;
      try {
        frame = await this.frames();
      } catch {
        // A capture that failed once (a display waking, a UAC prompt) is skipped, not fatal.
      }
      if (frame) {
        const head = `--${BOUNDARY}\r\ncontent-type: image/jpeg\r\ncontent-length: ${frame.length}\r\n\r\n`;
        for (const res of this.viewers) {
          if (res.writableNeedDrain) continue;
          res.write(head);
          res.write(frame);
          res.write('\r\n');
        }
      }
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, FRAME_MS - (Date.now() - started))));
    }
    this.running = false;
  }
}

/** The page the phone opens: the stream, fitted to the screen, on black. */
export function screenPage(name: string): string {
  const safe = name.replace(/[<>&"]/g, '');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safe} — screen</title>
<style>html,body{margin:0;height:100%;background:#09090b}
img{display:block;width:100%;height:100%;object-fit:contain}</style></head>
<body><img src="/screen/stream" alt="${safe}'s screen"></body></html>`;
}
