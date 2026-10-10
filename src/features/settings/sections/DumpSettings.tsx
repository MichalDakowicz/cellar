import { Text } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { Segmented, SwitchRow } from '@/components/ui/controls';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import type { ProjectViewPref } from '@/lib/cellarSettings';
import { useCellarPrefs } from '@/store/cellarPrefs';

import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/** Settings › dump: how a thought is caught and where it lands. */
export function DumpSettings() {
  const { settings, updateSettings } = useCellarSettings();
  const setRaw = useCellarPrefs((state) => state.setRaw);
  const setDraftKind = useCellarPrefs((state) => state.setDraftKind);
  const setView = useCellarPrefs((state) => state.setView);

  return (
    <SettingsPage title="dump" sub="how a thought is caught, and where it lands">
      <SettingsGroup>
        <SwitchRow
          label="raw dump by default"
          sub="open the capture screen in many-lines mode"
          value={settings.rawDefault}
          onChange={(value) => {
            setRaw(value);
            void updateSettings({ rawDefault: value });
          }}
        />
        <SwitchRow
          label="remember the last project"
          sub="the project chip you picked stays picked for the next drop"
          value={settings.rememberLast}
          onChange={(value) => void updateSettings({ rememberLast: value })}
        />
      </SettingsGroup>
      <SettingsGroup title="default kind">
        <ChipWrap
          label="default kind"
          options={kindChips(settings.defaultKind, settings.kindOrder)}
          selected={settings.defaultKind}
          onToggle={(kind) => {
            setDraftKind(kind);
            void updateSettings({ defaultKind: kind });
          }}
        />
        <Text className="text-xs text-muted-foreground">what a fresh draft starts as.</Text>
      </SettingsGroup>
      <SettingsGroup title="how a project opens">
        <Segmented<ProjectViewPref>
          label="how a project opens"
          value={settings.defaultView}
          onChange={(value) => {
            setView(value);
            void updateSettings({ defaultView: value });
          }}
          options={[
            { value: 'grouped', label: 'by kind' },
            { value: 'stream', label: 'one stream' },
            { value: 'kanban', label: 'a board' },
          ]}
        />
      </SettingsGroup>
    </SettingsPage>
  );
}
