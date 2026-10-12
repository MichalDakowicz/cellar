import { create } from "zustand";
import { desktopPreferenceStorage, updateStoredState } from "@/lib/deskStorage";

const storage = desktopPreferenceStorage(localStorage);
function read(name: string): Record<string, unknown> {
  const raw = storage.getItem(name);
  if (!raw) return {};
  const envelope = JSON.parse(raw);
  if (!envelope?.state || typeof envelope.state !== "object")
    throw new Error("Saved preferences are unreadable. Nothing overwritten.");
  return envelope.state;
}
export const useSaved = create<{ revision: number; changed: () => void }>(
  (set) => ({
    revision: 0,
    changed: () => set((state) => ({ revision: state.revision + 1 })),
  }),
);
export function saved<T>(name: string, field: string, fallback: T): T {
  return (read(name)[field] as T | undefined) ?? fallback;
}
export function save(name: string, field: string, value: unknown) {
  updateStoredState(storage, name, field, value);
  useSaved.getState().changed();
}
export function saveRecord<T>(
  name: string,
  field: string,
  key: string,
  value: T | null,
) {
  const record = { ...saved<Record<string, T>>(name, field, {}) };
  if (value === null) delete record[key];
  else record[key] = value;
  save(name, field, record);
}
