import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { applySuggestion, keyPlan, keySuggestions, tokenAt, type DeskKey, type KeySources } from '@/lib/deskKeys';
import { SAMPLE_COMMANDS, SAMPLE_FILES, SAMPLE_SKILLS } from '@/lib/deskSample';
import { nudgeHex } from '@/lib/hexChips';
import { useDeskPrefs } from '@/store/deskPrefs';

const NUDGE = 0.06;

/**
 * The keys behind a composer (docs/desk/keys.md, `Keys.dc.html`): the list for
 * the word being typed, the strip that types a key, the line that spells out
 * what each token will do, and a colour's copy / lighter / darker.
 *
 * `$` searches the real cellar. Files, skills and commands come from the sample
 * desk until the pc can search them (docs/desk/TASKS.md W2, W10); with it off,
 * those lists say so instead of making something up.
 */
export function useDeskKeys(draft: string, setDraft: (text: string) => void, agent: string) {
  const { projects, entries } = useCellar();
  const sample = useDeskPrefs((state) => state.sample);
  const { say } = useToast();
  const [caret, setCaret] = useState<number | null>(null);

  const sources: KeySources = useMemo(
    () => ({
      projects,
      entries,
      commands: sample ? SAMPLE_COMMANDS : [],
      files: sample ? SAMPLE_FILES : [],
      skills: sample ? (SAMPLE_SKILLS[agent] ?? []) : [],
    }),
    [projects, entries, sample, agent],
  );

  const at = caret === null || caret > draft.length ? draft.length : caret;
  const token = tokenAt(draft, at);
  const suggestions = token ? keySuggestions(token, sources) : [];
  const plan = useMemo(() => keyPlan(draft, sources), [draft, sources]);

  const write = (text: string, next: number | null) => {
    setDraft(text);
    setCaret(next);
  };

  return {
    /** The list over the composer, while a key word is being typed. */
    list: token
      ? {
          key: token.key,
          suggestions,
          empty: emptyLine(token.key, token.query, sample),
          onPick: (id: string) => {
            const pick = suggestions.find((candidate) => candidate.id === id);
            if (!pick) return;
            const next = applySuggestion(draft, token, pick);
            write(next.text, next.caret);
          },
        }
      : null,
    /** Types a key at the end, after a space, and opens its list. */
    onKey: (key: DeskKey) => {
      const text = `${draft}${draft && !/\s$/.test(draft) ? ' ' : ''}${key}`;
      write(text, text.length);
    },
    onSelection: (end: number) => setCaret(end),
    plan,
    onCopy: (code: string) => {
      void Clipboard.setStringAsync(code);
      say(`copied ${code}`);
    },
    /** Swaps every copy of the code in the message for a lighter or darker one. */
    onNudge: (code: string, lighter: boolean) => {
      const next = nudgeHex(code, lighter ? NUDGE : -NUDGE);
      write(draft.split(code).join(next), null);
    },
  };
}

function emptyLine(key: DeskKey, query: string, sample: boolean): string {
  if (key === '$') return query.includes('/') ? 'no project by that name' : 'nothing in your cellar by that name';
  if (!sample) return key === '@' ? 'files come once the pc can search a run’s worktree' : 'skills come once the pc can list the agent’s';
  return key === '@' ? 'no file by that name' : 'no skill by that name';
}
