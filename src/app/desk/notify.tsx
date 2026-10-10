import { ScrollView, Text, View } from 'react-native';

import { NotePreview } from '@/components/desk/NotePreview';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useDeskNotify } from '@/features/desk/useDeskNotify';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * Notification previews (docs/desk/screens.md, `PhoneNotify.dc.html`): one per
 * run, approvals with up to three buttons, questions with two options and
 * more — drawn here as the shade itself until the real ones arrive
 * (docs/desk/TASKS.md W13).
 */
export default function NotifyPreviews() {
  const notify = useDeskNotify();
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.shade }}>
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: navBarSpace + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.form}>
          <View className={`gap-3 pt-4 ${gutter}`}>
            <ScreenAction />
            {notify.empty && <Text className="pt-2 text-xs text-muted-foreground">{notify.empty}</Text>}
            {notify.notes.map(({ note, done }) => (
              <NotePreview
                key={note.id}
                note={note}
                done={done}
                onAction={(actionId, label) => notify.onAction(note, actionId, label)}
              />
            ))}
          </View>
        </ContentShell>
      </ScrollView>
      <AppChrome />
    </View>
  );
}
