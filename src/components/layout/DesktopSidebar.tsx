import { usePathname, useRouter } from 'expo-router';
import { ChevronDown, Settings } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useNavAction } from '@/components/layout/navActions';
import { activeTabFor, NAV_DESTINATIONS, type NavDestination } from '@/components/layout/navDestinations';
import { Overline } from '@/components/ui/controls';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCellar, useCurrentShelf } from '@/features/cellar/useCellar';
import { useUnfiledCount } from '@/features/cellar/useUnfiledCount';
import { Avatar } from '@/features/friends/Avatar';
import { useProfile } from '@/hooks/useProfile';
import { SIDEBAR_WIDTH, useHover, webTransition } from '@/hooks/useResponsive';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * The desktop shell's navigation: the nav islands, unpacked.
 *
 * The islands are the phone signature and they earn it there — a thumb reaches
 * the bottom of the screen and a glyph is all that fits. A mouse has the
 * opposite constraints: 232px of permanent left margin costs nothing on a
 * window this wide, and a pointer user should not have to learn five glyphs or
 * hover a plate to find out what the screen's one action is. So everything the
 * islands compress is spelled out here — the destination names, the shortcut
 * digits, the shelf you are standing in front of, and the contextual action as
 * a labelled button rather than an unexplained icon.
 *
 * It reads the same two sources the islands do (NAV_DESTINATIONS, useNavAction)
 * so the two can never disagree about what the current screen's action is.
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { shelves } = useCellar();
  const { shelf } = useCurrentShelf(shelves);
  const openShelfPicker = useCellarSheets((state) => state.shelfPicker);

  const activeTab = activeTabFor(pathname);
  const action = useNavAction(pathname, activeTab);
  const unfiled = useUnfiledCount();

  return (
    <View
      className="absolute bottom-0 left-0 top-0 border-r border-border/60 bg-background"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <ScrollView contentContainerStyle={{ paddingVertical: 22 }} showsVerticalScrollIndicator={false}>
        <View className="px-4">
          <Text className="text-xl font-bold tracking-tight text-foreground">cellar</Text>
        </View>

        {/* The shelf switcher is a permanent row here rather than a heading you
            have to know is pressable, because on desktop it is also the answer
            to "which shelf am I filing into" from every screen. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="switch shelf"
          onPress={() => openShelfPicker?.()}
          className="mx-3 mt-4 flex-row items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 active:opacity-80"
        >
          <View className="min-w-0 flex-1">
            <Overline>shelf</Overline>
            <Text className="mt-0.5 text-sm font-semibold text-foreground" numberOfLines={1}>
              {shelf?.name ?? 'every shelf'}
            </Text>
          </View>
          <ChevronDown size={14} color={COLORS.muted} strokeWidth={2.4} />
        </Pressable>

        <View className="mt-5 gap-0.5 px-2">
          {NAV_DESTINATIONS.map((destination, index) => (
            <SidebarRow
              key={destination.tabName}
              destination={destination}
              active={destination.tabName === activeTab}
              badge={destination.tabName === 'inbox' ? unfiled : 0}
              shortcut={String(index + 1)}
              onPress={() => router.navigate(destination.href)}
            />
          ))}
        </View>

        {/* The left island's action, with its name on it. */}
        <View className="mt-6 px-3">
          <Overline>on this screen</Overline>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            className={[
              'mt-2 flex-row items-center gap-2.5 rounded-lg px-3 py-2.5 active:opacity-80',
              action.active ? 'bg-primary/15' : 'bg-secondary',
            ].join(' ')}
          >
            <action.Icon size={16} color={action.active ? COLORS.accent : COLORS.foreground} strokeWidth={2.2} />
            <Text
              className={['min-w-0 flex-1 text-xs font-semibold', action.active ? 'text-primary' : 'text-foreground'].join(' ')}
              numberOfLines={2}
            >
              {action.label}
            </Text>
            {action.badge > 0 && <Badge count={action.badge} />}
          </Pressable>
        </View>
      </ScrollView>

      {/* Two Pressables side by side, never one inside the other: on web a
          Pressable is a <button>, and a button inside a button is invalid DOM
          that React refuses to render. */}
      <View className="flex-row items-center gap-1 border-t border-border/60 px-3 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="profile"
          onPress={() => router.navigate('/profile')}
          className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-lg px-1 py-1.5 active:opacity-80"
        >
          <Avatar profile={profile} size={30} />
          <Text className="min-w-0 flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
            {profile?.displayName || profile?.username || 'you'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="settings"
          hitSlop={8}
          onPress={() => router.navigate('/settings')}
          className="rounded-full p-1.5 active:opacity-70"
        >
          <Settings size={15} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

/** One destination: glyph, name, count, and the key that gets you there. */
function SidebarRow({
  destination,
  active,
  badge,
  shortcut,
  onPress,
}: {
  destination: NavDestination;
  active: boolean;
  badge: number;
  shortcut: string;
  onPress: () => void;
}) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={destination.label}
      onPress={onPress}
      {...bind}
      style={[
        webTransition('background-color'),
        active ? { backgroundColor: COLORS.islandPlate } : hovered ? { backgroundColor: COLORS.chipGround } : null,
      ]}
      className="flex-row items-center gap-2.5 rounded-lg px-3 py-2.5"
    >
      {destination.icon(active ? COLORS.foreground : COLORS.muted, 17)}
      <Text
        className={['min-w-0 flex-1 text-sm', active ? 'font-semibold text-foreground' : 'text-muted-foreground'].join(' ')}
        numberOfLines={1}
      >
        {destination.label}
      </Text>
      {badge > 0 && <Badge count={badge} />}
      {/* The shortcut prints itself, so the keyboard is discoverable instead of
          being a thing you had to read the release notes to know about. */}
      <Text className="text-[10px] font-semibold text-muted-foreground opacity-60">{shortcut}</Text>
    </Pressable>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <View className="min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-px">
      <Text className="text-[10px] font-bold" style={{ color: COLORS.accentInk }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
