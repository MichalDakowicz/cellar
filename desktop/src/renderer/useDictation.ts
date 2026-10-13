import { useEffect, useRef, useState } from 'react';
import { bridge } from './client';

export function useDictation(onText: (text: string) => void) {
  const callback = useRef(onText); callback.current = onText;
  const session = useRef<string | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { const id = session.current; session.current = null; if (id) void bridge?.stopDictation?.(id); }, []);
  async function toggle() {
    if (session.current) { const id = session.current; session.current = null; await bridge?.stopDictation?.(id); setListening(false); return; }
    if (!bridge?.dictate) { setError('Native speech bridge unavailable. Type instead.'); return; }
    const id = crypto.randomUUID(); session.current = id; setError(null); setListening(true);
    try {
      const result = await bridge.dictate(id);
      if (session.current !== id) return;
      if (result.text) callback.current(result.text); else setError(result.error ?? 'No speech captured.');
    } catch (e) { if (session.current === id) setError(String(e)); }
    finally { if (session.current === id) { session.current = null; setListening(false); } }
  }
  return { listening, error, toggle };
}
