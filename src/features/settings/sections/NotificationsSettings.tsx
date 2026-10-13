import { DeskPingsBlock } from '@/components/desk/DeskPingsBlock';
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
        <DeskPingsBlock onPreview={desk.onNotify} />
      </SettingsGroup>
    </SettingsPage>
  );
}
