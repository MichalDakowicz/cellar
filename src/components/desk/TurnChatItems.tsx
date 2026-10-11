import { Text, View } from 'react-native';
import { Markdown } from '@/components/cellar/Markdown';
import { RunChatItems } from './RunChatItems';
import { TurnTools } from './TurnTools';
import type { TurnItem } from '@/lib/deskEvents';
import { turnGroups } from '@/lib/deskTurnGroups';

/** The existing transcript layout, fed by durable turn items. */
export function TurnChatItems({ items, youCaption, historical }: { items: TurnItem[]; youCaption: string; historical: boolean }) {
  return <View className="gap-4">{turnGroups(items).map((group) => {
    if (group.kind === 'tools') return <TurnTools key={group.items[0].id} items={group.items} historical={historical} />;
    const item = group.item;
    if (item.kind === 'user_message') return <RunChatItems key={item.id} items={[{ kind: 'you', text: item.text }]} youCaption={youCaption} />;
    if (item.kind === 'assistant_message') return <View key={item.id}>{(item.parts ?? [item.text]).map((part, index) => <Markdown key={index} text={part} className="font-sans text-sm leading-relaxed text-foreground" />)}</View>;
    return <View key={item.id} className="gap-1"><Text className="font-sans text-xs text-muted-foreground">{item.kind.replace(/_/g, ' ')}{historical ? ' · saved' : item.status === 'failed' ? ' · failed' : ''}</Text><Markdown text={item.text} className="font-sans text-sm text-foreground" />{!!item.detail && <Text selectable className="font-mono text-xs text-muted-foreground">{item.detail}</Text>}</View>;
  })}</View>;
}
