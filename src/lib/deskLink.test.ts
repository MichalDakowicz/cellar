import { chooseDeskVia, deskCan, pickDesk } from '@/lib/deskLink';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('chooseDeskVia', () => {
  it('prefers the bridge, then the lan, then the cellar', () => {
    expect(chooseDeskVia({ bridge: true, lanAnswered: true, seenAt: ago(0), now: NOW })).toBe('bridge');
    expect(chooseDeskVia({ bridge: false, lanAnswered: true, seenAt: ago(0), now: NOW })).toBe('lan');
    expect(chooseDeskVia({ bridge: false, lanAnswered: false, seenAt: ago(10_000), now: NOW })).toBe('cellar');
  });

  it('is none when the pc has not beaten for a while', () => {
    expect(chooseDeskVia({ bridge: false, lanAnswered: false, seenAt: ago(5 * 60_000), now: NOW })).toBe('none');
    expect(chooseDeskVia({ bridge: false, lanAnswered: false, seenAt: null, now: NOW })).toBe('none');
  });
});

describe('pickDesk', () => {
  const desks = [
    { id: 'aaaa1111', seenAt: ago(60_000) },
    { id: 'bbbb2222', seenAt: ago(1000) },
  ];

  it('takes the paired pc, and only that one', () => {
    expect(pickDesk(desks, 'aaaa1111')?.id).toBe('aaaa1111');
    expect(pickDesk(desks, 'cccc3333')).toBeNull();
  });

  it('takes the freshest pc when nothing is paired', () => {
    expect(pickDesk(desks, null)?.id).toBe('bbbb2222');
    expect(pickDesk([], null)).toBeNull();
  });
});

describe('deskCan', () => {
  it('keeps pages, screen and builds to the lan', () => {
    expect(deskCan('lan')).toEqual({ start: true, log: true, local: true });
    expect(deskCan('cellar')).toEqual({ start: true, log: false, local: false });
    expect(deskCan('bridge')).toEqual({ start: true, log: true, local: false });
    expect(deskCan('none').start).toBe(false);
  });
});
