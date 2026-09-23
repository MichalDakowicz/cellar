import { ICON_MAX_CHARS, iconDataUri, iconOf } from '@/lib/projectIcon';

describe('projectIcon', () => {
  it('builds a data uri from the base64 the manipulator hands back', () => {
    expect(iconDataUri('AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(iconDataUri('AAAA', 'png')).toBe('data:image/png;base64,AAAA');
  });

  it('renders only an image data uri', () => {
    expect(iconOf('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(iconOf('https://example.com/a.png')).toBeNull();
    expect(iconOf('data:text/html;base64,AAAA')).toBeNull();
    expect(iconOf(null)).toBeNull();
  });

  it('refuses one too big to belong in a row', () => {
    expect(iconOf(`data:image/jpeg;base64,${'A'.repeat(ICON_MAX_CHARS)}`)).toBeNull();
  });
});
