import * as WebBrowser from 'expo-web-browser';
import { Link2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useLinkPreview } from '@/hooks/useLinkPreview';
import { useHover, webTransition } from '@/hooks/useResponsive';
import { linkHost } from '@/lib/links';
import { COLORS } from '@/theme/colors';

/**
 * What a link on this thought actually is, as a card.
 *
 * Only on the entry screen. A row in a list stays one line — that rule is what
 * makes a wall of thoughts readable, and a preview block in it would be the
 * first thing to break it — but the entry page is where you have stopped to
 * look at one thought, and "which of the four links I dumped was the useful
 * one" is exactly the question it should answer without four taps.
 *
 * Never a bare host. A card whose title is the host and whose site line is the
 * host is the host, twice — so when nothing came back the link stays a link in
 * the sentence above and grows no card at all.
 */
export function LinkPreview({ href }: { href: string }) {
  const record = useLinkPreview(href);
  const { hovered, bind } = useHover();
  const meta = record?.meta;

  if (!meta?.title) return null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`open ${meta.title}`}
      onPress={() => void WebBrowser.openBrowserAsync(href)}
      {...bind}
      style={[webTransition('background-color'), hovered ? { backgroundColor: COLORS.rowHover } : null]}
      className="mt-2 rounded-xl bg-neutral-900 px-3.5 py-3 active:opacity-80"
    >
      <View className="flex-row items-center gap-2">
        <Link2 size={12} color={COLORS.muted} strokeWidth={2} />
        <Text className="min-w-0 flex-1 text-[11px] text-muted-foreground" numberOfLines={1}>
          {meta.site ?? linkHost(href)}
        </Text>
      </View>
      <Text className="mt-1 text-sm font-bold leading-snug text-foreground" numberOfLines={2}>
        {meta.title}
      </Text>
      {!!meta.description && (
        <Text className="mt-1 text-xs leading-snug text-muted-foreground" numberOfLines={3}>
          {meta.description}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Every link on the thought and its lines, as cards.
 *
 * Capped, because a thought can grow twenty lines and a page of preview cards
 * is no longer a page about a thought. The first few are the ones that were
 * dumped with it; later ones are still live links in the thread itself.
 */
export function LinkPreviews({ hrefs, limit = 4 }: { hrefs: string[]; limit?: number }) {
  if (hrefs.length === 0) return null;
  return (
    <View>
      {hrefs.slice(0, limit).map((href) => (
        <LinkPreview key={href} href={href} />
      ))}
    </View>
  );
}
