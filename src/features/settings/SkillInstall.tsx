import * as Clipboard from 'expo-clipboard';
import { Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { skillInstall, type Shell } from '@/lib/agentInstall';

/**
 * The other half of setting an agent up.
 *
 * A token tells it how to reach the cellar; the skill tells it how to work one
 * — claim before touching anything, ask when a thought is too thin, and write
 * lines in the voice the list is written in. Without it an agent reads the
 * tools and invents its own etiquette, which is how a list of one-liners ends
 * up with "I've successfully implemented the requested changes" in it.
 *
 * It sits under the tokens rather than in its own section because it is the
 * same job — this is the second thing you paste, not a separate feature — and
 * it is always visible, because unlike a token it is not minted and can be
 * re-run on any machine at any time.
 */

const SHELLS: { shell: Shell; label: string }[] = [
  { shell: 'powershell', label: 'windows' },
  { shell: 'sh', label: 'mac + linux' },
];

export function SkillInstall() {
  const { say } = useToast();

  const copy = (shell: Shell) => {
    void Clipboard.setStringAsync(skillInstall(shell));
    say('install copied');
  };

  return (
    <View className="gap-2 rounded-2xl border border-border p-3">
      <Text className="text-xs text-muted-foreground">
        the skill teaches an agent how to work a thought — claim it, ask when it is too thin, report back in
        one line. paste this into a terminal on the machine the agent runs on.
      </Text>
      <View className="flex-row gap-2">
        {SHELLS.map(({ shell, label }) => (
          <Pressable
            key={shell}
            accessibilityRole="button"
            accessibilityLabel={`copy the skill install for ${label}`}
            onPress={() => copy(shell)}
            className="h-9 flex-1 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <Text className="text-xs font-semibold text-foreground">{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
