import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { applySuggestion, keyPlan, keySuggestions, tokenAt, type DeskKey, type KeySources } from '@/lib/deskKeys';
import { SAMPLE_COMMANDS, SAMPLE_FILES, SAMPLE_SKILLS } from '@/lib/deskSample';
import { nudgeHex } from '@/lib/hexChips';
import { useDeskPrefs } from '@/store/deskPrefs';
import { keyNavigation, tokenIdentity } from '@/lib/deskKeySearch';
import { useKeySearch, type KeyScope } from './useKeySearch';

const NUDGE = 0.06;

/**
 * The keys behind a composer (docs/desk/keys.md, `Keys.dc.html`): the list for
 * the word being typed, the strip that types a key, the line that spells out
 * what each token will do, and a colour's copy / lighter / darker.
 *
 * W11 uses authenticated host sources. Sample data stays scoped to sample runs.
 */
export function useDeskKeys(draft: string, setDraft: (text: string) => void, agent: string, commands: string[] = [], context: KeyScope) {
  const { projects, entries } = useCellar();
  const sample = useDeskPrefs((state) => state.sample);
  const { say } = useToast();
  const [caret, setCaret] = useState<number | null>(null);
  const [dismissed, dismiss] = useState('');
  const [highlight, setHighlight] = useState({ token: '', index: 0 });
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const [knownSkills, setKnownSkills] = useState<{ scope: string; names: string[] }>({ scope: '', names: [] });
  const skillScope = `${context.link.ownerId}:${context.link.info?.id ?? context.link.pair?.id}:${context.projectId}:${context.runId}:${agent}`;

  const sources: KeySources = useMemo(
    () => ({
      projects,
      entries,
      commands: commands.length ? commands : context.sample ? SAMPLE_COMMANDS : [],
      files: context.sample ? SAMPLE_FILES : [],
      skills: context.sample ? (SAMPLE_SKILLS[agent] ?? []) : knownSkills.scope === skillScope ? knownSkills.names.map((name) => ({ name, detail: 'installed on PC' })) : [],
    }),
    [projects, entries, context.sample, agent, commands, knownSkills, skillScope],
  );

  const at = caret === null || caret > draft.length ? draft.length : caret;
  const token = tokenAt(draft, at);
  const remote = useKeySearch(token, agent, context);
  const identity = tokenIdentity(token);
  const open = !!token && dismissed !== identity;
  const local = token ? keySuggestions(token, sources) : [];
  const suggestions = token?.key === '$' ? [...remote.suggestions, ...local.filter((pick) => !remote.suggestions.some((row) => row.id === pick.id))].slice(0, 8)
    : context.sample ? local : remote.suggestions;
  const selected = highlight.token === identity ? Math.min(highlight.index, Math.max(0, suggestions.length - 1)) : 0;
  const plan = useMemo(() => keyPlan(draft, sources), [draft, sources]);

  const write = (text: string, next: number | null) => {
    setDraft(text);
    setCaret(next);
    setSelection(next === null ? undefined : { start: next, end: next });
    dismiss('');
  };
  const pick = (id: string) => {
    const chosen = suggestions.find((candidate) => candidate.id === id);
    if (!chosen || !token || !open) return;
    if (chosen.id.startsWith('skill:')) setKnownSkills((current) => ({ scope: skillScope, names: [...new Set([...(current.scope === skillScope ? current.names : []), chosen.insert.slice(1)])] }));
    const next = applySuggestion(draft, token, chosen);
    write(next.text, next.caret);
  };

  return {
    /** The list over the composer, while a key word is being typed. */
    list: open && token
      ? {
          key: token.key,
          suggestions,
          empty: remote.notice ?? emptyLine(token.key, token.query, sample),
          notice: remote.notice,
          selected,
          scope: remote.scope,
          onPreview: remote.preview,
          onPick: pick,
        }
      : null,
    /** Types a key at the end, after a space, and opens its list. */
    onKey: (key: DeskKey) => {
      const text = `${draft}${draft && !/\s$/.test(draft) ? ' ' : ''}${key}`;
      write(text, text.length);
    },
    onSelection: (end: number, start = end) => { setCaret(end); if (selection && (selection.end !== end || start !== end)) setSelection(undefined); },
    selection,
    onEdit: (text: string) => { dismiss(''); setSelection(undefined); setDraft(text); },
    onKeyboard: (key: string) => {
      if (!open) return false;
      const next = keyNavigation(key, selected, suggestions.length);
      if (next.close) dismiss(identity);
      if (next.pick) pick(suggestions[selected].id);
      setHighlight({ token: identity, index: next.index });
      return next.handled;
    },
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

function emptyLine(key: DeskKey, query: string, _sample: boolean): string {
  if (key === '$') return query.includes('/') ? 'no project by that name' : 'nothing in your cellar by that name';
  return key === '@' ? 'no file by that name' : 'no skill by that name';
}
