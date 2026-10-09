import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { parseDeskPair, type DeskPair } from '@/lib/deskPair';

/**
 * A camera that reads the pc's pairing code and nothing else. A sign-in code or
 * a poster is passed over without a word — only `parseDeskPair` decides what
 * gets out — and the same code in view is reported once, not thirty times.
 */
export function DeskScanner({ onPair }: { onPair: (pair: DeskPair) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !permission || permission.granted || !permission.canAskAgain) return;
    asked.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (done.current) return;
      const pair = parseDeskPair(data);
      if (!pair) return;
      done.current = true;
      onPair(pair);
    },
    [onPair],
  );

  if (!permission) return <View className="aspect-square w-full rounded-2xl bg-secondary" />;

  if (!permission.granted) {
    return (
      <View className="items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <Text className="text-center text-sm text-muted-foreground">
          {permission.canAskAgain
            ? 'cellar needs the camera to read the code on the pc'
            : 'the camera is off for cellar — turn it on in android settings, or scan the code with the camera app'}
        </Text>
        {permission.canAskAgain && (
          <Pressable
            onPress={requestPermission}
            accessibilityRole="button"
            className="rounded-full bg-primary px-5 py-2.5 active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">allow the camera</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="aspect-square w-full overflow-hidden rounded-2xl bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <View className="h-3/5 w-3/5 rounded-2xl border-2 border-white/70" />
        </View>
      </View>
      <Text className="text-center text-sm text-muted-foreground">point it at the code on the pc</Text>
    </View>
  );
}
