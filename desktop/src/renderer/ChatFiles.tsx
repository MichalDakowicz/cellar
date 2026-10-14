import { useState } from 'react';
import { chatFileRefs, type DeskDocument, type DocumentRequest } from '@/lib/deskDocuments';
import { calls } from './client';
import { DocumentViewer } from './DocumentViewer';

export function ChatFiles({ text, scope }: { text: string; scope?: Omit<DocumentRequest, 'path'> }) {
  const [file, setFile] = useState<DeskDocument | null>(null); const [message, setMessage] = useState('');
  const refs = chatFileRefs(text);
  if (!scope || !refs.length) return null;
  return <div className="stack"><div className="chips">{refs.map((ref) => <button key={ref.path} title={ref.path} onClick={() => { setFile(null); setMessage(`Reading ${ref.name}…`); void calls.document({ ...scope, path: ref.path }).then((file) => { setFile(file); setMessage(''); }).catch((e) => setMessage(String(e))); }}>view {ref.name}</button>)}</div>{message && <p role="status">{message}</p>}{file && <><DocumentViewer key={file.path} file={file} /><button onClick={() => setFile(null)}>close file</button></>}</div>;
}
