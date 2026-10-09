import type { ServerResponse } from 'node:http';

/**
 * The pc's screen, as a picture that keeps changing.
 *
 * MJPEG — one long response, a JPEG per part — because every phone browser
 * plays it in a plain `<img>` with no script, no codec and no player. It is a
 * look, not a remote desktop: a few frames a second, no input. The frames come
 * from Electron's screen capture, handed in as a function so this file never
 * imports Electron.
 */

export type FrameSource = () => Promise<Buffer | null>;

const BOUNDARY = 'cellar-desk-frame';
const FRAME_MS = 300;

export function streamScreen(res: ServerResponse, frames: FrameSource): void {
  res.writeHead(200, {
    'content-type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
    'cache-control': 'no-store',
    connection: 'close',
  });
  let open = true;
  res.on('close', () => {
    open = false;
  });

  const next = async () => {
    if (!open) return;
    const started = Date.now();
    try {
      const frame = await frames();
      if (frame && open) {
        res.write(`--${BOUNDARY}\r\ncontent-type: image/jpeg\r\ncontent-length: ${frame.length}\r\n\r\n`);
        res.write(frame);
        res.write('\r\n');
      }
    } catch {
      // A capture that failed once (a display waking, a UAC prompt) is skipped, not fatal.
    }
    if (open) setTimeout(next, Math.max(0, FRAME_MS - (Date.now() - started)));
  };
  void next();
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
