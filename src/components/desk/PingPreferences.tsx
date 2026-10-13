import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SwitchRow } from '@/components/ui/controls';
import { parsePingTime, pingTime, type PingPreferences as Preferences } from '@/lib/deskNotificationRouting';

export function PingPreferences({ preferences, busy, error, onSave }: { preferences: Preferences; busy: boolean; error: string | null; onSave: (value: Preferences) => void }) {
  const [start, setStart] = useState(pingTime(preferences.quietStart));
  const [end, setEnd] = useState(pingTime(preferences.quietEnd));
  const [invalid, setInvalid] = useState<string | null>(null);
  return <View className="gap-2">
    {(['approvals', 'questions', 'finished', 'checksFailed'] as const).map((key) => <SwitchRow key={key} label={{ approvals: 'approvals', questions: 'questions', finished: 'run finished', checksFailed: 'jobs failed' }[key]} value={preferences[key]} onChange={(value) => { if (!busy) onSave({ ...preferences, [key]: value }); }} />)}
    <Text className="text-sm text-muted-foreground">Quiet hours: approvals and questions go to phone; other pings wait. Equal times disable quiet hours.</Text>
    <View className="flex-row items-center gap-3">
      <TextInput accessibilityLabel="quiet hours start HH:MM" className="min-h-11 rounded-lg border border-border px-3 text-foreground" value={start} onChangeText={setStart} />
      <TextInput accessibilityLabel="quiet hours end HH:MM" className="min-h-11 rounded-lg border border-border px-3 text-foreground" value={end} onChangeText={setEnd} />
      <Pressable accessibilityRole="button" accessibilityLabel="save quiet hours" className="min-h-11 justify-center px-3" disabled={busy} onPress={() => {
        const quietStart = parsePingTime(start), quietEnd = parsePingTime(end);
        if (quietStart === null || quietEnd === null) { setInvalid('Use HH:MM, from 00:00 to 23:59.'); return; }
        setInvalid(null); onSave({ ...preferences, quietStart, quietEnd });
      }}><Text className="text-foreground">save</Text></Pressable>
    </View>
    {(error || invalid) && <Text className="text-sm text-destructive-foreground">{error ?? invalid}</Text>}
  </View>;
}
