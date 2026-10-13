import { DeskDefaultsBlock } from '@/components/desk/DeskDefaultsBlock';
import { useDeskSettings } from '@/features/desk/useDeskSettings';

import { AgentAccess } from '../AgentAccess';
import { AgentTokens } from '../AgentTokens';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/** Settings › agents (Map › settings): the default agent and mode, and how agents reach your cellar. */
export function AgentsSettings() {
  const desk = useDeskSettings();
  return (
    <SettingsPage title="agents" sub="claude code, codex and the rest — what a new task starts with">
      <SettingsGroup title="default agent and mode">
        <DeskDefaultsBlock {...desk.defaults} />
      </SettingsGroup>
      <AgentAccess gutter="" />
      <AgentTokens gutter="" />
    </SettingsPage>
  );
}
