import type { DeskInfo } from './deskProtocol';
import type { DeskVia } from './deskLink';

export type AppRole = 'phone-controller' | 'web-controller' | 'desktop-host';
export type HostCapabilities = {
  commands: boolean; previews: boolean; screen: boolean; downloads: boolean;
  worktrees: boolean; events: boolean; approvals: boolean; dispatch: boolean;
};

/** Role is an entry-point decision. A resize never adds authority or a transport. */
export function appCapabilities(role: AppRole, via: DeskVia, info: DeskInfo | null) {
  const direct = role === 'desktop-host' ? via === 'bridge' : role === 'phone-controller' && via === 'lan';
  const advertised = info?.capabilities;
  return {
    localHost: role === 'desktop-host',
    pairingIssuer: role === 'desktop-host',
    adbPresenter: role === 'desktop-host',
    start: direct || via === 'cellar',
    log: direct,
    local: direct && role === 'phone-controller',
    pages: direct && advertised?.previews === true,
    managedPreviews: direct && info?.previewProtocol === 1,
    commands: direct && advertised?.commands === true,
    keys: direct && info?.keysProtocol === 1,
    screen: direct && advertised?.screen === true,
    downloads: direct && advertised?.downloads === true,
    worktrees: direct && info?.worktrees === true,
    events: direct && info?.eventProtocol === 1,
    approvals: direct && info?.approvalProtocol === 1,
    dispatch: direct && info?.dispatchProtocol === 1,
  };
}
