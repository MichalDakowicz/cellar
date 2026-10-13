import { desktopPreferenceStorage, desktopStreamKey, updateStoredState } from './deskStorage';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('adapter matches the installed MMKV web separator rather than an assumed fixture', () => {
  const source = readFileSync(join(process.cwd(), 'node_modules/react-native-mmkv/src/web/getLocalStorage.ts'), 'utf8');
  const literal = source.match(/LOCAL_STORAGE_KEY_WILDCARD = '([^']+)'/)![1];
  const separator = JSON.parse(`"${literal}"`);
  expect(separator.length).toBe(1);
  const setItem = jest.fn();
  desktopPreferenceStorage({ getItem: () => null, setItem }).setItem('desk-approvals', 'saved');
  expect(setItem).toHaveBeenCalledWith(`cellar${separator}desk-approvals`, 'saved');
});

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
  expect(() => updateStoredState({ getItem: () => '{"state":[]}', setItem }, 'prefs', 'drafts', {})).toThrow();
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
