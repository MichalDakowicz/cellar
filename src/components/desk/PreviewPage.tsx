import { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';

export type PreviewPageProps = {
  autoPlay?: boolean;
  onMessage?: (message: string) => void;
  url: string;
  /** Bumped to reload the page in place. */
  reloads: number;
  onLoadStart: () => void;
  onLoad: () => void;
  onError: () => void;
  onUrl: (url: string) => void;
};

/**
 * The pc's page itself, in a webview. Links that open a new window stay in this
 * one: a preview has nowhere else to go.
 */
export function PreviewPage({ url, reloads, onLoadStart, onLoad, onError, onUrl, onMessage, autoPlay = false }: PreviewPageProps) {
  const view = useRef<WebView>(null);

  useEffect(() => {
    if (reloads > 0) view.current?.reload();
  }, [reloads]);

  return (
    <WebView
      ref={view}
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      mediaPlaybackRequiresUserAction={!autoPlay}
      allowsInlineMediaPlayback
      onLoadStart={onLoadStart}
      onLoad={onLoad}
      onError={onError}
      onHttpError={onError}
      onMessage={(event) => onMessage?.(event.nativeEvent.data)}
      onNavigationStateChange={(state) => onUrl(state.url)}
    />
  );
}
