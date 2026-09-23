import { isKind } from '@/lib/kinds';
import type { Kind } from '@/types/cellar';

/**
 * Cellar's own `public.cellar_settings` row — the preferences that belong to
 * the account rather than to the device, so the gutter you turned off on the
 * phone is off in the browser too.
 *
 * Everything device-shaped (which shelf you are in, the current filter, the
 * inbox sort) stays in MMKV instead: those are where you are standing, not who
 * you are.
 *
 * No React import, so the allow-list below is testable without a renderer.
 */

export type ProjectViewPref = 'grouped' | 'stream' | 'kanban';

const PROJECT_VIEWS: ProjectViewPref[] = ['grouped', 'stream', 'kanban'];

function isProjectView(value: unknown): value is ProjectViewPref {
  return PROJECT_VIEWS.includes(value as ProjectViewPref);
}

export type CellarSettings = {
  showCodes: boolean;
  rawDefault: boolean;
  rememberLast: boolean;
  defaultKind: Kind;
  defaultView: ProjectViewPref;
  /** Raise a banner when an agent stops and asks something. */
  notifyQuestions: boolean;
  /**
   * An agent may install the app on your phone over adb, open it and drive it
   * to check its own work, without asking first. Off by default — a phone is
   * the most personal device in the room, and "may I take it over" is a
   * question worth answering once and on purpose (`agentWork.deviceRule`).
   */
  agentDevice: boolean;
};

export type CellarSettingsRow = {
  show_codes: boolean | null;
  raw_default: boolean | null;
  remember_last: boolean | null;
  default_kind: string | null;
  default_view: string | null;
  notify_questions: boolean | null;
  agent_device?: boolean | null;
};

/** The one select the app makes on this row. Kept beside the mapping so a new column is one edit. */
export const CELLAR_SETTINGS_COLUMNS =
  'show_codes, raw_default, remember_last, default_kind, default_view, notify_questions, agent_device';

export const DEFAULT_CELLAR_SETTINGS: CellarSettings = {
  showCodes: true,
  rawDefault: false,
  rememberLast: true,
  defaultKind: 'idea',
  defaultView: 'grouped',
  notifyQuestions: true,
  agentDevice: false,
};

/** A missing row is the defaults, not an error — the row is created on first write. */
export function normalizeCellarSettings(row: CellarSettingsRow | null): CellarSettings {
  if (!row) return DEFAULT_CELLAR_SETTINGS;
  return {
    showCodes: row.show_codes ?? DEFAULT_CELLAR_SETTINGS.showCodes,
    rawDefault: row.raw_default ?? DEFAULT_CELLAR_SETTINGS.rawDefault,
    rememberLast: row.remember_last ?? DEFAULT_CELLAR_SETTINGS.rememberLast,
    defaultKind: isKind(row.default_kind) ? row.default_kind : DEFAULT_CELLAR_SETTINGS.defaultKind,
    defaultView: isProjectView(row.default_view) ? row.default_view : DEFAULT_CELLAR_SETTINGS.defaultView,
    notifyQuestions: row.notify_questions ?? DEFAULT_CELLAR_SETTINGS.notifyQuestions,
    agentDevice: row.agent_device ?? DEFAULT_CELLAR_SETTINGS.agentDevice,
  };
}

/**
 * The update payload, built from an allow-list rather than by spreading the
 * patch. A settings screen that grows a field must not be able to write a
 * column nobody meant it to.
 */
export function cellarSettingsToRow(patch: Partial<CellarSettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.showCodes !== undefined) row.show_codes = patch.showCodes;
  if (patch.rawDefault !== undefined) row.raw_default = patch.rawDefault;
  if (patch.rememberLast !== undefined) row.remember_last = patch.rememberLast;
  if (patch.defaultKind !== undefined && isKind(patch.defaultKind)) row.default_kind = patch.defaultKind;
  if (patch.defaultView !== undefined && isProjectView(patch.defaultView)) row.default_view = patch.defaultView;
  if (patch.notifyQuestions !== undefined) row.notify_questions = patch.notifyQuestions;
  if (patch.agentDevice !== undefined) row.agent_device = patch.agentDevice;
  return row;
}
