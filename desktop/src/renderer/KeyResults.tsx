import type { Keys } from './useKeys';
import { useEffect, useRef, useState } from 'react';

/** Above composer; bounded independently from transcript and textarea scrolling. */
export function KeyResults({ list }: { list: Keys['list'] }) {
  const [preview, setPreview] = useState<{ scope: string; id: string; text: string } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = menu.current;
    const row = box?.querySelector('[aria-selected="true"]');
    if (!box || !row) return;
    const frame = box.getBoundingClientRect(); const bounds = row.getBoundingClientRect();
    if (bounds.top < frame.top) box.scrollTop -= frame.top - bounds.top;
    else if (bounds.bottom > frame.bottom) box.scrollTop += bounds.bottom - frame.bottom;
  }, [list?.selected, list?.scope]);
  if (!list) return null;
  return <div ref={menu} className="key-results" role="listbox" aria-label={`${list.key} results`}>
    {list.notice && <p className="muted" role="status">{list.notice}</p>}
    {!list.suggestions.length && !list.notice && <p className="muted" role="status">{list.key === '@' ? 'No file by that name.' : list.key === '/' ? 'No skill by that name.' : 'No command or project by that name.'}</p>}
    {list.suggestions.map((pick, index) => <div key={pick.id}>
      {pick.group && pick.group !== list.suggestions[index - 1]?.group && <p className="overline muted">{pick.group}</p>}
      <button role="option" aria-selected={index === list.selected} className={`key-result ${index === list.selected ? 'selected' : ''}`}
        onMouseEnter={() => {
          if (!pick.id.startsWith('file:') || pick.id.endsWith('/')) return;
          const scope = list.scope;
          setPreview({ scope, id: pick.id, text: 'Reading file…' });
          void list.preview(pick.id).then((text) => setPreview((current) => current?.scope === scope && current.id === pick.id ? { scope, id: pick.id, text } : current))
            .catch((error) => setPreview((current) => current?.scope === scope && current.id === pick.id ? { scope, id: pick.id, text: String(error) } : current));
        }}
        onMouseDown={(event) => event.preventDefault()} onClick={() => list.onPick(pick.id)}>
        <span className={pick.mono ? 'mono' : ''}>{pick.label}</span><small className="muted">{pick.detail}</small>
      </button>
      {preview?.scope === list.scope && preview.id === pick.id && <pre className="key-preview muted">{preview.text}</pre>}
    </div>)}
    <small className="muted">↑↓ move · tab puts it in · esc closes</small>
  </div>;
}
