import { DeskHostsBlock } from '@/components/desk/DeskHostsBlock';
import { DeskKeysBlock } from '@/components/desk/DeskKeysBlock';
import { DeskRecipesBlock } from '@/components/desk/DeskRecipesBlock';
import { DeskUsageBlock } from '@/components/desk/DeskUsageBlock';
import { useDeskSettings } from '@/features/desk/useDeskSettings';

import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/**
 * The desk's one-block settings pages (`DeskHosts`, `DeskRecipes`, `DeskUsage`,
 * `Keys`): each a title, its line, and the block the board draws.
 */
export function HostsSettings() {
  const desk = useDeskSettings();
  return (
    <SettingsPage title="hosts" sub="where agents and commands actually run. any machine you can reach over ssh can be one.">
      <SettingsGroup>
        <DeskHostsBlock {...desk.host} />
      </SettingsGroup>
    </SettingsPage>
  );
}

export function RecipesSettings() {
  const desk = useDeskSettings();
  return (
    <SettingsPage title="recipes and rules" sub="what an agent does when you hand it an entry — and what it always has to follow">
      <SettingsGroup title="recipes · one per entry kind">
        <DeskRecipesBlock {...desk.recipes} />
      </SettingsGroup>
    </SettingsPage>
  );
}

export function KeysSettings() {
  return (
    <SettingsPage title="keys" sub="@ files · $ cellar and its commands · / agent skills — # belongs to colours">
      <SettingsGroup title="your own keys">
        <DeskKeysBlock />
      </SettingsGroup>
    </SettingsPage>
  );
}

export function UsageSettings() {
  const desk = useDeskSettings();
  return (
    <SettingsPage title="usage and accounts" sub="per agent — what each plan has left, and which account a run uses">
      <SettingsGroup title="plan limits">
        <DeskUsageBlock agents={desk.usage} />
      </SettingsGroup>
    </SettingsPage>
  );
}
