import type { NetworkInterfaceInfo } from 'node:os';

/**
 * Which of the pc's addresses a phone on the same Wi-Fi can reach.
 *
 * A Windows machine routinely has half a dozen: Hyper-V and WSL switches, a VPN,
 * a VirtualBox host-only adapter, the link-local fallback. Every one of them is
 * a working IPv4 address and none of them is reachable from a phone, so the QR
 * code has to skip them by name and prefer the ranges a home router hands out.
 */

const VIRTUAL = /vethernet|virtualbox|vmware|wsl|hyper-v|loopback|vbox|docker|npcap|zerotier|bluetooth/i;

function rank(address: string): number {
  if (address.startsWith('192.168.')) return 0;
  if (address.startsWith('10.')) return 1;
  const second = Number(address.split('.')[1]);
  if (address.startsWith('172.') && second >= 16 && second <= 31) return 2;
  return 3;
}

export function pickLanAddress(interfaces: Record<string, NetworkInterfaceInfo[] | undefined>): string | null {
  const candidates: { address: string; rank: number }[] = [];
  for (const [name, infos] of Object.entries(interfaces)) {
    if (VIRTUAL.test(name)) continue;
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal) continue;
      if (info.address.startsWith('169.254.')) continue;
      candidates.push({ address: info.address, rank: rank(info.address) });
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  return candidates[0]?.address ?? null;
}
