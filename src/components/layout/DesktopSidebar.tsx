import { usePathname, useRouter, type Href } from 'expo-router';
import { ChevronDown, Eye, LayoutDashboard, MessageSquare, Search, Settings, Smartphone, SquareTerminal } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LiveCue } from '@/components/layout/LiveCue';
import { activeTabFor, NAV_DESTINATIONS } from '@/components/layout/navDestinations';
import { Overline } from '@/components/ui/controls';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCellar, useCurrentShelf } from '@/features/cellar/useCellar';
import { useUnfiledCount } from '@/features/cellar/useUnfiledCount';
import { useDeskWaiting } from '@/features/desk/useDeskWaiting';
import { Avatar } from '@/features/friends/Avatar';
import { useProfile } from '@/hooks/useProfile';
import { SIDEBAR_WIDTH, useHover, webTransition } from '@/hooks/useResponsive';
import { deskLinkFor, CONTROLLER_DESK_LINKS as DESK_LINKS, pinnedProjects, type DeskLink } from '@/lib/sidebar';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/** Cellar's four; the desk plate is the desk group's home. */
const CELLAR = NAV_DESTINATIONS.filter((destination) => destination.tabName !== 'desk');

const DESK_ICONS: Record<DeskLink['id'], (color: string, size: number) => ReactNode> = {
  home: (color, size) => <LayoutDashboard color={color} size={size} />,
  chat: (color, size) => <MessageSquare color={color} size={size} />,
  commands: (color, size) => <SquareTerminal color={color} size={size} />,
  previews: (color, size) => <Eye color={color} size={size} />,
  phone: (color, size) => <Smartphone color={color} size={size} />,
};

