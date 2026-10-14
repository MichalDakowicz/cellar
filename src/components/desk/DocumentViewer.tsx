import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { documentMarkdown, type DeskDocument } from '@/lib/deskDocuments';
import { Markdown } from '@/components/cellar/Markdown';
import { DocumentMedia } from './DocumentMedia';

export function DocumentViewer({ file }: { file: DeskDocument }) {
  const [source, setSource] = useState(false); const rendered = ['markdown', 'asciidoc'].includes(file.kind);
  let pretty = file.source;
  if (file.kind === 'json') { try { pretty = JSON.stringify(JSON.parse(file.source ?? ''), null, 2); } catch { pretty = file.source; } }
  return <View accessibilityLabel={`file ${file.name}`} className="gap-2 rounded-xl border border-border p-3">
    <Text selectable className="font-mono text-sm font-semibold text-foreground">{file.name}</Text><Text selectable className="font-mono text-xs text-muted-foreground">{file.path} · {file.bytes.toLocaleString()} bytes</Text>
    {(rendered || file.kind === 'json') && <Pressable accessibilityRole="button" accessibilityState={{ selected: source }} onPress={() => setSource(!source)} className="min-h-11 justify-center"><Text className="font-sans text-sm text-foreground">{source ? 'view rendered' : 'view exact source'}</Text></Pressable>}
    {!!file.note && <Text className="text-xs text-muted-foreground">{file.note}</Text>}
    {file.kind === 'image' ? <Image source={{ uri: file.url }} accessibilityLabel={file.name} contentFit="contain" style={{ width: '100%', height: 320 }} />
      : file.kind === 'audio' || file.kind === 'video' ? <DocumentMedia file={file} />
      : <ScrollView style={{ maxHeight: 440 }} nestedScrollEnabled>{source ? <Text selectable className="font-mono text-xs text-foreground">{file.source}</Text> : rendered ? <Markdown text={documentMarkdown(file)} /> : <Text selectable className="font-mono text-xs text-foreground">{file.kind === 'unsupported' ? 'No built-in viewer for this format.' : pretty}</Text>}</ScrollView>}
  </View>;
}
