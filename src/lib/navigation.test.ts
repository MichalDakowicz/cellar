import { plainNavigation } from './navigation';

test('only plain primary clicks use in-page navigation', () => {
  expect(plainNavigation({ button: 0 })).toBe(true);
  for (const event of [{ button: 1 }, { button: 2 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) {
    expect(plainNavigation(event)).toBe(false);
  }
  expect(plainNavigation({}, '_blank')).toBe(false);
  expect(plainNavigation({}, '_self')).toBe(true);
});
