/**
 * Settings, in sections (docs/desk/canvas `DeskUsage`/`DeskRecipes`/`DeskHosts`,
 * Map › settings): on the desktop a column of these beside the page, on the
 * phone a list that opens each one. Cellar's own preferences are spread by
 * topic — dump habits under dump, display under account, nudges under
 * notifications — so the desk sections keep the canvas's order.
 *
 * Pure, so the route, the desktop sub-nav and the phone list agree.
 */

export type SettingsSectionId =
  | 'dump'
  | 'agents'
  | 'hosts'
  | 'recipes'
  | 'keys'
  | 'devices'
  | 'notifications'
  | 'night'
  | 'usage'
  | 'account';

export type SettingsSection = { id: SettingsSectionId; label: string; sub: string };

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'dump', label: 'dump', sub: 'raw by default, the last project, the default kind, how a project opens' },
  { id: 'agents', label: 'agents', sub: 'claude code, codex; the default agent and mode; tokens and skills' },
  { id: 'hosts', label: 'hosts', sub: 'where agents and commands actually run' },
  { id: 'recipes', label: 'recipes and rules', sub: 'what an agent does with each kind, and what it must follow' },
  { id: 'keys', label: 'keys', sub: '@ files · $ cellar and its commands · / agent skills, and your own' },
  { id: 'devices', label: 'devices and pairing', sub: 'your pc, this phone, other devices, the sample desk' },
  { id: 'notifications', label: 'notifications', sub: 'what pings you, where, and nudges' },
  { id: 'night', label: 'night shift', sub: 'a window for tonight’s queue, and the morning digest' },
  { id: 'usage', label: 'usage and accounts', sub: 'each agent’s 5-hour and weekly use, and its accounts' },
  { id: 'account', label: 'account', sub: 'your ping account, display, theme, sign out' },
];

export function settingsSection(id: string | undefined | null): SettingsSection | null {
  return SETTINGS_SECTIONS.find((section) => section.id === id) ?? null;
}

export function settingsHref(id: SettingsSectionId): string {
  return `/settings/${id}`;
}
