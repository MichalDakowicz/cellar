import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { RuntimeRequest } from '@/lib/deskApprovals';
import type { Entry } from '@/types/cellar';
import { LinkedQuestionPanel } from './LinkedQuestionPanel';
import { RuntimeApprovalPanel } from './RuntimeApprovalPanel';

export function RunWaitingDock({ requests, questions }: { requests: RuntimeRequest[]; questions: { entry: Entry; id: string }[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const tabs = [...requests.map((row) => ({ id: row.id, label: `approval · ${row.what}` })),
    ...questions.map((row) => ({ id: row.id, label: 'entry question' }))];
  const current = tabs.find((row) => row.id === picked)?.id ?? tabs[0]?.id;
  return <View className="gap-2">
    {tabs.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View className="flex-row gap-2">{tabs.map((row) => <Pressable key={row.id} accessibilityRole="button" accessibilityState={{ selected: row.id === current }} onPress={() => setPicked(row.id)} className="min-h-11 justify-center rounded-lg border border-border px-3">
        <Text className="font-sans text-xs text-foreground">{row.label}</Text>
      </Pressable>)}</View>
    </ScrollView>}
    <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {requests.map((request) => <View key={request.id} style={{ display: current === request.id ? 'flex' : 'none' }}><RuntimeApprovalPanel request={request} /></View>)}
      {questions.map((question) => <View key={question.id} style={{ display: current === question.id ? 'flex' : 'none' }}><LinkedQuestionPanel entry={question.entry} questionId={question.id} /></View>)}
    </ScrollView>
  </View>;
}
