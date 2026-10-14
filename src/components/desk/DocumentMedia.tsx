import { WebView } from 'react-native-webview';
import type { DeskDocument } from '@/lib/deskDocuments';
export function DocumentMedia({ file }: { file: DeskDocument }) {
  const tag = file.kind === 'video' ? 'video' : 'audio';
  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; media-src data:; style-src 'unsafe-inline'"><style>html,body{margin:0;background:#171717;height:100%;display:grid;place-items:center}video,audio{max-width:100%;max-height:100%}</style><${tag} controls playsinline preload="metadata" src="${file.url}"></${tag}>`;
  return <WebView source={{ html }} style={{ height: tag === 'video' ? 300 : 80, backgroundColor: 'transparent' }} javaScriptEnabled={false} domStorageEnabled={false} allowFileAccess={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction setSupportMultipleWindows={false} onShouldStartLoadWithRequest={(r) => r.url === 'about:blank' || r.url.startsWith('data:text/html')} />;
}
