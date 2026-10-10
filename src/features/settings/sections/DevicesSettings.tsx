import { DeskDevicesBlock } from '@/components/desk/DeskDevicesBlock';
import { SwitchRow } from '@/components/ui/controls';
import { QrLoginControl } from '@/features/auth/qr/QrLoginControl';
import { useDeskSettings } from '@/features/desk/useDeskSettings';
import { useCellarSettings } from '@/hooks/useCellarSettings';

import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/** Settings › devices and pairing (Map › settings): your pc, this phone, other devices. */
export function DevicesSettings() {
  const desk = useDeskSettings();
  const { settings, updateSettings } = useCellarSettings();
  return (
    <SettingsPage title="devices and pairing" sub="your pc and its phones, other devices signed in, and the sample desk">
      <SettingsGroup title={desk.devices.here ? 'this pc' : 'your pc'}>
        <DeskDevicesBlock {...desk.devices} />
      </SettingsGroup>
      <SettingsGroup title="this phone">
        <SwitchRow
          label="let agents test on my phone"
          sub="an agent may install the app over adb, open it and drive it to check its work, without asking"
          value={settings.agentDevice}
          onChange={(value) => void updateSettings({ agentDevice: value })}
        />
      </SettingsGroup>
      <SettingsGroup title="other devices">
        <QrLoginControl />
      </SettingsGroup>
    </SettingsPage>
  );
}
