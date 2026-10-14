import { useState } from 'react';
import { documentMarkdown, type DeskDocument } from '@/lib/deskDocuments';
import { Markdown } from './Markdown';

export function DocumentViewer({ file }: { file: DeskDocument }) {
  const [source, setSource] = useState(false);
  const rendered = ['markdown', 'asciidoc'].includes(file.kind);
  let pretty = file.source;
  if (file.kind === 'json') { try { pretty = JSON.stringify(JSON.parse(file.source ?? ''), null, 2); } catch { pretty = file.source; } }
  return <section className="card stack document-viewer" aria-label={`file ${file.name}`}>
    <header className="row wrap"><strong className="mono">{file.name}</strong><small className="muted">{file.bytes.toLocaleString()} bytes</small>{(rendered || file.kind === 'json') && <button aria-pressed={source} onClick={() => setSource(!source)}>{source ? 'view rendered' : 'view exact source'}</button>}</header>
    <small className="mono muted">{file.path}</small>{file.note && <small className="muted">{file.note}</small>}
    <div style={{ maxHeight: 480, overflow: 'auto', overflowWrap: 'anywhere' }}>
      {source ? <pre style={{ whiteSpace: 'pre-wrap' }}>{file.source}</pre> : rendered ? <Markdown value={documentMarkdown(file)} />
        : file.kind === 'image' ? <img src={file.url} alt={file.name} style={{ display: 'block', maxWidth: '100%', maxHeight: 440, objectFit: 'contain' }} />
        : file.kind === 'audio' ? <audio controls preload="none" src={file.url} style={{ maxWidth: '100%' }} />
        : file.kind === 'video' ? <video controls preload="metadata" playsInline src={file.url} style={{ maxWidth: '100%', maxHeight: 440 }} />
        : file.kind === 'unsupported' ? <p>No built-in viewer for this format.</p> : <pre style={{ whiteSpace: 'pre-wrap' }}>{pretty}</pre>}
    </div>
  </section>;
}