/**
 * The desktop shell's navigation: the nav islands, unpacked.
 *
 * The islands are the phone signature and they earn it there — a thumb reaches
 * the bottom of the screen and a glyph is all that fits. A mouse has the
 * opposite constraints: 232px of permanent left margin costs nothing on a
 * window this wide, and a pointer user should not have to learn five glyphs or
 * hover a plate to find out where a glyph goes. So what the islands compress is
 * spelled out here — the destination names, their shortcut digits, and the
 * shelf you are standing in front of.
 *
 * It carries navigation and nothing else. The screen's contextual action is
 * *not* here: on a window this wide the sidebar is a screen's width away from
 * the content it would act on, so that button lives on the page itself
 * (components/layout/ScreenAction) where the thing it acts on is.
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { shelves, projects, entries } = useCellar();
  const { shelf } = useCurrentShelf(shelves);
  const openShelfPicker = useCellarSheets((state) => state.shelfPicker);

  const activeTab = activeTabFor(pathname);
  const unfiled = useUnfiledCount();
  const waiting = useDeskWaiting();
  const deskLink = deskLinkFor(pathname);
  const pinned = useMemo(() => pinnedProjects(projects, entries, shelf?.id ?? null), [projects, entries, shelf?.id]);

  return (
    <View
      className="absolute bottom-0 left-0 top-0 border-r border-border/60 bg-background"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <ScrollView contentContainerStyle={{ paddingVertical: 22 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <Text className="font-sans text-lg font-bold tracking-tight text-foreground">cellar</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="jump to anything" onPress={() => router.push('/search')} className="mx-3 mt-3.5 h-9 flex-row items-center gap-2 rounded-lg bg-secondary px-2.5"><Search size={16} color={COLORS.muted} /><Text className="font-sans flex-1 text-sm text-muted-foreground">jump to anything</Text><Text className="rounded border border-border px-1.5 font-mono text-[11px] text-muted-foreground">ctrl k</Text></Pressable>

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
            <Text className="font-sans mt-0.5 text-sm font-semibold text-foreground" numberOfLines={1}>
              {shelf?.name ?? 'every shelf'}
            </Text>
          </View>
          <ChevronDown size={14} color={COLORS.muted} strokeWidth={2.4} />
        </Pressable>

        {/* Cellar's four, then the desk (Map › sections): home is the desk
            tab, and the rest are the desk's own places. */}
        <SidebarGroup title="cellar">
          {CELLAR.map((destination, index) => (
            <SidebarRow
              key={destination.tabName}
              icon={destination.icon}
              label={destination.label}
              active={destination.tabName === activeTab}
              badge={destination.tabName === 'inbox' ? unfiled : 0}
              shortcut={String(index + 1)}
              onPress={() => router.navigate(destination.href)}
            />
          ))}
        </SidebarGroup>

        <SidebarGroup title="desk">
          {DESK_LINKS.map((link, index) => (
            <SidebarRow
              key={link.id}
              icon={DESK_ICONS[link.id]}
              label={link.label}
              active={deskLink === link.id}
              badge={link.id === 'chat' ? waiting : 0}
              shortcut={index === 0 ? String(CELLAR.length + 1) : null}
              onPress={() => router.navigate(link.href as Href)}
            />
          ))}
        </SidebarGroup>

        {pinned.length > 0 && (
          <SidebarGroup title="pinned">
            {pinned.map((project) => (
              <SidebarRow
                key={project.id}
                icon={(color) => <Text className="font-sans w-[17px] text-center text-xs font-bold" style={{ color }}>{project.name.slice(0, 1)}</Text>}
                label={project.name}
                active={pathname === `/project/${project.id}`}
                badge={0}
                count={project.open}
                shortcut={null}
                onPress={() => router.navigate(`/project/${project.id}` as Href)}
              />
            ))}
          </SidebarGroup>
        )}

      </ScrollView>

      {/* Sits above the footer rather than beside the destinations: it is a
          statement about the whole window, not about a route. */}
      <View className="items-start px-3">
        <LiveCue />
      </View>

      {/* Two Pressables side by side, never one inside the other: on web a
          Pressable is a <button>, and a button inside a button is invalid DOM
          that React refuses to render. */}
      <View className="flex-row items-center gap-1 border-t border-border/60 px-3 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="your account and settings"
          onPress={() => router.navigate('/settings')}
          className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-lg px-1 py-1.5 active:opacity-80"
        >
          <Avatar profile={profile} size={30} />
          <Text className="font-sans min-w-0 flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
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

function SidebarGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-5 gap-0.5 px-2">
      <Overline className="px-3 pb-1">{title}</Overline>
      {children}
    </View>
  );
}

/** One destination: glyph, name, count, and the key that gets you there. */
function SidebarRow({
  icon,
  label,
  active,
  badge,
  count,
  shortcut,
  onPress,
}: {
  icon: (color: string, size: number) => ReactNode;
  label: string;
  active: boolean;
  badge: number;
  /** A quiet count, for a pinned project's open thoughts. */
  count?: number;
  shortcut: string | null;
  onPress: () => void;
}) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      {...bind}
      style={[
        webTransition('background-color'),
        active ? { backgroundColor: COLORS.islandPlate } : hovered ? { backgroundColor: COLORS.chipGround } : null,
      ]}
      className="h-9 flex-row items-center gap-2.5 rounded-full px-3"
    >
      {icon(active ? COLORS.foreground : COLORS.muted, 17)}
      <Text
        className={['min-w-0 flex-1 text-sm', active ? 'font-semibold text-foreground' : 'text-muted-foreground'].join(' ')}
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge > 0 && <Badge count={badge} />}
      {!!count && <Text className="font-sans text-xs text-muted-foreground">{count}</Text>}
      {/* The shortcut prints itself, so the keyboard is discoverable instead of
          being a thing you had to read the release notes to know about. */}
      {shortcut && <Text className="font-sans text-[10px] font-semibold text-muted-foreground opacity-60">{shortcut}</Text>}
    </Pressable>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <View className="min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-px">
      <Text className="font-sans text-[10px] font-bold" style={{ color: COLORS.accentInk }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
