import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useToast } from '@/components/ui/Toast';
import { DeskScanner } from '@/features/desk/DeskScanner';
import { MAX_W, useGutter } from '@/hooks/useResponsive';
import type { DeskPair } from '@/lib/deskPair';
import { useDeskPair } from '@/store/deskPair';

/** Pairing, from the phone's side: read the pc's code, keep what it says, go back to the pc. */
export default function DeskScan() {
  const router = useRouter();
  const setPair = useDeskPair((state) => state.setPair);
  const { say } = useToast();
  const gutter = useGutter();

  const onPair = useCallback(
    (pair: DeskPair) => {
      setPair(pair);
      say(`paired with ${pair.name}`);
      router.replace('/desk' as Href);
    },
    [router, say, setPair],
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`flex-row items-center gap-3 pt-4 ${gutter}`}>
            <ScreenAction />
            <Text className="text-2xl font-bold tracking-tight text-foreground">pair with your pc</Text>
          </View>
          <View className={`pt-6 ${gutter}`}>
            {Platform.OS === 'web' ? (
              <Text className="text-sm text-muted-foreground">
                pairing is for the phone — a browser reaches the pc through the cellar without it.
              </Text>
            ) : (
              <DeskScanner onPair={onPair} />
            )}
          </View>
        </ContentShell>
      </ScrollView>
      <AppChrome />
    </View>
  );
}
