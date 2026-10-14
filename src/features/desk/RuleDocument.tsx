import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Markdown } from '@/components/cellar/Markdown';
import type { DeskCalls } from './deskClient';
import { renderedRules } from '@/lib/deskRuleDocument';

type File = Awaited<ReturnType<DeskCalls['rulesReview']>>['files'][number];
export function RuleDocument({ file }: { file: File }) {
  const [view, setView] = useState<'rendered' | 'source' | 'changes'>('rendered');
  return <View className="gap-3 rounded-xl border border-border p-3">
    <Text className="font-mono text-lg text-foreground">{file.name}</Text>
    <Text className="font-sans text-sm text-muted-foreground">Instruction file after sync. Review changes before writing.</Text>
    <View className="flex-row flex-wrap gap-2">{(['rendered', 'source', 'changes'] as const).map((mode) => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={`${file.name}: view ${mode}`} accessibilityState={{ selected: view === mode }} onPress={() => setView(mode)} className={`min-h-11 justify-center rounded-lg border border-border px-3 ${view === mode ? 'bg-secondary' : ''}`}><Text className="font-sans text-sm text-foreground">{mode === 'rendered' ? 'rendered' : `view ${mode}`}</Text></Pressable>)}</View>
    <ScrollView nestedScrollEnabled style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 12 }} className="rounded-lg bg-secondary">
      {view === 'rendered' ? <Markdown text={renderedRules(file.after) || 'No instruction text.'} className="font-sans text-sm leading-relaxed text-foreground" /> : <Text selectable className="font-mono text-xs text-foreground">{view === 'source' ? file.after : file.diff}</Text>}
    </ScrollView>
  </View>;
}
