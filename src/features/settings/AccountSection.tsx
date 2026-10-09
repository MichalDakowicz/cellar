import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCellar } from '@/features/cellar/useCellar';
import { Avatar } from '@/features/friends/Avatar';
import { useProfile } from '@/hooks/useProfile';
import { countLive } from '@/lib/entryGroups';
import { countToday } from '@/lib/relTime';
import { plural } from '@/lib/utils';

/**
 * You, and the size of your cellar — what the profile tab was, before the desk
 * took its place in the bar (docs/desk/structure.md, "account").
 *
 * It still says the account is the shared one, because someone who already has
 * a Ping account must not go and make a second.
 */
export function AccountSection({ gutter }: { gutter: string }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { shelves, projects, entries } = useCellar();

  const figures = [
    { label: 'entries', value: entries.length },
    { label: 'open', value: countLive(entries) },
    { label: 'projects', value: projects.length },
    { label: 'shelves', value: shelves.length },
  ];

  return (
    <View className={`pt-6 ${gutter}`}>
      <View className="flex-row items-center gap-3">
        <Avatar profile={profile} size={48} />
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-bold tracking-tight text-foreground" numberOfLines={1}>
            {profile?.displayName || profile?.username || 'you'}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            one ping account · radar · lidar · sonar · pulsar · cellar
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row flex-wrap gap-y-4">
        {figures.map((figure) => (
          <View key={figure.label} className="w-1/4">
            <Overline>{figure.label}</Overline>
            <Text className="mt-1 text-xl font-bold tracking-tight text-foreground">{figure.value}</Text>
          </View>
        ))}
      </View>

      <Text className="mt-4 text-xs text-muted-foreground">
        {plural(countToday(entries.map((entry) => entry.createdAt)), 'thought')} in the last day. nothing here is
        ever deleted to clear it — archived entries stay in search and come back in one tap.
      </Text>
    </View>
  );
}
