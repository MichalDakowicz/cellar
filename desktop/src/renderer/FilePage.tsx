import { useEffect, useState } from 'react';
import type { DeskDocument } from '@/lib/deskDocuments';
import { calls } from './client';
import { DocumentViewer } from './DocumentViewer';
import { RouteLink } from './RouteLink';

export function FilePage({ search }: { search: string }) {
  const params = new URLSearchParams(search);
  const projectId = params.get('projectId') ?? '';
  const path = params.get('path') ?? '';
  const [file, setFile] = useState<DeskDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setFile(null); setError(null);
    if (!projectId || !path) { setError('Select a project file.'); return; }
    void calls.document({ projectId, path }).then((value) => { if (active) setFile(value); })
      .catch((error) => { if (active) setError(String(error)); });
    return () => { active = false; };
  }, [projectId, path]);
  return <section className="page stack"><h1>project file</h1>
    {projectId && <RouteLink href={`/project/${projectId}`}>open project</RouteLink>}
    {error ? <p role="alert">{error}</p> : file ? <DocumentViewer file={file} /> : <p role="status">reading file…</p>}
  </section>;
}
