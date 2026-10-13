import { deskAppLink, deskPair, deskPairFromParams, deskPairUrl, isDeskHost, parseDeskPair } from '@/lib/deskPair';

const PAIR = {
  id: '3f9a0c11d2e4b5a6',
  name: 'MSI desk',
  host: '192.168.1.40',
  port: 47821,
  key: 'k3Y_secret-abcdefghijklmnopqrstuvwxyz012',
};

describe('isDeskHost', () => {
  it('takes home-network addresses and a .local name', () => {
    for (const host of ['192.168.1.40', '10.0.0.7', '172.20.1.2', '169.254.3.3', '100.101.2.3', 'msi.local']) {
      expect(isDeskHost(host)).toBe(true);
    }
  });

  it('refuses public addresses, public names, bad octets and paths', () => {
    for (const host of ['8.8.8.8', '172.32.0.1', 'evil.com', '192.168.1.400', 'evil.com/x', '']) {
      expect(isDeskHost(host)).toBe(false);
    }
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
