import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Crypto from 'expo-crypto';
import { createMMKV } from 'react-native-mmkv';
import { supabase } from '@/lib/supabase';
import { ensureNotificationChannels } from '@/lib/notificationChannels';
import { usePushStatus } from '@/store/pushStatus';
import { pushNative } from './pushNative';

const storage = Platform.OS === 'android' ? createMMKV({ id: 'cellar-push-device' }) : null;
export function pushDeviceId(): string {
  let id = storage?.getString('id');
  if (!id) { id = Crypto.randomUUID(); storage?.set('id', id); } return id;
}
let serial: Promise<unknown> = Promise.resolve();
function queue(work: () => Promise<unknown>) { serial = serial.catch(() => {}).then(work); return serial; }
async function categories() {
  const action = (identifier: string, buttonTitle: string) => ({ identifier, buttonTitle, options: { opensAppToForeground: true } });
  await Promise.all([
    Notifications.setNotificationCategoryAsync('cellar-approval-full', [action('deny', 'Deny'), action('always', 'Allow for run'), action('allow', 'Allow')]),
    Notifications.setNotificationCategoryAsync('cellar-approval', [action('deny', 'Deny'), action('allow', 'Allow')]),
    Notifications.setNotificationCategoryAsync('cellar-question-two-more', [action('option:0', 'A'), action('option:1', 'B'), action('more', 'More…')]),
    Notifications.setNotificationCategoryAsync('cellar-question-two', [action('option:0', 'A'), action('option:1', 'B')]),
    Notifications.setNotificationCategoryAsync('cellar-question-one', [action('option:0', 'A')]),
    Notifications.setNotificationCategoryAsync('cellar-open', [action('open', 'Open')]),
  ]);
}
export function usePushRegistration(owner: string | null, wanted: boolean) {
  useEffect(() => {
    const native = pushNative(); if (!native) return;
    let active = true;
    const register = () => void queue(async () => {
      if (!active || !owner) return;
      try {
        const granted = (await Notifications.getPermissionsAsync()).granted;
        if (!granted) { usePushStatus.getState().set('off', 'Allow notifications in Android settings.'); return; }
        usePushStatus.getState().set('registering');
        const legacy = createMMKV({ id: 'cellar-notices' });
        const oldIds = JSON.parse(legacy.getString('shownQuestions') ?? '[]');
        if (Array.isArray(oldIds)) await Promise.all(oldIds.filter((id): id is string => typeof id === 'string').map((id) => Notifications.dismissNotificationAsync(id)));
        await ensureNotificationChannels(); await categories();
        const token = await Notifications.getDevicePushTokenAsync();
        const result = await supabase.functions.invoke('desk-push', { body: { kind: 'register', deviceId: pushDeviceId(), token: String(token.data), utcOffset: -new Date().getTimezoneOffset() } });
        if (result.error) throw result.error;
        if (!active) return;
        if (typeof result.data?.secret !== 'string' || typeof result.data.endpoint !== 'string') throw new Error('Push registration was not confirmed.');
        await native.configure(result.data.endpoint, pushDeviceId(), result.data.secret, owner);
        if (active) usePushStatus.getState().set('ready');
      } catch (e) { if (active) usePushStatus.getState().set('failed', e instanceof Error ? e.message : String(e)); }
    });
    register();
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') register(); });
    const tokens = Notifications.addPushTokenListener(register);
    return () => { active = false; app.remove(); tokens.remove(); void queue(async () => { await native.clear(); usePushStatus.getState().set('off'); }); };
  }, [owner, wanted]);
}
