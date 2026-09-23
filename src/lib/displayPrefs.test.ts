import {
  effectiveCollapsed,
  foldedByDefault,
  kindOrderOf,
  kindToFront,
  orderedKinds,
  projectSortOf,
  rowDensityOf,
  rowMetrics,
  sortForProject,
  startTabOf,
  textSizeOf,
} from '@/lib/displayPrefs';
import { KINDS } from '@/lib/kinds';

describe('readers', () => {
  it('take their own words and fall back on anything else', () => {
    expect(rowDensityOf('compact')).toBe('compact');
    expect(rowDensityOf('tiny')).toBe('roomy');
    expect(textSizeOf('large')).toBe('large');
    expect(textSizeOf(null)).toBe('normal');
    expect(projectSortOf('oldest')).toBe('oldest');
    expect(projectSortOf(undefined)).toBe('newest');
    expect(startTabOf('inbox')).toBe('inbox');
    expect(startTabOf('profile')).toBe('dump');
  });
});

describe('rowMetrics', () => {
  it('turns the two dials into padding and a line that fits the type', () => {
    expect(rowMetrics('roomy', 'normal')).toEqual({ padY: 10, fontSize: 14, lineHeight: 20 });
    expect(rowMetrics('compact', 'large')).toEqual({ padY: 5, fontSize: 16, lineHeight: 22 });
    expect(rowMetrics('compact', 'small').lineHeight).toBeGreaterThan(rowMetrics('compact', 'small').fontSize);
  });
});

describe('orderedKinds', () => {
  it('is the default order with nothing chosen', () => {
    expect(orderedKinds(null)).toBe(KINDS);
    expect(orderedKinds([])).toBe(KINDS);
  });

  it('puts the chosen ones first and keeps the rest in the default order', () => {
    expect(orderedKinds(['idea', 'design']).map((kind) => kind.value)).toEqual([
      'idea',
      'design',
      'glitch',
      'removal',
      'question',
      'research',
      'copy',
    ]);
  });

  it('ignores a word it does not know, and a repeat', () => {
    expect(orderedKinds(['addition', 'copy', 'copy'])[0].value).toBe('copy');
    expect(orderedKinds(['addition', 'copy', 'copy'])).toHaveLength(7);
  });
});

describe('kindToFront', () => {
  it('moves the tapped kind to the front and leaves the rest where they were', () => {
    expect(kindToFront(['idea', 'glitch'], 'copy').slice(0, 3)).toEqual(['copy', 'idea', 'glitch']);
    expect(kindToFront(null, 'idea')).toHaveLength(7);
  });
});

describe('kindOrderOf', () => {
  it('keeps known words once each, and reads nothing usable as the default', () => {
    expect(kindOrderOf(['copy', 'nope', 'copy', 'idea'])).toEqual(['copy', 'idea']);
    expect(kindOrderOf(['nope'])).toBeNull();
    expect(kindOrderOf('idea')).toBeNull();
  });
});

describe('sortForProject', () => {
  const rows = [{ createdAt: '2026-09-02' }, { createdAt: '2026-09-03' }, { createdAt: '2026-09-01' }];

  it('reads newest first or oldest first', () => {
    expect(sortForProject(rows, 'newest').map((row) => row.createdAt)).toEqual(['2026-09-03', '2026-09-02', '2026-09-01']);
    expect(sortForProject(rows, 'oldest').map((row) => row.createdAt)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });
});

describe('folding', () => {
  it('starts the settled headings folded only when asked to', () => {
    expect([...foldedByDefault(true)]).toEqual(['b:done', 'b:dropped', 's:settled']);
    expect(foldedByDefault(false).size).toBe(0);
  });

  it('opens a heading that started folded when you tap it, and folds one that did not', () => {
    const shown = effectiveCollapsed(new Set(['b:done', 'b:open']), foldedByDefault(true));
    expect(shown.has('b:done')).toBe(false);
    expect(shown.has('b:dropped')).toBe(true);
    expect(shown.has('b:open')).toBe(true);
  });
});
