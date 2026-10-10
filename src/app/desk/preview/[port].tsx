import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { PreviewChecks } from '@/components/desk/PreviewChecks';
import { PreviewDeployBar } from '@/components/desk/PreviewDeployBar';
import { PreviewFrame } from '@/components/desk/PreviewFrame';
import { PreviewSizeBar } from '@/components/desk/PreviewSizeBar';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useDeskPreview } from '@/features/desk/useDeskPreview';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';

/**
 * Preview before deploy (docs/desk/screens.md, `Preview.dc.html`): a page the
 * pc serves, at phone, tablet or desktop size, its checks, and in thumb reach
 * "tell the agent" and deploy.
 */
export default function PreviewScreen() {
  const { port } = useLocalSearchParams<{ port: string }>();
  const preview = useDeskPreview(port ?? '');
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`gap-3.5 pt-2 ${gutter}`}>
            <View className="flex-row items-start gap-3">
              <ScreenAction />
              <View className="min-w-0 flex-1 gap-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-sans min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                    {preview.branch ? <Text className="font-mono">{preview.branch}</Text> : null}
                    {preview.branch ? ' · ' : ''}
                    {preview.meta}
                  </Text>
                </View>
                <Text className="font-sans text-xl font-bold leading-tight text-foreground">{preview.title}</Text>
              </View>
            </View>

            <PreviewSizeBar
              size={preview.size}
              onSize={preview.onSize}
              onReload={preview.sample ? null : preview.reload}
            />
            <PreviewFrame
              sample={preview.sample}
              address={preview.address}
              load={preview.load}
              size={preview.size}
              url={preview.url}
              unreachable={preview.unreachable}
              page={{ reloads: preview.reloads, ...preview.page }}
            />
            <PreviewChecks host={preview.host} checks={preview.checks} empty={preview.checksEmpty} />
          </View>
        </ContentShell>
      </ScrollView>

      <View
        className="border-t border-border/50 bg-background"
        style={{ marginLeft: sidebar, paddingBottom: navBarSpace }}
      >
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`pt-3 ${gutter}`}>
            <PreviewDeployBar deploy={preview.deploy} onDeploy={preview.onDeploy} onTellAgent={preview.tellAgent} />
          </View>
        </ContentShell>
      </View>

      <AppChrome />
    </View>
  );
}
