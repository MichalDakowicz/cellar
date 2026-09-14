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
export function RepoLink({ label, url, path }: { label: string; url: string | null; path: string | null }) {
  const { hovered, bind } = useHover();
  const open = url ? () => void WebBrowser.openBrowserAsync(url) : undefined;

  const body = (
    <View className="flex-row items-center gap-1.5">
      <FolderGit2 size={12} color={COLORS.muted} strokeWidth={2} />
      <Text
        className={['text-xs', url ? 'text-primary' : 'text-muted-foreground'].join(' ')}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!!path && !!url && (
        <Text className="min-w-0 flex-1 font-mono text-[10px] text-muted-foreground opacity-70" numberOfLines={1}>
          {path}
        </Text>
      )}
    </View>
  );

  if (!open) return <View className="mt-1.5">{body}</View>;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`open ${label}`}
      hitSlop={6}
      onPress={open}
      {...bind}
      style={webTransition('opacity')}
      className={['mt-1.5 self-start active:opacity-70', hovered ? 'opacity-80' : ''].join(' ')}
    >
      {body}
    </Pressable>
  );
}
