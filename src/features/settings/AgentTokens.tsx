import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field, Overline } from '@/components/ui/controls';
import { useToast } from '@/components/ui/Toast';
import { AgentTokenRow } from '@/features/settings/AgentTokenRow';
import { SkillInstall } from '@/features/settings/SkillInstall';
import { useAgentTokens } from '@/hooks/useAgentTokens';
import { mcpConfig } from '@/lib/agentConfig';
import { readError } from '@/lib/utils';

/**
 * Tokens for the hosted server, so an agent can reach the cellar without a
 * node process on the machine it is running on.
 *
 * The fresh token is shown once and the copy button is the only way it is ever
 * read — there is no "show it again", because the database holds a hash and
 * cannot produce it a second time. Saying that on the screen matters more than
 * it looks: the failure it prevents is closing settings and finding out later.
 */
export function AgentTokens({ gutter }: { gutter: string }) {
  const { tokens, mint, minting, revoke } = useAgentTokens();
  const { say } = useToast();
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

  const make = async () => {
    setError(null);
    try {
      setFresh(await mint(name.trim() || 'agent'));
      setName('');
    } catch (failure) {
      setError(readError(failure));
    }
  };

  const copy = (value: string, said: string) => {
    void Clipboard.setStringAsync(value);
    say(said);
  };

  return (
    <View className={`gap-2 pt-7 ${gutter}`}>
      <Overline>agent access</Overline>

      <Field
        placeholder="what it is for — laptop, work desktop"
        value={name}
        onChangeText={setName}
        onSubmitEditing={() => void make()}
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="mint a token"
        disabled={minting}
        onPress={() => void make()}
        className={[
          'h-11 items-center justify-center rounded-full bg-secondary active:opacity-80',
          minting ? 'opacity-50' : '',
        ].join(' ')}
      >
        <Text className="text-sm font-semibold text-foreground">
          {minting ? 'minting…' : 'mint a token'}
        </Text>
      </Pressable>

      {fresh ? (
        <View className="gap-2 rounded-2xl border border-border bg-secondary/40 p-3">
          <Text className="font-mono text-xs text-foreground" selectable>
            {fresh}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="copy the token"
              onPress={() => copy(fresh, 'token copied')}
              className="h-9 flex-1 items-center justify-center rounded-full border border-border active:opacity-70"
            >
              <Text className="text-xs font-semibold text-foreground">copy the token</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="copy the mcp config"
              onPress={() => copy(mcpConfig(url, fresh), 'mcp config copied')}
              className="h-9 flex-1 items-center justify-center rounded-full border border-border active:opacity-70"
            >
              <Text className="text-xs font-semibold text-foreground">copy the config</Text>
            </Pressable>
          </View>
          <Text className="text-xs text-muted-foreground">
            copy it now — only its hash is stored, so this is the last time it can be shown
          </Text>
        </View>
      ) : (
        <Text className="text-xs text-muted-foreground">
          a token lets an agent read and work this cellar over the hosted server, with exactly your access and
          nothing more. revoke one and it stops on the next call.
        </Text>
      )}

      {tokens.length > 0 && (
        <View className="pt-2">
          {tokens.map((token) => (
            <AgentTokenRow key={token.id} token={token} onRevoke={(id) => void revoke(id)} />
          ))}
        </View>
      )}

      {/* With a token in hand this is the whole setup in one line, not just
          the skill — so the three copies collapse to one the moment there is
          something to put in it. */}
      <SkillInstall token={fresh} supabaseUrl={url} />
    </View>
  );
}
