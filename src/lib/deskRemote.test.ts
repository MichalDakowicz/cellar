import { screenInput, screenPoint, screenScroll } from './deskRemote';
test('screen coordinates exclude black bars and preserve primary-display coordinates', () => {
  expect(screenPoint(0, 20, 800, 800, 2)).toBeNull();
  expect(screenPoint(400, 400, 800, 800, 2)).toEqual({ x: .5, y: .5 });
  expect(screenPoint(1, 1, 0, 0, 0)).toBeNull();
});

test('natural two-finger scroll follows content and stays bounded', () => {
  expect(screenScroll(200, 100)).toBe(-300);
  expect(screenScroll(100, 200)).toBe(300);
  expect(screenScroll(0, 2000)).toBe(1200);
});

test('wide and portrait video taps map corners correctly inside landscape letterboxing', () => {
  expect(screenPoint(100, 0, 1000, 450, 16 / 9)).toEqual({ x: 0, y: 0 });
  expect(screenPoint(900, 450, 1000, 450, 16 / 9)).toEqual({ x: 1, y: 1 });
  expect(screenPoint(500, 225, 1000, 450, 0.5)).toEqual({ x: 0.5, y: 0.5 });
  expect(screenPoint(50, 225, 1000, 450, 0.5)).toBeNull();
});
test('input rejects injection, nonfinite coordinates, modifier coercion and huge text', () => {
  for (const value of [{ kind: 'key', key: '%{F4}' }, { kind: 'key', key: 'a', ctrl: 'yes' }, { kind: 'tap', x: NaN, y: 0 }, { kind: 'tap', x: 2, y: 0 }, { kind: 'text', text: 'a'.repeat(2001) }]) expect(() => screenInput(value)).toThrow();
  expect(screenInput({ kind: 'text', text: 'Cześć 👋 $()' })).toEqual({ kind: 'text', text: 'Cześć 👋 $()' });
});
