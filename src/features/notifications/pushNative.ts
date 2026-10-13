import { NativeModules, Platform } from 'react-native';

type PushBridge = { configure: (endpoint: string, device: string, secret: string, owner: string) => Promise<void>; clear: () => Promise<void> };
export function pushNative(): PushBridge | null { return Platform.OS === 'android' ? (NativeModules.CellarPush as PushBridge | undefined) ?? null : null; }
