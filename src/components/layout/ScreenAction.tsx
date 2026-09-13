import { usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useNavAction } from '@/components/layout/navActions';
import { activeTabFor } from '@/components/layout/navDestinations';
import { useHover, useIsDesktop, webTransition } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * The screen's one action, as a labelled button on the page — the desktop half
 * of the nav island's left plate.
 *
 * On a phone that plate is under your thumb, which is the best place for it. On
 * a 2550px window the same control sat in the sidebar, a full screen-width away
 * from the thing it acts on: you read a project on the right and reached to the
 * far left to filter it. So on desktop it renders here, beside the heading it
 * belongs to, and the sidebar keeps only navigation.
 *
 * It resolves itself from the route through `useNavAction`, the same source the
 * island uses, so the two are the same action by construction and a screen only
 * has to say where it goes.
 */
export function ScreenAction() {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const activeTab = activeTabFor(pathname);
  const action = useNavAction(pathname, activeTab);
  const { hovered, bind } = useHover();

  // Phone keeps the island: two copies of one action is one too many.
  if (!isDesktop) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      {...bind}
      style={[
        webTransition('background-color'),
        hovered && !action.active ? { backgroundColor: COLORS.rowHover } : null,
      ]}
      className={[
        'flex-row items-center gap-2 rounded-full px-3.5 py-2 active:opacity-80',
        action.active ? 'bg-primary/15' : 'bg-secondary',
      ].join(' ')}
    >
      <action.Icon size={15} color={action.active ? COLORS.accent : COLORS.foreground} strokeWidth={2.2} />
      <Text
        className={['text-xs font-semibold', action.active ? 'text-primary' : 'text-foreground'].join(' ')}
        numberOfLines={1}
      >
        {action.label}
      </Text>
      {action.badge > 0 && (
        <View className="min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-px">
          <Text className="text-[10px] font-bold" style={{ color: COLORS.accentInk }}>
            {action.badge > 99 ? '99+' : action.badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
