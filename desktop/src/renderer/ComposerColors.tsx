import { useState } from 'react';
import { inkFor, nudgeHex, splitHex } from '@/lib/hexChips';

export function ComposerColors({ text, write }: { text: string; write: (text: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const colors = [...new Set(splitHex(text).filter((part) => part.type === 'hex').map((part) => part.value))];
  if (!colors.length) return null;
  return <div className="chips" aria-label="message colours">{colors.map((code) => <span key={code}>
    <button className="hex" style={{ background: code, color: inkFor(code) }} onClick={() => setOpen(open === code ? null : code)}>{code}</button>
    {open === code && <span className="chips">
      <button onClick={() => void navigator.clipboard.writeText(code)}>copy</button>
      <button onClick={() => write(text.split(code).join(nudgeHex(code, 0.06)))}>lighter</button>
      <button onClick={() => write(text.split(code).join(nudgeHex(code, -0.06)))}>darker</button>
    </span>}
  </span>)}</div>;
}
