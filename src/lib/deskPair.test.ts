import { deskAppLink, deskPair, deskPairFromParams, deskPairUrl, isDeskHost, parseDeskPair } from '@/lib/deskPair';

const PAIR = {
  id: '3f9a0c11d2e4b5a6',
  name: 'MSI desk',
  host: '192.168.1.40',
  port: 47821,
  key: 'k3Y_secret-abcdefghijklmnopqrstuvwxyz012',
};

describe('isDeskHost', () => {
  it('takes a dotted v4 address and a hostname', () => {
    expect(isDeskHost('192.168.1.40')).toBe(true);
    expect(isDeskHost('msi.local')).toBe(true);
  });

  it('refuses an out of range octet and anything with a path in it', () => {
    expect(isDeskHost('192.168.1.400')).toBe(false);
    expect(isDeskHost('evil.com/x')).toBe(false);
    expect(isDeskHost('')).toBe(false);
  });
});

describe('deskPair', () => {
  it('checks every field', () => {
    expect(deskPair(PAIR)).toEqual(PAIR);
    expect(deskPair({ ...PAIR, id: 'nope' })).toBeNull();
    expect(deskPair({ ...PAIR, key: 'short' })).toBeNull();
    expect(deskPair({ ...PAIR, port: 70000 })).toBeNull();
    expect(deskPair({ ...PAIR, port: '47821' })).toEqual(PAIR);
  });

  it('falls back to a plain name and cuts a long one', () => {
    expect(deskPair({ ...PAIR, name: '   ' })?.name).toBe('pc');
    expect(deskPair({ ...PAIR, name: 'x'.repeat(90) })?.name).toHaveLength(40);
  });
});

describe('deskPairUrl / parseDeskPair', () => {
  it('round-trips the qr link with the secret in the fragment', () => {
    const url = deskPairUrl(PAIR);
    expect(url.startsWith('http://192.168.1.40:47821/pair#')).toBe(true);
    expect(url.split('#')[0]).not.toContain(PAIR.key);
    expect(parseDeskPair(url)).toEqual(PAIR);
  });

  it('round-trips the app link the pairing page opens', () => {
    expect(parseDeskPair(deskAppLink(PAIR))).toEqual(PAIR);
    expect(parseDeskPair(deskAppLink(PAIR, 'exp+cellar'))).toEqual(PAIR);
  });

  it('is null for codes that are not a pairing', () => {
    expect(parseDeskPair('https://cellar-stash.web.app/qr?x=1')).toBeNull();
    expect(parseDeskPair('http://192.168.1.40:47821/pair')).toBeNull();
    expect(parseDeskPair('hello')).toBeNull();
  });

  it('survives a malformed escape without throwing', () => {
    expect(parseDeskPair(`http://192.168.1.40:47821/pair#d=${PAIR.id}&k=${PAIR.key}&n=%E0%A4%A`)).toEqual({
      ...PAIR,
      name: 'pc',
    });
  });
});

describe('deskPairFromParams', () => {
  it('reads the router params of the deep link', () => {
    expect(deskPairFromParams({ h: PAIR.host, p: '47821', d: PAIR.id, k: PAIR.key, n: [PAIR.name] })).toEqual(PAIR);
    expect(deskPairFromParams({ h: PAIR.host })).toBeNull();
  });
});
