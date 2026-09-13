import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline } from '@/components/ui/controls';
import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCellar } from '@/features/cellar/useCellar';
import { Avatar } from '@/features/friends/Avatar';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useProfile } from '@/hooks/useProfile';
import { MAX_W, useGutter, useHover, webTransition, useSidebarSpace } from '@/hooks/useResponsive';
import { countLive } from '@/lib/entryGroups';
import { countToday } from '@/lib/relTime';
import { plural } from '@/lib/utils';
import { COLORS } from '@/theme/colors';

/**
 * You, and the size of your cellar.
 *
 * No friends, no feed, no public shelf — Cellar is the one sibling with no
 * social surface, because a half-formed idea about an unreleased app is not a
 * thing you publish (docs/shared-database.md). The account is still the shared
 * one, and this screen says so, because someone who already has a Ping account
 * must not go and make a second.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);
  const { shelves, projects, entries } = useCellar();
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const settingsHover = useHover();

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  const figures = [
    { label: 'entries', value: entries.length },
    { label: 'open', value: countLive(entries) },
    { label: 'projects', value: projects.length },
    { label: 'shelves', value: shelves.length },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={{ marginLeft: sidebar }}
      contentContainerStyle={{ paddingBottom: navBarSpace + 8 }}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className={`flex-row items-center gap-3 ${gutter}`}>
          <Avatar profile={profile} size={56} />
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
              {profile?.displayName || profile?.username || 'you'}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              one ping account · radar · lidar · sonar · pulsar · cellar
            </Text>
          </View>
          <ScreenAction />
        </View>

        <View className={`my-6 flex-row flex-wrap gap-y-6 border-y border-border/50 py-7 ${gutter}`}>
          {figures.map((figure) => (
            <View key={figure.label} className="w-1/2">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {figure.label}
              </Text>
              <Text className="mt-1 text-2xl font-bold tracking-tight text-foreground">{figure.value}</Text>
            </View>
          ))}
        </View>

        <View className={gutter}>
          <Overline>today</Overline>
          <Text className="mt-2 text-sm text-muted-foreground">
            {plural(countToday(entries.map((entry) => entry.createdAt)), 'thought')} in the last day.
            nothing here is ever deleted to clear it — archived entries stay in search and come back in one tap.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="settings"
          onPress={() => router.navigate('/settings')}
          {...settingsHover.bind}
          style={[
            webTransition('background-color'),
            settingsHover.hovered ? { backgroundColor: COLORS.rowHover } : null,
          ]}
          className={`mt-6 flex-row items-center gap-3 py-4 active:opacity-80 ${gutter}`}
        >
          <Text className="flex-1 text-base font-semibold text-foreground">settings</Text>
          <ChevronRight size={18} color={COLORS.muted} />
        </Pressable>
      </ContentShell>
    </ScrollView>
  );
}
