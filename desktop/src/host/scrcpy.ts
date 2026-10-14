import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { connect, type Socket } from 'node:net';

const exec = promisify(execFile);
const HASH = '84924bd564a1eb6089c872c7521f968058977f91f5ff02514a8c74aff3210f3a';
/** scrcpy 4.0 packets, including session resets. Bounded even if a device sends corrupt data. */
export class ScrcpyPackets {
  private buffer = Buffer.alloc(0); private codec = false;
  constructor(private packet: (packet: Buffer) => void) {}
  push(chunk: Buffer) {
    if (this.buffer.length + chunk.length > 4 * 1024 * 1024) throw new Error('Phone encoder packet exceeds the stream limit.');
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (!this.codec) { if (this.buffer.length < 4) return; if (this.buffer.subarray(0, 4).toString() !== 'h264') throw new Error('Phone encoder did not return H.264.'); this.codec = true; this.buffer = this.buffer.subarray(4); }
    while (this.buffer.length >= 12) {
      const size = (this.buffer[0] & 128) ? 12 : 12 + this.buffer.readUInt32BE(8);
      if (size > 2 * 1024 * 1024) throw new Error('Phone encoder packet is too large.');
      if (this.buffer.length < size) return;
      const packet = this.buffer.subarray(0, size); this.buffer = this.buffer.subarray(size); this.packet(packet);
    }
  }
}

export class ScrcpyStream {
  private child: ChildProcess | null = null; private socket: Socket | null = null;
  private port: string | null = null; private closing = false; private log = '';
  private remote: string | null = null;
  constructor(private adb: string, private serial: string, private serverFile: string, private packet: (packet: Buffer) => void, private ended: (error: string) => void) {}
  async start() {
    const file = await readFile(this.serverFile);
    if (createHash('sha256').update(file).digest('hex') !== HASH) throw new Error('Embedded phone encoder failed integrity verification.');
    const id = (randomBytes(4).readUInt32BE() & 0x7fffffff).toString(16).padStart(8, '0');
    const remote = `/data/local/tmp/cellar-scrcpy-${id}.jar`;
    this.remote = remote;
    await exec(this.adb, ['-s', this.serial, 'push', this.serverFile, remote], { windowsHide: true, timeout: 10000 });
    if (this.closing) { await exec(this.adb, ['-s', this.serial, 'shell', 'rm', '-f', remote], { windowsHide: true, timeout: 5000 }).catch(() => {}); return; }
    const { stdout } = await exec(this.adb, ['-s', this.serial, 'forward', 'tcp:0', `localabstract:scrcpy_${id}`], { windowsHide: true, timeout: 5000 });
    this.port = stdout.trim(); if (!/^\d+$/.test(this.port) || Number(this.port) < 1 || Number(this.port) > 65535) throw new Error('ADB did not allocate a phone video port.');
    if (this.closing) { await this.close(); return; }
    this.child = spawn(this.adb, ['-s', this.serial, 'shell', `CLASSPATH=${remote}`, 'app_process', '/', 'com.genymobile.scrcpy.Server', '4.0', `scid=${id}`, 'tunnel_forward=true', 'audio=false', 'control=false', 'send_device_meta=false', 'send_dummy_byte=false', 'max_size=1280', 'max_fps=30', 'video_bit_rate=4000000', 'video_codec=h264', 'video_codec_options=i-frame-interval=1', 'cleanup=true'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const failed = () => { if (!this.closing) this.ended(this.log || 'Phone video ended. Reconnect the mirror.'); void this.close(); };
    this.child.on('error', failed); this.child.on('exit', failed);
    for (const stream of [this.child.stdout, this.child.stderr]) stream?.on('data', (b: Buffer) => { this.log = (this.log + b.toString()).slice(-1000); });
    const parser = new ScrcpyPackets(this.packet);
    // ADB forward accepts before the Android listener starts; retry the owned socket only.
    let connected = false;
    for (let i = 0; i < 60 && !this.closing; i++) {
      const socket = connect({ host: '127.0.0.1', port: Number(this.port) }); this.socket = socket; socket.setNoDelay(true);
      const first = await new Promise<Buffer | null>((resolve) => {
        const timer = setTimeout(() => { socket.destroy(); resolve(null); }, 500);
        socket.once('data', (data: Buffer) => { clearTimeout(timer); socket.pause(); resolve(data); });
        socket.once('error', () => { clearTimeout(timer); resolve(null); }); socket.once('close', () => { clearTimeout(timer); resolve(null); });
      });
      if (first) {
        try { parser.push(first); } catch (e) { socket.destroy(); throw e; }
        socket.on('data', (data: Buffer) => { try { parser.push(data); } catch (e) { this.ended(String(e)); void this.close(); } });
        socket.on('error', failed); socket.on('close', failed); socket.resume(); connected = true; break;
      }
      socket.destroy(); await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!connected && !this.closing) throw new Error(this.log || 'Phone encoder did not connect.');
  }
  async close() {
    this.closing = true; this.socket?.destroy(); this.socket = null; this.child?.kill(); this.child = null;
    const port = this.port; this.port = null;
    if (port) await exec(this.adb, ['-s', this.serial, 'forward', '--remove', `tcp:${port}`], { windowsHide: true, timeout: 5000 }).catch(() => {});
    const remote = this.remote; this.remote = null;
    if (remote) await exec(this.adb, ['-s', this.serial, 'shell', 'rm', '-f', remote], { windowsHide: true, timeout: 5000 }).catch(() => {});
  }
}
