import { createHash, createHmac } from 'crypto';

import { hex, hmacSha256, parseDeskAuth, signDeskRequest, signingString, utf8 } from '@/lib/deskSign';

const sha256 = async (data: Uint8Array) => new Uint8Array(createHash('sha256').update(data).digest());

describe('hmacSha256', () => {
  it('matches node for a short key, a long key and an empty message', async () => {
    for (const [key, message] of [
      ['key', 'The quick brown fox jumps over the lazy dog'],
      ['k'.repeat(131), 'Test Using Larger Than Block-Size Key - Hash Key First'],
      ['secret', ''],
    ]) {
      const ours = hex(await hmacSha256(utf8(key), utf8(message), sha256));
      expect(ours).toBe(createHmac('sha256', key).update(message).digest('hex'));
    }
  });
});

describe('signDeskRequest', () => {
  it('signs exactly the string the pc rebuilds', async () => {
    const header = await signDeskRequest({
      key: 'k3Y_secret-abcdefghijklmnopqrstuvwxyz012',
      method: 'post',
      path: '/runs',
      body: '{"prompt":"x"}',
      ts: 1791546102520,
      nonce: '0123456789abcdef',
      sha256,
    });
    const auth = parseDeskAuth(header);
    expect(auth).toMatchObject({ ts: 1791546102520, nonce: '0123456789abcdef' });

    const bodyHash = createHash('sha256').update('{"prompt":"x"}').digest('hex');
    const expected = createHmac('sha256', 'k3Y_secret-abcdefghijklmnopqrstuvwxyz012')
      .update(signingString('POST', '/runs', 1791546102520, '0123456789abcdef', bodyHash))
      .digest('hex');
    expect(auth?.sig).toBe(expected);
  });

  it('never puts the key in the header', async () => {
    const key = 'k3Y_secret-abcdefghijklmnopqrstuvwxyz012';
    const header = await signDeskRequest({ key, method: 'GET', path: '/desk', body: '', ts: 1, nonce: 'ab'.repeat(8), sha256 });
    expect(header).not.toContain(key);
  });
});

describe('parseDeskAuth', () => {
  it('refuses anything that is not a whole signature', () => {
    expect(parseDeskAuth('Bearer abc')).toBeNull();
    expect(parseDeskAuth(`Desk 1791546102520.0123456789abcdef.${'a'.repeat(63)}`)).toBeNull();
    expect(parseDeskAuth(undefined)).toBeNull();
  });
});
