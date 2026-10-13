import { useState } from 'react';
import { applySuggestion, keyPlan, keySuggestions, tokenAt, type KeySources } from '@/lib/deskKeys';
import { keyNavigation } from '@/lib/deskKeySearch';
import { SAMPLE_FILES, SAMPLE_SKILLS } from '@/lib/deskSample';

/** Isolated visual fixture; never imports auth, host clients or local bridges. */
export function usePreviewKeys(draft: string, write: (text: string) => void, browser: boolean) {
  const [caret, setCaret] = useState<number | undefined>();
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const [closed, close] = useState('');
  const [selected, select] = useState(0);
  const sources: KeySources = { projects: [{ id: 'p1', name: 'Cellar' }], entries: [], commands: browser ? [] : ['test', 'apk'], files: browser ? [] : SAMPLE_FILES, skills: browser ? [] : SAMPLE_SKILLS.codex };
  const token = tokenAt(draft, caret);
  const id = JSON.stringify(token);
  const suggestions = token ? keySuggestions(token, sources) : [];
  const pick = (id: string) => {
    const found = suggestions.find((row) => row.id === id);
    if (!found || !token) return;
    const next = applySuggestion(draft, token, found);
    write(next.text); setCaret(next.caret); setSelection({ start: next.caret, end: next.caret });
  };
  return { list: token && closed !== id ? { key: token.key, suggestions, selected, empty: 'No results.', notice: browser ? 'Browser mailbox transport does not support PC files, skills or commands.' : 'Sample references · no host operations.', onPick: pick } : null,
    plan: keyPlan(draft, sources), selection, onKey: () => {}, onCopy: () => {}, onNudge: () => {},
    onSelection: (end: number, start = end) => { setCaret(end); if (start !== end || selection?.end !== end) setSelection(undefined); },
    onEdit: (text: string) => { close(''); select(0); setSelection(undefined); write(text); },
    onKeyboard: (key: string) => {
      if (!token || closed === id) return false;
      const next = keyNavigation(key, selected, suggestions.length); select(next.index);
      if (next.close) close(id);
      if (next.pick) pick(suggestions[selected].id);
      return next.handled;
    },
  };
}
