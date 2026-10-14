import { SCREEN_MODES, screenHint, screenMode, screenStatus } from './deskScreen';

describe('screenMode', () => {
  it('finds a mode, and falls back to touch', () => {
    expect(screenMode('keys').label).toBe('keyboard');
    expect(screenMode('nope' as never).id).toBe('touch');
  });

  it('has the four modes in island order', () => {
    expect(SCREEN_MODES.map((mode) => mode.id)).toEqual(['touch', 'pad', 'keys', 'voice']);
  });
});

describe('screenHint', () => {
  it('says how to drive it once the pc takes input', () => {
    expect(screenHint('touch', true)).toBe('tap = click · two fingers = scroll · hold = right click');
  });

  it('says it is view only before that', () => {
    expect(screenHint('pad', false)).toBe('trackpad — drag the cursor · comes later, view only for now');
  });
});

describe('screenStatus', () => {
  it('is live only once the picture arrived', () => {
    expect(screenStatus('live')).toEqual({ text: 'live video', live: true });
    expect(screenStatus('connecting').live).toBe(false);
    expect(screenStatus('gone').text).toBe('not answering');
  });
});
