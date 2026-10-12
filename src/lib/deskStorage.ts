export interface KeyStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** The previous RN MMKV web adapter used this exact prefix at cellar-desk://app. */
export function desktopPreferenceStorage(storage: KeyStorage, namespace = 'cellar') {
  return {
    getItem: (key: string) => storage.getItem(`${namespace}\\${key}`),
    setItem: (key: string, value: string) => storage.setItem(`${namespace}\\${key}`, value),
  };
}

/** W6–W9 desktop history included the bridge transport in its key. */
export function desktopStreamKey(ownerId: string, hostId: string): string {
  return `${ownerId}:${hostId}:bridge:`;
}

/** Update one persisted field without discarding legacy/unknown state or its version. */
export function updateStoredState(storage: KeyStorage, name: string, field: string, value: unknown) {
  const raw = storage.getItem(name);
  const envelope = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  if (!envelope || typeof envelope.state !== 'object' || !envelope.state) throw new Error('Saved preferences are unreadable. Nothing overwritten.');
  const next = { ...envelope, state: { ...envelope.state, [field]: value } };
  storage.setItem(name, JSON.stringify(next));
  return next.state;
}
