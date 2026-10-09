import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Segmented } from '@/components/ui/controls';
import { raceRows } from '@/lib/deskLater';
import type { SAMPLE_RACE } from '@/lib/deskSample';

type Race = typeof SAMPLE_RACE;

/**
 * Race (`PhoneRace.dc.html`): two runs off one commit — look at either, compare
 * them measure by measure, keep one. Answered here, locally, until races run
 * for real (docs/desk/TASKS.md W19).
 */
export function RaceBody({ race }: { race: Race }) {
  const [pick, setPick] = useState(race.runs[0].agent);
  const [kept, setKept] = useState<string | null>(null);
  const run = race.runs.find((candidate) => candidate.agent === pick) ?? race.runs[0];

  return (
    <View className="gap-4">
      <Segmented<string>
        label="which run to look at"
        value={pick}
        onChange={setPick}
        options={race.runs.map((candidate) => ({ value: candidate.agent, label: candidate.agent }))}
      />
      <View className="h-[200px] items-center justify-center rounded-xl border border-border bg-secondary/60 px-6">
        <Text className="text-center text-sm text-muted-foreground">{`${run.agent}'s preview · ${run.approach}`}</Text>
      </View>
      <View className="gap-2">
        <View className="flex-row gap-2">
          <Text className="w-20" />
          {race.runs.map((candidate) => (
            <Text
              key={candidate.agent}
              className={`min-w-0 flex-1 text-sm font-semibold ${candidate.agent === pick ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {candidate.agent}
            </Text>
          ))}
        </View>
        {raceRows(race.runs).map((row) => (
          <View key={row.label} className="flex-row gap-2">
            <Text className="w-20 text-sm text-muted-foreground">{row.label}</Text>
            {row.values.map((value, index) => (
              <Text key={`${row.label}:${index}`} className="min-w-0 flex-1 text-sm text-foreground">
                {value}
              </Text>
            ))}
          </View>
        ))}
      </View>
      {kept ? (
        <Text className="text-sm text-muted-foreground">{`kept ${kept}'s · the other worktree goes, its chat stays 7 days`}</Text>
      ) : (
        <View className="gap-2">
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setKept('both, followed up')}
              className="h-[52px] flex-1 items-center justify-center rounded-full border border-border active:opacity-70"
            >
              <Text className="text-sm font-semibold text-foreground">follow up both</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setKept(pick)}
              className="h-[52px] flex-1 items-center justify-center rounded-full bg-primary active:opacity-80"
            >
              <Text className="text-sm font-semibold text-primary-foreground">{`keep ${pick}'s`}</Text>
            </Pressable>
          </View>
          <Text className="text-center text-xs text-muted-foreground">the other worktree is deleted · its chat stays for 7 days</Text>
        </View>
      )}
    </View>
  );
}
