import { open, stat } from 'node:fs/promises';

/**
 * The end of a file, without reading the rest of it.
 *
 * A long claude session's transcript runs to megabytes, and a phone with the
 * log open asks for it every four seconds — reading the whole thing each time
 * on Electron's main thread would stall everything else the pc is serving. The
 * phone shows the last lines anyway, so only the last stretch is read, and the
 * first, probably cut, line of that stretch is dropped.
 */

const TAIL_BYTES = 512 * 1024;

export async function readTail(path: string, bytes = TAIL_BYTES): Promise<string> {
  const { size } = await stat(path);
  const start = Math.max(0, size - bytes);
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    const text = buffer.toString('utf8');
    return start === 0 ? text : text.slice(text.indexOf('\n') + 1);
  } finally {
    await handle.close();
  }
}

/** When the file last changed — how a run started before a restart is told apart from a finished one. */
export async function lastWrite(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}
