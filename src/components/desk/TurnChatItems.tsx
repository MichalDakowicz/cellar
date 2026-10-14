import { Text, View } from 'react-native';
import { Markdown } from '@/components/cellar/Markdown';
import { RunChatItems } from './RunChatItems';
import { TurnTools } from './TurnTools';
import type { TurnItem } from '@/lib/deskEvents';
import { turnGroups } from '@/lib/deskTurnGroups';
import { ChatFiles, type DocumentScope } from './ChatFiles';

/** The existing transcript layout, fed by durable turn items. */
export function TurnChatItems({ items, youCaption, historical, documentScope }: { items: TurnItem[]; youCaption: string; historical: boolean; documentScope?: DocumentScope | null }) {
  return <View className="gap-4">{turnGroups(items).map((group) => {
    if (group.kind === 'tools') return <View key={group.items[0].id}><TurnTools items={group.items} historical={historical} /><ChatFiles text={group.items.map((i) => i.text + '\n' + (i.detail ?? '')).join('\n')} scope={documentScope} /></View>;
    const item = group.item;
    if (item.kind === 'user_message') return <RunChatItems key={item.id} items={[{ kind: 'you', text: item.text }]} youCaption={youCaption} />;
    if (item.kind === 'assistant_message') return <View key={item.id}>{(item.parts ?? [item.text]).map((part, index) => <Markdown key={index} text={part} className="font-sans text-sm leading-relaxed text-foreground" />)}<ChatFiles text={item.text} scope={documentScope} /></View>;
    return <View key={item.id} className="gap-1"><Text className="font-sans text-xs text-muted-foreground">{item.kind.replace(/_/g, ' ')}{historical ? ' · saved' : item.status === 'failed' ? ' · failed' : ''}</Text><Markdown text={item.text} className="font-sans text-sm text-foreground" />{!!item.detail && <Text selectable className="font-mono text-xs text-muted-foreground">{item.detail}</Text>}</View>;
  })}</View>;
}
