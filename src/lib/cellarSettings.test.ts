import {
  cellarSettingsToRow,
  DEFAULT_CELLAR_SETTINGS,
  normalizeCellarSettings,
  type CellarSettingsRow,
} from '@/lib/cellarSettings';

const row = (over: Partial<CellarSettingsRow> = {}): CellarSettingsRow => ({
  show_codes: true,
  raw_default: false,
  remember_last: true,
  default_kind: 'idea',
  default_view: 'grouped',
  notify_questions: true,
  ...over,
});

describe('normalizeCellarSettings', () => {
  it('reads a missing row as the defaults, not as an error', () => {
    expect(normalizeCellarSettings(null)).toEqual(DEFAULT_CELLAR_SETTINGS);
  });

  it('falls back per column, so one null does not reset the rest', () => {
    expect(normalizeCellarSettings(row({ show_codes: null, raw_default: true }))).toMatchObject({
      showCodes: true,
      rawDefault: true,
    });
  });

  it('rejects a kind this build does not know rather than rendering a blank chip', () => {
    expect(normalizeCellarSettings(row({ default_kind: 'sketch' })).defaultKind).toBe('idea');
  });

  // 'addition' was folded into 'idea'. A row written before that still says
  // 'addition', and reading it back as anything but idea is a blank chip.
  it('reads a retired kind as idea', () => {
    expect(normalizeCellarSettings(row({ default_kind: 'addition' })).defaultKind).toBe('idea');
  });

  it('treats anything but stream as grouped', () => {
    expect(normalizeCellarSettings(row({ default_view: 'nonsense' })).defaultView).toBe('grouped');
    expect(normalizeCellarSettings(row({ default_view: 'stream' })).defaultView).toBe('stream');
  });
});

describe('cellarSettingsToRow', () => {
  it('emits only the columns actually being changed', () => {
    expect(cellarSettingsToRow({ showCodes: false })).toEqual({ show_codes: false });
  });

  it('emits nothing for an empty patch, so a no-op never round-trips', () => {
    expect(cellarSettingsToRow({})).toEqual({});
  });

  it('drops a kind that is not one of the seven', () => {
    expect(cellarSettingsToRow({ defaultKind: 'sketch' as never })).toEqual({});
  });

  it('keeps false — a patch turning something off is not an absent field', () => {
    expect(cellarSettingsToRow({ rememberLast: false })).toEqual({ remember_last: false });
  });
});
