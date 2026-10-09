import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { deskBridge } from './bridge';

/**
 * Inside the desktop app, hands the window's session to the pc's host — the
 * account it starts runs for and checks folders against. Every refresh is
 * passed on, so the host never holds a token of its own to rotate; outside the
 * desktop app there is no bridge and this does nothing.
 */
export function DeskSessionSync() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const bridge = deskBridge();
    if (!bridge) return;
    void bridge.setSession(token && userId ? { accessToken: token, userId } : null);
  }, [token, userId]);

  return null;
}
