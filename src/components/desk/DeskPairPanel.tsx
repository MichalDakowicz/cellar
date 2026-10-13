import { Pressable, Text, View } from 'react-native';

import { QrCode } from '@/components/qr/QrCode';

/**
 * On the pc, the code a phone scans to pair — and the one way to undo every
 * pairing at once.
 *
 * The code is a link to this pc with its secret in the fragment, so the phone's
 * own camera can read it as well as Cellar's scanner. White behind it whatever
 * the theme, like every QR code in Ping (PING.md §9.14).
 */
export function DeskPairPanel({
  url,
  reason,
  onForget,
}: {
  url: string | null;
  /** Why there is no code — the pc is on no network a phone could reach. */
  reason: string | null;
  onForget: () => void;
}) {
  return (
    <View className="gap-3">
      {url ? (
        <View className="items-center gap-3 rounded-2xl border border-border bg-card p-5">
          <View className="rounded-xl bg-white p-2">
            <QrCode value={url} size={220} label="code that pairs a phone with this pc" />
          </View>
          <Text className="text-center text-xs text-muted-foreground">
            scan it with cellar on your phone, or with the phone&apos;s camera — on the same wi-fi as this pc.
          </Text>
        </View>
      ) : (
        <Text className="text-xs text-muted-foreground">{reason ?? 'no code yet'}</Text>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="forget paired phones" hitSlop={8} onPress={onForget}>
        <Text className="text-xs font-semibold text-muted-foreground">forget every paired phone</Text>
      </Pressable>
    </View>
  );
}
