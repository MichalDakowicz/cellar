import assert from 'node:assert/strict';
import type { NetworkInterfaceInfo } from 'node:os';
import { test } from 'node:test';

import { pickLanAddress, pickTailnetAddress } from './network.ts';

const v4 = (address: string, internal = false) =>
  ({ address, family: 'IPv4', internal, netmask: '255.255.255.0', mac: '', cidr: null }) as NetworkInterfaceInfo;
test('tailnet advertisement requires Tailscale adapter and valid CGNAT address', () => {
  assert.equal(pickTailnetAddress({ Tailscale: [v4('100.100.5.6')], Ethernet: [v4('192.168.1.2')] }), '100.100.5.6');
  assert.equal(pickTailnetAddress({ VPN: [v4('100.100.5.6')] }), null);
  assert.equal(pickTailnetAddress({ Tailscale: [v4('100.128.5.6')] }), null);
});

test('prefers the wi-fi address over virtual switches', () => {
  assert.equal(
    pickLanAddress({
      'vEthernet (WSL)': [v4('172.27.112.1')],
      'Loopback Pseudo-Interface 1': [v4('127.0.0.1', true)],
      'Wi-Fi': [v4('192.168.1.40')],
    }),
    '192.168.1.40',
  );
});

test('skips link-local and falls back through the private ranges', () => {
  assert.equal(pickLanAddress({ Ethernet: [v4('169.254.3.3'), v4('10.0.0.7')] }), '10.0.0.7');
  assert.equal(pickLanAddress({ Ethernet: [v4('172.20.1.2')] }), '172.20.1.2');
});

test('is null when there is nothing a phone could reach', () => {
  assert.equal(pickLanAddress({ 'vEthernet (Default Switch)': [v4('172.17.0.1')] }), null);
  assert.equal(pickLanAddress({}), null);
});
