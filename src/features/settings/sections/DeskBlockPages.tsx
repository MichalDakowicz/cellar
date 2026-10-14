import { DeskHostsBlock } from '@/components/desk/DeskHostsBlock';
import { DeskKeysBlock } from '@/components/desk/DeskKeysBlock';
import { DeskRecipesBlock } from '@/components/desk/DeskRecipesBlock';
import { useDeskSettings } from '@/features/desk/useDeskSettings';
import { CommandSettings } from '@/features/desk/CommandSettings';
import { RecipeEditor } from '@/features/desk/RecipeEditor';

import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/**
 * The desk's one-block settings pages (`DeskHosts`, `DeskRecipes`, `Keys`): each
 * a title, its line, and the block the board draws.
 */
export function HostsSettings() {
  const desk = useDeskSettings();
  return (
    <SettingsPage title="hosts" sub="the remote pc your controller talks to">
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
        {desk.devices.sample ? <DeskRecipesBlock {...desk.recipes} /> : <RecipeEditor />}
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
      <SettingsGroup title="project commands"><CommandSettings /></SettingsGroup>
    </SettingsPage>
  );
}
