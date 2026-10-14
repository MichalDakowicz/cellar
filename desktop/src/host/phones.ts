import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, realpathSync } from 'node:fs';
import { join, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { PhoneAction, PhoneState } from '@/lib/deskRemote';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { apkPath, findApks } from './apks.ts';
import { ScrcpyStream } from './scrcpy.ts';

const exec = promisify(execFile);
const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
export async function deviceTool(name: 'adb' | 'scrcpy') {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
  const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  if (name === 'adb' && existsSync(adb)) return adb;
  try {
    const { stdout } = await exec(process.platform === 'win32' ? 'where.exe' : 'which', [name], { windowsHide: true, timeout: 3000 });
    return stdout.trim().split(/\r?\n/).find((path) => process.platform !== 'win32' || /\.exe$/i.test(path)) ?? null;
  } catch { return null; }
}
export function phoneDevices(output: string) {
  return output.split(/\r?\n/).slice(1).flatMap((line) => {
    const m = /^([^\s]+)\s+(device|offline|unauthorized)\b(.*)$/.exec(line);
    return m && /^[a-zA-Z0-9_.:[\]-]{1,160}$/.test(m[1]) ? [{ serial: m[1], state: m[2], model: /model:([^\s]+)/.exec(m[3])?.[1]?.replace(/_/g, ' ') ?? m[1] }] : [];
  });
}
export class Phones {
  private state: Omit<PhoneState, 'devices' | 'video'> = { driver: 'watch', agentAccess: false, taps: [] };
  private ownerId: string | null = null;
  private serial: string | null = null;
  private busy = false;
  private tokens = new Map<string, { runId: string; owner: string; sequence: number }>();
  private videos = new Set<ScrcpyStream>();
  tapSnapshot() { return this.state.taps.filter((t) => Date.now() - t.at < 1500); }
  constructor(private deps: HostDeps, private tool = deviceTool, private execute = exec) {}
  reset() { for (const video of this.videos) void video.close(); this.videos.clear(); this.serial = null; this.tokens.clear(); this.state = { driver: 'watch', agentAccess: false, taps: [] }; }
  async video(serial: string, packet: (packet: Buffer) => void, ended: (error: string) => void) {
    const adb = await this.device(serial);
    if (!this.deps.phoneServerFile) throw new DeskError('Embedded phone video backend unavailable.', 409);
    if (this.videos.size >= 2) throw new DeskError('Close another phone mirror first.', 409);
    const stream = new ScrcpyStream(adb, serial, this.deps.phoneServerFile, packet, ended); this.videos.add(stream);
    const close = async () => { this.videos.delete(stream); await stream.close(); };
    try { await stream.start(); return close; } catch (e) { await close(); throw e; }
  }
  environment(owner: string, runId: string, port: number) {
    this.owner(); const token = randomBytes(32).toString('base64url'); this.tokens.set(token, { owner, runId, sequence: 0 });
    return { CELLAR_PHONE_URL: `http://127.0.0.1:${port}/agent-phone`, CELLAR_PHONE_TOKEN: token };
  }
  async agent(token: string, raw: unknown) {
    const grant = this.tokens.get(token); const owner = this.owner(); const v = raw as PhoneAction & { sequence?: number };
    if (!grant || grant.owner !== owner || !await this.deps.account.agentDevice() || this.state.driver !== 'agent' || !(await this.deps.runs.list()).some((r) => r.id === grant.runId && r.state === 'running')) throw new DeskError('Agent phone access is disabled or the owning run ended.', 403);
    if (!v || !Number.isSafeInteger(v.sequence) || v.sequence! <= grant.sequence) throw new DeskError('Agent phone sequence must increase.', 409);
    grant.sequence = v.sequence!;
    if ((v.action as string) === 'devices') return this.list();
    if (v.serial !== this.serial) throw new DeskError('Agent can drive only the phone selected on the desktop.', 403);
    if ((v.action as string) === 'frame') return this.frame(v.serial);
    return this.act({ ...v, actor: 'agent', runId: grant.runId }, 'pc');
  }
  private owner() {
    const owner = this.deps.account.current?.userId;
    if (owner !== this.ownerId) { this.reset(); this.ownerId = owner ?? null; }
    if (!owner) throw new DeskError('Sign in on the PC to use ADB.', 403);
    return owner;
  }
  async list(): Promise<PhoneState> {
    this.owner(); const adb = await this.tool('adb');
    this.state.agentAccess = await this.deps.account.agentDevice();
    if (!this.state.agentAccess && this.state.driver === 'agent') this.state.driver = 'watch';
    if (!adb) throw new DeskError('Install Android platform-tools to attach a phone.', 409);
    const { stdout } = await this.execute(adb, ['devices', '-l'], { windowsHide: true, timeout: 5000 });
    return { ...this.state, taps: this.state.taps.filter((tap) => Date.now() - tap.at < 2000), devices: phoneDevices(String(stdout)), video: true };
  }
  private async device(serial: unknown) {
    const owner = this.owner();
    if (typeof serial !== 'string' || !(await this.list()).devices.some((d) => d.serial === serial && d.state === 'device')) throw new DeskError('Choose an authorized, connected ADB device.', 409);
    if (this.deps.account.current?.userId !== owner) throw new DeskError('Account changed.', 403);
    return (await this.tool('adb'))!;
  }
  async frame(serial: string) {
    const adb = await this.device(serial);
    const { stdout } = await this.execute(adb, ['-s', serial, 'exec-out', 'screencap', '-p'], { windowsHide: true, timeout: 5000, encoding: 'buffer', maxBuffer: 6 * 1024 * 1024 });
    const png = Buffer.from(stdout);
    if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new DeskError('Phone capture did not return PNG.');
    return { url: 'data:image/png;base64,' + png.toString('base64'), width: png.readUInt32BE(16), height: png.readUInt32BE(20), taps: this.state.taps.filter((t) => Date.now() - t.at < 2000) };
  }
  async logs(serial: string, packageName: string) {
    const adb = await this.device(serial);
    if (!/^[a-zA-Z][\w]*(?:\.[\w]+)+$/.test(packageName)) throw new DeskError('Enter an Android package name.');
    const { stdout: pid } = await this.execute(adb, ['-s', serial, 'shell', 'pidof', quote(packageName)], { windowsHide: true, timeout: 5000 });
    if (!/^\d+(?:\s+\d+)*\s*$/.test(String(pid))) throw new DeskError('Package is not running.');
    const { stdout } = await this.execute(adb, ['-s', serial, 'logcat', '-d', '-t', '200', '--pid=' + String(pid).trim().split(/\s/)[0]], { windowsHide: true, timeout: 5000, maxBuffer: 256_000 });
    return { text: String(stdout).slice(-64_000) };
  }
  async act(raw: unknown, source: 'pc' | 'phone') {
    if (source !== 'pc') throw new DeskError('ADB controls belong to the desktop.', 403);
    const v = raw as PhoneAction;
    if (!v || typeof v !== 'object') throw new DeskError('Choose a phone action.');
    if (this.busy) throw new DeskError('Phone action in progress.', 409);
    this.busy = true;
    try {
      const owner = this.owner(); const adb = await this.device(v.serial);
      if (this.serial !== v.serial) { this.state.driver = 'watch'; this.state.taps = []; this.serial = v.serial; }
      if (v.action === 'driver') {
        if (!['watch', 'you', 'agent'].includes(v.value ?? '') || (v.value === 'agent' && !this.state.agentAccess)) throw new DeskError('Enable agent access before handing over control.');
        this.state.driver = v.value as PhoneState['driver']; return { applied: true };
      }
      if (v.action === 'agentAccess') { if (this.state.agentAccess !== v.enabled) throw new DeskError('Change the account’s agent device setting first.'); return { applied: true }; }
      const agent = v.actor === 'agent';
      if (agent) {
        if (!this.state.agentAccess || this.state.driver !== 'agent' || !(await this.deps.runs.list()).some((r) => r.id === v.runId && r.state === 'running')) throw new DeskError('Agent phone access requires the driver switch and a live owned run.', 403);
        if (!['tap', 'swipe', 'key', 'text'].includes(v.action)) throw new DeskError('Agent may only send phone input.', 403);
      } else if (['tap', 'swipe', 'key', 'text'].includes(v.action) && this.state.driver !== 'you') throw new DeskError('Choose “I drive” to control the phone.', 409);
      let args: string[];
      const point = (n: unknown) => { if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 16000) throw new DeskError('Invalid phone coordinate.'); return String(n); };
      if (v.action === 'tap') args = ['shell', 'input', 'tap', point(v.x), point(v.y)];
      else if (v.action === 'swipe') args = ['shell', 'input', 'swipe', point(v.x), point(v.y), point(v.x2), point(v.y2), '300'];
      else if (v.action === 'key') {
        const keys: Record<string, string> = { back: '4', home: '3', recent: '187', power: '26', enter: '66', delete: '67' };
        if (!keys[v.value ?? '']) throw new DeskError('Unsupported phone key.'); args = ['shell', 'input', 'keyevent', keys[v.value!]];
      } else if (v.action === 'text') {
        if (!v.value || !/^[\x20-\x7e]{1,1000}$/.test(v.value) || /[%\r\n]/.test(v.value)) throw new DeskError('ADB typing supports up to 1000 plain ASCII characters without %.');
        args = ['shell', 'input', 'text', quote(v.value.replace(/ /g, '%s'))];
      } else if (v.action === 'link') {
        if (!v.value || v.value.length > 2048 || !/^[a-z][a-z0-9+.-]*:\/\//i.test(v.value) || [...v.value].some((c) => c.charCodeAt(0) <= 32) || /^(file|content|intent|javascript|data):/i.test(v.value)) throw new DeskError('Enter an app deep link or HTTPS URL.');
        args = ['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', quote(v.value)];
      } else if (v.action === 'install') {
        const apk = (await findApks(this.deps.identity().workspace)).find((a) => a.app === v.value);
        if (!apk) throw new DeskError('Choose an existing release build.');
        const workspace = realpathSync.native(this.deps.identity().workspace); const path = realpathSync.native(apkPath(workspace, apk));
        if (!path.toLowerCase().startsWith(workspace.toLowerCase() + sep)) throw new DeskError('APK is outside the workspace.', 403);
        args = ['install', '-r', path];
      } else if (v.action === 'toggle') {
        const toggles: Record<string, string> = { touches: 'show_touches', bounds: 'pointer_location', awake: 'stay_on_while_plugged_in' };
        if (!toggles[v.value ?? ''] || typeof v.enabled !== 'boolean') throw new DeskError('Unsupported developer toggle.');
        args = ['shell', 'settings', 'put', v.value === 'awake' ? 'global' : 'system', toggles[v.value!], v.enabled ? (v.value === 'awake' ? '3' : '1') : '0'];
      } else throw new DeskError('Unsupported phone action.');
      if (this.deps.account.current?.userId !== owner) throw new DeskError('Account changed.', 403);
      const { stdout, stderr } = await this.execute(adb, ['-s', v.serial, ...args], { windowsHide: true, timeout: v.action === 'install' ? 120_000 : 5000, maxBuffer: 256_000 });
      if (agent && v.action === 'tap') this.state.taps = [...this.state.taps.filter((t) => Date.now() - t.at < 2000), { x: v.x!, y: v.y!, at: Date.now() }].slice(-20);
      return { applied: true, output: (String(stdout) + String(stderr)).slice(-16_000) };
    } finally { this.busy = false; }
  }
}
