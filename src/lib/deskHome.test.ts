import { captureReturn, deskToday } from './deskHome';

describe('captureReturn', () => {
  it('files on enter and hands off on shift+enter', () => {
    expect(captureReturn({ shift: false })).toBe('file');
    expect(captureReturn({ shift: true })).toBe('handoff');
  });
});

describe('deskToday', () => {
  const now = Date.parse('2026-10-09T20:00:00Z');
  const hour = 60 * 60 * 1000;

  it('counts the last day only', () => {
    const figures = deskToday(
      ['2026-10-09T10:00:00Z', '2026-10-09T19:00:00Z', '2026-10-07T10:00:00Z'],
      [
        { startedAt: now - hour, state: 'done', origin: 'phone' },
        { startedAt: now - 2 * hour, state: 'running', origin: 'phone' },
        { startedAt: now - 30 * hour, state: 'done', origin: 'phone' },
      ],
      now,
    );
    expect(figures).toEqual([
      { label: 'thoughts dumped', value: '2' },
      { label: 'handed off', value: '2' },
      { label: 'done by agents', value: '1' },
    ]);
  });

  it('leaves out sessions opened at the pc — nobody handed those off', () => {
    const [, handed] = deskToday([], [{ startedAt: now, state: 'done', origin: 'pc' }], now);
    expect(handed.value).toBe('0');
  });
});
