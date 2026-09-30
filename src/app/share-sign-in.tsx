import { HandoffStatus } from '@/features/auth/HandoffStatus';
import { useShareSignIn } from '@/features/auth/useShareSignIn';

/** `cellar://share-sign-in` — a sibling on this phone asked cellar for a sign-in (PING.md §9.13). */
export default function ShareSignIn() {
  const request = useShareSignIn();
  return (
    <HandoffStatus message={request ? `signing ${request.requester.name.toLowerCase()} in…` : 'opening cellar…'} />
  );
}
