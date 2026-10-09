import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { deskPairFromParams } from '@/lib/deskPair';
import { useDeskPair } from '@/store/deskPair';

/**
 * Where the pairing page on the pc sends the phone: `cellar://desk-pair?…`.
 *
 * The phone's camera app read the code, the browser opened the pc's page, and
 * the page opened this. Keep the pairing and move on to the pc screen; a link
 * that does not parse says so instead of pairing with half a pc.
 */
export default function DeskPairRoute() {
  const params = useLocalSearchParams();
  const pair = deskPairFromParams(params);
  const setPair = useDeskPair((state) => state.setPair);
  const { say } = useToast();

  useEffect(() => {
    if (!pair) return;
    setPair(pair);
    say(`paired with ${pair.name}`);
    // Keyed on the id and key: the params object is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.id, pair?.key]);

  if (pair) return <Redirect href={'/desk' as Href} />;

  return (
    <View className="flex-1 items-center justify-center bg-background p-8">
      <Text className="text-center text-sm text-muted-foreground">
        this pairing link is broken or cut short — scan the code on the pc again.
      </Text>
    </View>
  );
}
