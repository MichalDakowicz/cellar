import { SETTINGS_SECTIONS, settingsHref, settingsSection } from './settingsSections';

describe('settings sections', () => {
  it('keeps the canvas order for the desk sections, after dump', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([
      'dump',
      'agents',
      'hosts',
      'recipes',
      'keys',
      'devices',
      'notifications',
      'night',
      'usage',
      'account',
    ]);
  });

  it('finds a section by id, and nothing for anything else', () => {
    expect(settingsSection('keys')?.label).toBe('keys');
    expect(settingsSection('nope')).toBeNull();
    expect(settingsSection(undefined)).toBeNull();
  });

  it('links each section under /settings', () => {
    expect(settingsHref('night')).toBe('/settings/night');
  });
});
