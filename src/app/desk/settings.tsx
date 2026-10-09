import { ScrollView, Text, View } from 'react-native';

import { DeskDefaultsBlock } from '@/components/desk/DeskDefaultsBlock';
import { DeskDevicesBlock } from '@/components/desk/DeskDevicesBlock';
import { DeskHostsBlock } from '@/components/desk/DeskHostsBlock';
import { DeskKeysBlock } from '@/components/desk/DeskKeysBlock';
import { DeskPingsBlock } from '@/components/desk/DeskPingsBlock';
import { DeskRecipesBlock } from '@/components/desk/DeskRecipesBlock';
import { DeskSection } from '@/components/desk/DeskSection';
import { DeskUsageBlock } from '@/components/desk/DeskUsageBlock';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useDeskSettings } from '@/features/desk/useDeskSettings';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';

/**
 * Settings › desk (docs/desk/screens.md, `DeskUsage`, `DeskRecipes`,
 * `DeskHosts`): agents, keys, devices and pairing, notifications, usage and
 * accounts, recipes and rules, hosts — in the order you would reach for them.
 */
export default function DeskSettingsScreen() {
  const desk = useDeskSettings();
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: navBarSpace + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`flex-row items-center gap-3 pt-4 ${gutter}`}>
            <ScreenAction />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-2xl font-bold tracking-tight text-foreground">desk settings</Text>
              <Text className="text-xs text-muted-foreground">what an agent starts with, and where it all runs</Text>
            </View>
          </View>

          <DeskSection title="agents" gutter={gutter}>
            <DeskDefaultsBlock {...desk.defaults} />
          </DeskSection>
          <DeskSection title="devices and pairing" gutter={gutter}>
            <DeskDevicesBlock {...desk.devices} />
          </DeskSection>
          <DeskSection title="keys" gutter={gutter}>
            <DeskKeysBlock />
          </DeskSection>
          <DeskSection title="where pings go" gutter={gutter}>
            <DeskPingsBlock />
          </DeskSection>
          <DeskSection title="usage and accounts" gutter={gutter}>
            <DeskUsageBlock agents={desk.usage} />
          </DeskSection>
          <DeskSection title="recipes and rules" gutter={gutter}>
            <DeskRecipesBlock {...desk.recipes} />
          </DeskSection>
          <DeskSection title="hosts" gutter={gutter}>
            <DeskHostsBlock {...desk.host} />
          </DeskSection>
        </ContentShell>
      </ScrollView>
      <AppChrome />
    </View>
  );
}
