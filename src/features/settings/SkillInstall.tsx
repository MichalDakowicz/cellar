import * as Clipboard from 'expo-clipboard';
import { Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { fullSetup, skillInstall, type Shell } from '@/lib/agentInstall';

/**
 * The other half of setting an agent up — and, right after a token is minted,
 * the whole of it.
 *
 * A token tells an agent how to reach the cellar; the skill tells it how to
 * work one — claim before touching anything, ask when a thought is too thin,
 * and write lines in the voice the list is written in. Without it an agent
 * reads the tools and invents its own etiquette, which is how a list of
 * one-liners ends up with "I've successfully implemented the requested
 * changes" in it.
 *
 * With a fresh token in hand the same button copies a line that does both: the
 * installer takes the token and writes the MCP entry itself, so there is no
 * config file to find and no `claude` CLI to have. Without one it is the skill
 * on its own, which is the right command for a machine that is already
 * connected and only needs the working agreement refreshed.
 *
 * It sits under the tokens rather than in its own section because it is the
 * same job, and it is always visible, because unlike a token it is not minted
 * and can be re-run on any machine at any time.
 */

const SHELLS: { shell: Shell; label: string }[] = [
  { shell: 'powershell', label: 'windows' },
  { shell: 'sh', label: 'mac + linux' },
];

export function SkillInstall({ token, supabaseUrl }: { token?: string | null; supabaseUrl?: string }) {
  const { say } = useToast();
  const whole = !!token && !!supabaseUrl;

  const copy = (shell: Shell) => {
    void Clipboard.setStringAsync(whole ? fullSetup(shell, supabaseUrl, token) : skillInstall(shell));
    say(whole ? 'setup copied' : 'install copied');
  };

  return (
    <View className="gap-2 rounded-2xl border border-border p-3">
      <Text className="text-xs text-muted-foreground">
        {whole
          ? 'one line, the whole setup — it registers the server with the token above and installs the skill that teaches an agent how to work a thought. paste it into a terminal on the machine the agent runs on.'
          : 'the skill teaches an agent how to work a thought — claim it, ask when it is too thin, report back in one line. paste this into a terminal on the machine the agent runs on.'}
      </Text>
      <View className="flex-row gap-2">
        {SHELLS.map(({ shell, label }) => (
          <Pressable
            key={shell}
            accessibilityRole="button"
            accessibilityLabel={`copy the ${whole ? 'setup' : 'skill install'} for ${label}`}
            onPress={() => copy(shell)}
            className="h-9 flex-1 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <Text className="text-xs font-semibold text-foreground">{label}</Text>
          </Pressable>
        ))}
      </View>
      {whole && (
        <Text className="text-xs text-muted-foreground">
          it merges into the config the agent already has and keeps a copy of the old one beside it, so
          nothing in there is lost.
        </Text>
      )}
    </View>
  );
}
