import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { deskPairFromParams } from '@/lib/deskPair';
import { useDeskPair } from '@/store/deskPair';

/**
 * Where the pairing page on the pc sends the phone: `cellar://desk-pair?…`.
 *
 * A link is not a scan — any app or page can fire one — so nothing is kept
 * until you say so here: which pc, at which address, and, when this phone is
 * already paired with a different one, that it would replace it. A link that
 * does not parse says so instead of pairing with half a pc.
 */
export default function DeskPairRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const pair = deskPairFromParams(params);
  const current = useDeskPair((state) => state.pair);
  const setPair = useDeskPair((state) => state.setPair);
  const { say } = useToast();
  const [kept, setKept] = useState(false);

  if (kept || (pair && current?.id === pair.id && current.key === pair.key)) return <Redirect href={'/desk' as Href} />;

  if (!pair) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Text className="text-center text-sm text-muted-foreground">
          this pairing link is broken or cut short — scan the code on the pc again.
        </Text>
      </View>
    );
  }

  const replaces = current && current.id !== pair.id ? current.name : null;
  const keep = () => {
    setPair(pair);
    say(`paired with ${pair.name}`);
    setKept(true);
  };

  return (
    <View className="flex-1 justify-center gap-4 bg-background p-8">
      <Text className="text-2xl font-bold tracking-tight text-foreground">pair with {pair.name}?</Text>
      <Text className="text-sm text-muted-foreground">
        at {pair.host}:{pair.port}. it will be able to run agents for you, and this phone will send it prompts.
        {replaces ? ` it replaces ${replaces}.` : ''} only say yes if you just scanned the code on your own pc.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`pair with ${pair.name}`}
        onPress={keep}
        className="h-11 items-center justify-center rounded-full bg-primary active:opacity-80"
      >
        <Text className="text-sm font-semibold text-primary-foreground">pair with it</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="do not pair"
        onPress={() => router.replace('/' as Href)}
        className="h-11 items-center justify-center rounded-full border border-border active:opacity-80"
      >
        <Text className="text-sm font-semibold text-muted-foreground">not this one</Text>
      </Pressable>
    </View>
  );
}
