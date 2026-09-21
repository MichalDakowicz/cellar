import * as WebBrowser from 'expo-web-browser';
import { FolderGit2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * Where this project lives, on one line.
 *
 * It is small on purpose. The link earns its place by being what an agent
 * matches its working directory against — the value is in the column, not on
 * the screen — so the page shows it the way a caption shows a source: there if
 * you look for it, never competing with the entries.
 *
 * Pressable only when there is a remote. A checkout path is not something a
 * phone can open, and a row that looks tappable and does nothing is worse than
 * a row that does not.
 */
export function RepoLink({
  label,
  url,
  path,
  align = 'start',
}: {
  label: string;
  url: string | null;
  path: string | null;
  /**
   * Which edge the line hangs off. `end` mirrors it outright — path, name,
   * then the glyph — so on the desktop page, where the heading sits at the
   * right, the caption under it ends on the same edge the mark does instead
   * of starting alone on the far side of the page.
   */
  align?: 'start' | 'end';
}) {
  const { hovered, bind } = useHover();
  const open = url ? () => void WebBrowser.openBrowserAsync(url) : undefined;
  const end = align === 'end';

  // Aligned on the baseline, not the box. Two sizes in two faces — 12px system
  // and 10px mono — never agree about where the text sits inside a line box, so
  // centring the boxes still leaves the path riding low under the name. Only
  // the baseline is a line both of them are actually on. The glyph has no
  // baseline worth the name, so it opts back out to centre.
  const glyph = (
    <View className="self-center">
      <FolderGit2 size={12} color={COLORS.muted} strokeWidth={2} />
    </View>
  );

  const name = (
    <Text
      className={['text-xs leading-4', url ? 'text-primary' : 'text-muted-foreground'].join(' ')}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  const checkout = !!path && !!url && (
    <Text
      className={[
        'min-w-0 font-mono text-[10px] leading-4 text-muted-foreground opacity-70',
        end ? 'shrink' : 'flex-1',
      ].join(' ')}
      numberOfLines={1}
    >
      {path}
    </Text>
  );

  const body = (
    <View className="flex-row items-baseline gap-1.5">
      {end ? (
        <>
          {checkout}
          {name}
          {glyph}
        </>
      ) : (
        <>
          {glyph}
          {name}
          {checkout}
        </>
      )}
    </View>
  );

  if (!open) return <View className={['mt-1.5', end ? 'self-end' : ''].join(' ')}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`open ${label}`}
      hitSlop={6}
      onPress={open}
      {...bind}
      style={webTransition('opacity')}
      className={[
        'mt-1.5 active:opacity-70',
        end ? 'self-end' : 'self-start',
        hovered ? 'opacity-80' : '',
      ].join(' ')}
    >
      {body}
    </Pressable>
  );
}
