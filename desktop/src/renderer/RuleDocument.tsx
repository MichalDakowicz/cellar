import { useState } from 'react';
import { Markdown } from './Markdown';
import type { calls } from './client';
import { renderedRules } from '@/lib/deskRuleDocument';

type File = Awaited<ReturnType<typeof calls.rulesReview>>['files'][number];
export function RuleDocument({ file }: { file: File }) {
  const [view, setView] = useState<'rendered' | 'source' | 'changes'>('rendered');
  return <section className="card stack">
    <h3 className="mono">{file.name}</h3>
    <p className="muted">Instruction file after sync. Review changes before writing.</p>
    <div className="chips">{(['rendered', 'source', 'changes'] as const).map((mode) => <button key={mode} aria-label={`${file.name}: view ${mode}`} aria-pressed={view === mode} className={view === mode ? 'selected' : ''} onClick={() => setView(mode)}>{mode === 'rendered' ? 'rendered' : `view ${mode}`}</button>)}</div>
    <div className="rule-document">{view === 'rendered' ? <Markdown value={renderedRules(file.after) || 'No instruction text.'} /> : <pre>{view === 'source' ? file.after : file.diff}</pre>}</div>
  </section>;
}
