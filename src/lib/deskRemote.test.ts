import { screenInput, screenPoint } from './deskRemote';
test('screen coordinates exclude black bars and preserve primary-display coordinates', () => {
  expect(screenPoint(0, 20, 800, 800, 2)).toBeNull();
  expect(screenPoint(400, 400, 800, 800, 2)).toEqual({ x: .5, y: .5 });
  expect(screenPoint(1, 1, 0, 0, 0)).toBeNull();
});
test('input rejects injection, nonfinite coordinates, modifier coercion and huge text', () => {
  for (const value of [{ kind: 'key', key: '%{F4}' }, { kind: 'key', key: 'a', ctrl: 'yes' }, { kind: 'tap', x: NaN, y: 0 }, { kind: 'tap', x: 2, y: 0 }, { kind: 'text', text: 'a'.repeat(2001) }]) expect(() => screenInput(value)).toThrow();
  expect(screenInput({ kind: 'text', text: 'Cześć 👋 $()' })).toEqual({ kind: 'text', text: 'Cześć 👋 $()' });
});
