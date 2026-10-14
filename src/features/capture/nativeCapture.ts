import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
type NativeCapture = {
  getSharedText: () => string | null;
  clearSharedText: () => void;
  addListener: (event: 'onSharedText', cb: (event: { text: string }) => void) => { remove: () => void };
  recordCrash: (stack: string) => void;
  getCrashes: () => string;
  dismissCrash: (signature: string) => void;
  setCaptureOwner: (owner: string | null) => void;
};
export const nativeCapture = Platform.OS === 'android' ? requireOptionalNativeModule<NativeCapture>('CellarCapture') : null;
if (__DEV__ && nativeCapture) {
  const errors = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (error: Error, fatal?: boolean) => void; setGlobalHandler: (handler: (error: Error, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (errors) { const previous = errors.getGlobalHandler(); errors.setGlobalHandler((error, fatal) => { try { if (fatal) nativeCapture.recordCrash(error.stack ?? error.message); } finally { previous(error, fatal); } }); }
}
