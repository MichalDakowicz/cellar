import type { PreviewPageProps } from './PreviewPage';

/**
 * The web build's preview: an iframe. The page is on another origin, so its
 * address cannot be read back and a reload is a fresh mount.
 */
export function PreviewPage({ url, reloads, onLoad, onError }: PreviewPageProps) {
  return (
    <iframe
      key={reloads}
      src={url}
      title="preview"
      onLoad={onLoad}
      onError={onError}
      style={{ border: 0, width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}
