import { countToday, dayLabel, dropStamp, longRel, shortRel } from '@/lib/relTime';

const NOW = new Date('2026-09-13T12:00:00.000Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('shortRel', () => {
  it('says now under a minute and a half', () => {
    expect(shortRel(ago(30_000), NOW)).toBe('now');
    expect(shortRel(ago(89_000), NOW)).toBe('now');
  });

  it('steps through minutes, hours, days and weeks', () => {
    expect(shortRel(ago(12 * MINUTE), NOW)).toBe('12m');
    expect(shortRel(ago(5 * HOUR), NOW)).toBe('5h');
    expect(shortRel(ago(3 * DAY), NOW)).toBe('3d');
    expect(shortRel(ago(20 * DAY), NOW)).toBe('3w');
  });

  it('never goes negative on a clock that drifted forward', () => {
    expect(shortRel(new Date(NOW + 10 * MINUTE).toISOString(), NOW)).toBe('now');
  });
});

describe('longRel', () => {
  it('turns the bare value into a sentence', () => {
    expect(longRel(ago(5 * HOUR), NOW)).toBe('5h ago');
    expect(longRel(ago(1000), NOW)).toBe('just now');
  });
});

describe('dayLabel', () => {
  // Local-calendar keys, so these are built from the local date `NOW` falls on.
  const today = new Date(NOW);
  const key = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  it('names the near days and dates the rest', () => {
    expect(dayLabel(key(0), NOW)).toBe('today');
    expect(dayLabel(key(1), NOW)).toBe('yesterday');
    expect(dayLabel(key(4), NOW)).toBe('4 days ago');
    expect(dayLabel(key(30), NOW)).not.toMatch(/days ago|today|yesterday/);
  });
});

describe('dropStamp', () => {
  it('pairs the relative reading with the exact one', () => {
    expect(dropStamp(ago(5 * HOUR), NOW)).toMatch(/^dropped 5h ago · /);
  });
});

describe('countToday', () => {
  it('counts the last 24 hours, not the calendar day', () => {
    expect(countToday([ago(HOUR), ago(23 * HOUR), ago(25 * HOUR)], NOW)).toBe(2);
  });
});
