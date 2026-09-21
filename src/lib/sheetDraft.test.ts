import { CLOSED_DRAFT, resolveDraft, seedDraft } from '@/lib/sheetDraft';

type Values = { name: string };

const nameOf = (name: string): Values => ({ name });

describe('resolveDraft', () => {
  it('seeds from the row the first time a sheet opens on it', () => {
    const held = seedDraft<Values>(CLOSED_DRAFT, nameOf(''));
    const { draft, persist } = resolveDraft(held, true, 'p1', nameOf('cellar'));

    expect(draft.values.name).toBe('cellar');
    expect(draft.key).toBe('p1');
    expect(persist).toBe(false);
  });

  it('keeps what is typed while the sheet stays on the same row', () => {
    const held = { key: 'p1', values: nameOf('cellar v2'), confirming: false };
    const { draft, persist } = resolveDraft(held, true, 'p1', nameOf('cellar'));

    expect(draft).toBe(held);
    expect(persist).toBe(false);
  });

  it('re-seeds when the sheet opens on a different row', () => {
    const held = { key: 'p1', values: nameOf('cellar v2'), confirming: false };
    const { draft, persist } = resolveDraft(held, true, 'p2', nameOf('radar'));

    expect(draft.values.name).toBe('radar');
    expect(persist).toBe(false);
  });

  it('writes the reset on the closed render, so the close is not lost', () => {
    const held = { key: 'p1', values: nameOf('cellar v2'), confirming: true };
    const { draft, persist } = resolveDraft(held, false, null, nameOf(''));

    expect(draft.key).toBe(CLOSED_DRAFT);
    expect(draft.confirming).toBe(false);
    expect(persist).toBe(true);
  });

  it('does not offer an abandoned rename back when the same row reopens', () => {
    const typed = { key: 'p1', values: nameOf('cellar v2'), confirming: false };
    const closed = resolveDraft(typed, false, null, nameOf('')).draft;
    const reopened = resolveDraft(closed, true, 'p1', nameOf('cellar')).draft;

    expect(reopened.values.name).toBe('cellar');
  });

  it('drops an armed delete confirm when the same row reopens', () => {
    const arming = { key: 's1', values: nameOf('apps'), confirming: true };
    const closed = resolveDraft(arming, false, null, nameOf('')).draft;
    const reopened = resolveDraft(closed, true, 's1', nameOf('apps')).draft;

    expect(reopened.confirming).toBe(false);
  });

  it('settles after the closed write, so the render does not loop', () => {
    const held = { key: 'p1', values: nameOf('cellar v2'), confirming: false };
    const written = resolveDraft(held, false, null, nameOf('')).draft;

    expect(resolveDraft(written, false, null, nameOf('')).persist).toBe(false);
  });

  it('tells a closed sheet apart from one open on no row at all', () => {
    const held = seedDraft<Values>(CLOSED_DRAFT, nameOf(''));
    const { draft } = resolveDraft(held, true, null, nameOf(''));

    expect(draft.key).not.toBe(CLOSED_DRAFT);
  });
});
