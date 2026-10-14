import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { chatFileRefs, type DeskDocument, type DocumentRequest } from '@/lib/deskDocuments';
import type { DeskCalls } from '@/lib/deskCalls';
import { DocumentViewer } from './DocumentViewer';

export type DocumentScope = { calls: DeskCalls; request: Omit<DocumentRequest, 'path'> };
export function ChatFiles({ text, scope }: { text: string; scope?: DocumentScope | null }) {
  const [file, setFile] = useState<DeskDocument | null>(null); const [message, setMessage] = useState('');
  const refs = chatFileRefs(text);
  if (!scope || !refs.length) return null;
  return <View className="gap-2"><View className="flex-row flex-wrap gap-2">{refs.map((ref) => <Pressable key={ref.path} accessibilityRole="button" accessibilityLabel={`view ${ref.name}`} className="min-h-11 justify-center rounded-xl bg-secondary px-3" onPress={() => { setFile(null); setMessage(`Reading ${ref.name}…`); void scope.calls.document({ ...scope.request, path: ref.path }).then((file) => { setFile(file); setMessage(''); }).catch((e) => setMessage(String(e))); }}><Text className="font-mono text-xs text-foreground">view {ref.name}</Text></Pressable>)}</View>{!!message && <Text className="text-xs text-muted-foreground">{message}</Text>}{file && <><DocumentViewer key={file.path} file={file} /><Pressable accessibilityRole="button" onPress={() => setFile(null)} className="min-h-11 justify-center"><Text className="text-sm text-foreground">close file</Text></Pressable></>}</View>;
}
