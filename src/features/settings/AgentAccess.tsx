import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field, Overline } from '@/components/ui/controls';
import { useAuth } from '@/features/auth/AuthProvider';
import { setPassword } from '@/features/auth/authActions';
import { readError } from '@/lib/utils';

/**
 * Give the account a password, so a command line can sign in as you.
 *
 * This exists for one reason: the MCP server that hands your cellar to an agent
 * (`mcp/`) has no browser. An account made with Google has no password at all,
 * and every way around that — a localhost OAuth callback, a code emailed by
 * Supabase — depends on something outside this app working first. This session
 * is already signed in, so it can simply set one, and signing an agent in
 * becomes ordinary.
 *
 * Google sign-in keeps working. This adds a second way in and removes none.
 */
export function AgentAccess({ gutter }: { gutter: string }) {
  const { user } = useAuth();
  const [password, setDraft] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 6;

  const save = async () => {
    if (password.length < 6) return;
    setState('saving');
    setError(null);
    try {
      await setPassword(password);
      setDraft('');
      setState('done');
    } catch (failure) {
      setError(readError(failure));
      setState('idle');
    }
  };

  return (
    <View className={`gap-2 pt-7 ${gutter}`}>
      <Overline>password for agent tools</Overline>
      <Field
        placeholder="at least six characters"
        value={password}
        onChangeText={(next) => {
          setDraft(next);
          setState('idle');
        }}
        onSubmitEditing={() => void save()}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        error={tooShort ? 'six characters or more' : error}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="set the password"
        disabled={password.length < 6 || state === 'saving'}
        onPress={() => void save()}
        className={[
          'h-11 items-center justify-center rounded-full bg-secondary active:opacity-80',
          password.length < 6 || state === 'saving' ? 'opacity-50' : '',
        ].join(' ')}
      >
        <Text className="text-sm font-semibold text-foreground">
          {state === 'saving' ? 'setting it…' : 'set the password'}
        </Text>
      </Pressable>
      <Text className="text-xs text-muted-foreground">
        {state === 'done'
          ? `done. run npm run login in cellar/mcp and use ${user?.email ?? 'this email'} with it.`
          : 'the mcp server has no browser to sign in through, so it needs an email and a password. google sign-in keeps working here either way.'}
      </Text>
    </View>
  );
}
