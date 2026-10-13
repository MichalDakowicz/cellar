import { DeskPingsBlock } from '@/components/desk/DeskPingsBlock';
import { PingPreferences } from '@/components/desk/PingPreferences';
import { usePingPreferences } from '@/features/notifications/usePingPreferences';
import { useNoticeReceipts } from '@/features/notifications/useNoticeReceipts';
import { usePushStatus } from '@/store/pushStatus';
import { Pressable, Text } from 'react-native';
import { SwitchRow } from '@/components/ui/controls';
import { useDeskSettings } from '@/features/desk/useDeskSettings';
import { useQuestionNotices } from '@/features/notifications/useQuestionNotices';
import { useCellarSettings } from '@/hooks/useCellarSettings';

import { NudgeSettings } from '../NudgeSettings';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/** Settings › notifications (`DeskHosts.dc.html`, "where pings go"), with the nudges. */
export function NotificationsSettings() {
  const desk = useDeskSettings();
  const notifications = useQuestionNotices();
  const { settings } = useCellarSettings();
  const pings = usePingPreferences();
  const push = usePushStatus();
  const receipts = useNoticeReceipts();
  return (
    <SettingsPage title="notifications" sub="what pings you, and where — one device at a time">
      <SettingsGroup>
        <SwitchRow
          label="tell me when an agent asks"
          sub={notifications.sub}
          value={settings.notifyQuestions && notifications.granted !== false}
          onChange={(value) => void notifications.set(value)}
        />
        <NudgeSettings />
      </SettingsGroup>
      <SettingsGroup title="where pings go">
        <Text className="text-sm text-muted-foreground">{push.state === 'ready' ? 'Background push registered on this phone.' : push.error ?? `Background push: ${push.state}`}</Text>
        <PingPreferences key={JSON.stringify(pings.preferences)} {...pings} onSave={pings.save} />
        {receipts.rows.map((row) => <Text key={row.commandId} className="text-sm text-muted-foreground">{row.commandId.slice(0, 8)} · {row.receipt?.state ?? 'no PC receipt yet'}{row.receipt?.error ? ` · ${row.receipt.error}` : ''}</Text>)}
        {receipts.rows.length > 0 && <Pressable onPress={receipts.check} className="min-h-11 justify-center"><Text className="text-foreground">check original notification receipts</Text></Pressable>}
        {receipts.error && <Text className="text-destructive-foreground">{receipts.error}</Text>}
        <DeskPingsBlock onPreview={desk.onNotify} />
      </SettingsGroup>
    </SettingsPage>
  );
}
