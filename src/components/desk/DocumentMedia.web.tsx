import type { DeskDocument } from '@/lib/deskDocuments';
export function DocumentMedia({ file }: { file: DeskDocument }) {
  return file.kind === 'video' ? <video src={file.url} controls playsInline preload="metadata" style={{ width: '100%', maxHeight: 360 }} /> : <audio src={file.url} controls preload="none" style={{ width: '100%' }} />;
}
