import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { PREVIEW_LOAD_LABEL, previewFrame, type PreviewLoad, type PreviewSize } from '@/lib/deskPreview';
import { COLORS } from '@/theme/colors';

import { PreviewPage, type PreviewPageProps } from './PreviewPage';

const FRAME_HEIGHT = 380;

const LOAD_COLOR: Record<PreviewLoad, string> = {
  connecting: COLORS.muted,
  live: COLORS.ok,
  gone: COLORS.danger,
};

/**
 * The framed page (`Preview.dc.html`): the address bar — host, port, path and
 * whether it is live — over the page laid out at the picked size and scaled
 * down into the room on screen. With no page to show, the frame says why.
 */
export function PreviewFrame({
  address,
  load,
  size,
  url,
  unreachable,
  page,
}: {
  address: string;
  load: PreviewLoad;
  size: PreviewSize;
  url: string | null;
  unreachable: string | null;
  page: Omit<PreviewPageProps, 'url'>;
}) {
  const [room, setRoom] = useState(0);
  const frame = previewFrame(size, room, FRAME_HEIGHT);

  return (
    <View className="overflow-hidden rounded-xl border border-border">
      <View className="h-10 flex-row items-center gap-2 bg-secondary/60 px-3">
        <Lock size={14} color={COLORS.muted} strokeWidth={2} />
        <Text className="min-w-0 flex-1 font-mono text-xs text-muted-foreground" numberOfLines={1}>
          {address}
        </Text>
        <Text className="text-[11px] font-semibold" style={{ color: LOAD_COLOR[load] }}>
          {PREVIEW_LOAD_LABEL[load]}
        </Text>
      </View>
      <View
        onLayout={(event) => setRoom(Math.floor(event.nativeEvent.layout.width))}
        className="items-center overflow-hidden bg-background"
        style={{ height: FRAME_HEIGHT }}
      >
        {url && room > 0 && !unreachable ? (
          <View
            style={{
              width: frame.width,
              height: frame.height,
              transform: [
                { translateY: (-frame.height * (1 - frame.scale)) / 2 },
                { scale: frame.scale },
              ],
            }}
          >
            <PreviewPage url={url} {...page} />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-xs text-muted-foreground">
              {unreachable ?? 'asking the pc for the page…'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
