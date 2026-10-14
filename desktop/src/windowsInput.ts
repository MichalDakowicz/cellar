import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { ScreenInput } from '@/lib/deskRemote';

// Fixed program; user text is base64 JSON data, never PowerShell code or SendKeys syntax.
const native = `
using System;
using System.Runtime.InteropServices;
public class CellarInput {
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,int data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs,int size);
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
 [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION u; }
 [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public MOUSE m; [FieldOffset(0)] public KEY k; }
 [StructLayout(LayoutKind.Sequential)] struct MOUSE { public int x,y; public uint data,flags,time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Sequential)] struct KEY { public ushort vk,scan; public uint flags,time; public UIntPtr extra; }
 public static void Text(string text) { foreach(char c in text) { var a=new INPUT[2]; a[0].type=1; a[0].u.k.scan=c; a[0].u.k.flags=4; a[1]=a[0]; a[1].u.k.flags=6; if(SendInput(2,a,Marshal.SizeOf(typeof(INPUT)))!=2) throw new Exception("Input refused by Windows."); } }
}`;
export const inputWorkerScript = `$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
${native}
'@
[Console]::WriteLine('ready')
while ($null -ne ($line=[Console]::ReadLine())) {
try {
$p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($line)) | ConvertFrom-Json
$v=$p.input; $d=$p.display
switch($v.kind) {
 'click' { if($v.right){$a=8;$b=16}else{$a=2;$b=4}; [CellarInput]::mouse_event($a,0,0,0,[UIntPtr]::Zero); [CellarInput]::mouse_event($b,0,0,0,[UIntPtr]::Zero) }
 'tap' { [void][CellarInput]::SetCursorPos(($d.x+$v.x*($d.width-1)),($d.y+$v.y*($d.height-1))); if($v.right){$a=8;$b=16}else{$a=2;$b=4}; [CellarInput]::mouse_event($a,0,0,0,[UIntPtr]::Zero); [CellarInput]::mouse_event($b,0,0,0,[UIntPtr]::Zero) }
 'move' { $pt=New-Object CellarInput+POINT; [void][CellarInput]::GetCursorPos([ref]$pt); [void][CellarInput]::SetCursorPos(($pt.X+$v.x*$d.width),($pt.Y+$v.y*$d.height)) }
 'scroll' { [CellarInput]::mouse_event(2048,0,0,$v.amount,[UIntPtr]::Zero) }
 'text' { [CellarInput]::Text($v.text) }
 'key' { $keys=@{Enter=13;Tab=9;Escape=27;Backspace=8;Delete=46;ArrowUp=38;ArrowDown=40;ArrowLeft=37;ArrowRight=39;Home=36;End=35;PageUp=33;PageDown=34;Space=32}; if($keys.ContainsKey($v.key)){$key=$keys[$v.key]}else{$key=[int][char]$v.key.ToUpper()}; $mods=@(); if($v.ctrl){$mods+=17};if($v.alt){$mods+=18};if($v.shift){$mods+=16}; try { foreach($m in $mods){[CellarInput]::keybd_event($m,0,0,[UIntPtr]::Zero)}; [CellarInput]::keybd_event($key,0,0,[UIntPtr]::Zero) } finally { [CellarInput]::keybd_event($key,0,2,[UIntPtr]::Zero); [array]::Reverse($mods); foreach($m in $mods){[CellarInput]::keybd_event($m,0,2,[UIntPtr]::Zero)} } }
}
[Console]::WriteLine('ok')
} catch { [Console]::WriteLine('error:'+ $_.Exception.Message) }
}
`;

type Display = { x: number; y: number; width: number; height: number };
/** One hidden native input worker per host, with a startup handshake and bounded requests. */
export class WindowsInput {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready: Promise<void> | null = null;
  private pending: { resolve: () => void; reject: (e: Error) => void } | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  prepare(): Promise<void> {
    if (this.ready) return this.ready;
    if (process.platform !== 'win32') return Promise.reject(new Error('Screen input requires Windows on this host.'));
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(inputWorkerScript, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    this.ready = new Promise<void>((resolve, reject) => {
      let buffer = ''; let diagnostic = ''; let initialized = false;
      const timer = setTimeout(() => fail(new Error('Windows input worker startup timed out.')), 15000);
      const fail = (error: Error) => {
        clearTimeout(timer); this.pending?.reject(error); this.pending = null;
        if (!initialized) reject(error);
        if (this.child === child) { this.child = null; this.ready = null; }
        if (!child.killed) child.kill();
      };
      child.once('error', fail); child.once('exit', () => fail(new Error('Windows input worker ended. ' + diagnostic)));
      child.stderr.on('data', (chunk: Buffer) => { diagnostic = (diagnostic + chunk.toString()).slice(-1000); });
      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        let end: number;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
          if (line === 'ready' && !initialized) { initialized = true; clearTimeout(timer); resolve(); }
          else if (this.pending && (line === 'ok' || line.startsWith('error:'))) {
            const pending = this.pending; this.pending = null;
            if (line === 'ok') pending.resolve(); else pending.reject(new Error(line.slice(6)));
          }
        }
        if (buffer.length > 4096) fail(new Error('Invalid Windows input worker response.'));
      });
    });
    return this.ready;
  }
  private send(payload: unknown): Promise<void> {
    const send = async () => {
      await this.prepare();
      const child = this.child!;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { this.close(); reject(new Error('Windows input timed out; it will not be replayed.')); }, 5000);
        this.pending = { resolve: () => { clearTimeout(timer); resolve(); }, reject: (e) => { clearTimeout(timer); reject(e); } };
        child.stdin.write(Buffer.from(JSON.stringify(payload), 'utf8').toString('base64') + '\n', (error) => { if (error) { this.pending?.reject(error); this.pending = null; } });
      });
    };
    const result = this.queue.catch(() => {}).then(send); this.queue = result; return result;
  }
  input(input: ScreenInput, display: Display) { return this.send({ input, display }); }
  /** Protocol-only latency probe: performs no Windows input. */
  ping() { return this.send({ input: { kind: 'ping' } }); }
  close() {
    const child = this.child; this.child = null; this.ready = null;
    this.pending?.reject(new Error('Windows input session closed.')); this.pending = null;
    child?.stdin.end(); if (child && !child.killed) child.kill();
  }
}
