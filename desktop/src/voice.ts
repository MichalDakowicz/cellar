import { spawn, type ChildProcess } from 'node:child_process';

/** Constant script: user speech never enters shell code. Windows' installed recognizer owns audio. */
export const SPEECH_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech
$installed = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
$info = $installed | Where-Object { $_.Culture.Name -eq 'en-US' } | Select-Object -First 1
if (-not $info) { $info = $installed | Select-Object -First 1 }
if (-not $info) { throw 'Install a Windows speech language pack to dictate. Type instead.' }
$engine = [System.Speech.Recognition.SpeechRecognitionEngine]::new($info)
try {
  $engine.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
  $engine.SetInputToDefaultAudioDevice()
  $engine.BabbleTimeout = [TimeSpan]::FromSeconds(20)
  $result = $engine.Recognize([TimeSpan]::FromSeconds(10))
  if ($result) { [Console]::Write($result.Text) }
} finally { $engine.Dispose() }
`;

export class DesktopVoice {
  private current: { id: string; child: ChildProcess } | null = null;
  async listen(id: unknown): Promise<{ text?: string; error?: string }> {
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid speech session.');
    if (process.platform !== 'win32') return { error: 'Native desktop dictation currently requires Windows. Type instead.' };
    if (this.current) return { error: 'Another voice field is listening. Stop it first.' };
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(SPEECH_SCRIPT, 'utf16le').toString('base64')],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.current = { id, child };
    let text = '', error = '';
    child.stdout!.on('data', (chunk) => { text = (text + String(chunk)).slice(0, 8000); });
    child.stderr!.on('data', (chunk) => { error = (error + String(chunk)).slice(0, 3000); });
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.stop(id), 35_000);
      const finish = (result: { text?: string; error?: string }) => {
        clearTimeout(timer); if (this.current?.id === id) this.current = null; resolve(result);
      };
      child.once('error', (e) => finish({ error: e.message }));
      child.once('close', (code) => finish(code === 0 && text.trim() ? { text: text.trim() } : { error: error.trim() || 'No speech captured. Type instead or try again.' }));
    });
  }
  stop(id?: unknown) { if (this.current && (!id || id === this.current.id)) this.current.child.kill(); }
}
