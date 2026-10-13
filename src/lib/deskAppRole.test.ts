import { appCapabilities, type AppRole } from './deskAppRole';
import type { DeskInfo } from './deskProtocol';

const info: DeskInfo = { id: 'host', name: 'pc', version: '1', signedIn: true, agents: [],
  capabilities: { commands: true, previews: true, screen: true, downloads: true,
    worktrees: true, events: true, approvals: true, dispatch: true },
  dispatchProtocol: 1, approvalProtocol: 1, eventProtocol: 1, worktrees: true };

test('browser never gains a local bridge or LAN credentials, even with host advertisement', () => {
  for (const via of ['bridge', 'lan', 'cellar', 'none'] as const) {
    const can = appCapabilities('web-controller', via, info);
    expect(can.localHost).toBe(false); expect(can.pairingIssuer).toBe(false);
    expect(can.adbPresenter).toBe(false); expect(can.log).toBe(false); expect(can.pages).toBe(false);
    expect(can.start).toBe(via === 'cellar');
  }
});
test('phone retains direct remote tools; missing advertisements grant no new feature', () => {
  expect(appCapabilities('phone-controller', 'lan', info)).toMatchObject({ commands: true, pages: true,
    screen: true, downloads: true, localHost: false, adbPresenter: false });
  expect(appCapabilities('phone-controller', 'none', info).commands).toBe(false);
  expect(appCapabilities('phone-controller', 'lan', { ...info, capabilities: undefined }).commands).toBe(false);
});
test('desktop role survives narrow layout; only IPC is its direct transport', () => {
  expect(appCapabilities('desktop-host', 'bridge', info)).toMatchObject({ localHost: true, pairingIssuer: true, log: true });
  expect(appCapabilities('desktop-host', 'lan', info).log).toBe(false);
  for (const role of ['phone-controller', 'web-controller', 'desktop-host'] as AppRole[]) {
    expect(appCapabilities(role, 'none', null).localHost).toBe(role === 'desktop-host');
  }
});
