import { desktopPreferenceStorage, desktopStreamKey, updateStoredState } from './deskStorage';

test('desktop upgrades preferences in place and never touches auth/phone keys', () => {
  const map = new Map<string, string>([['cellar\\desk-approvals', JSON.stringify({ version: 3,
    state: { drafts: { 'owner:host:run': 'keep draft' }, pending: { id: 'original UUID' }, extra: [1] } })], ['sb-auth-token', 'unchanged']]);
  const store = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const adapter = desktopPreferenceStorage(store);
  updateStoredState(adapter, 'desk-approvals', 'drafts', { 'owner:host:run': 'edited' });
  expect(JSON.parse(map.get('cellar\\desk-approvals')!)).toEqual({ version: 3,
    state: { drafts: { 'owner:host:run': 'edited' }, pending: { id: 'original UUID' }, extra: [1] } });
  expect(map.get('sb-auth-token')).toBe('unchanged'); expect(map.size).toBe(2);
});
test('malformed legacy data fails closed without overwriting', () => {
  const setItem = jest.fn();
  expect(() => updateStoredState({ getItem: () => '{bad', setItem }, 'prefs', 'drafts', {})).toThrow();
  expect(setItem).not.toHaveBeenCalled();
});

test('legacy cursor and saved run history resolve without copying storage', () => {
  const key = desktopStreamKey('owner', 'host');
  const history = { cursors: { 'owner:host:bridge:': { epoch: 'old', sequence: 42 } }, snapshots: { 'owner:host:bridge::run': { at: 7 } } };
  expect(history.cursors[key as keyof typeof history.cursors]).toEqual({ epoch: 'old', sequence: 42 });
  expect(history.snapshots[`${key}:run` as keyof typeof history.snapshots]).toEqual({ at: 7 });
  expect(desktopStreamKey('other-owner', 'host')).not.toBe(key);
});

test('raw theme cache retains its separate MMKV namespace', () => {
  const map = new Map([['cellar-theme\\theme_preference', 'system']]);
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  expect(desktopPreferenceStorage(storage, 'cellar-theme').getItem('theme_preference')).toBe('system');
});
