import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { redirectForSession } from '@/lib/authRoute';

/**
 * Keeps the route honest about the session. Sits above the navigator so it
 * covers the screens pushed out of the tabs, which is where signing out used to
 * leave you looking at settings you were no longer signed in to.
 */
export function useSessionRoute() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const segment = segments[0] as string | undefined;

  useEffect(() => {
    const href = redirectForSession({ loading, signedIn: Boolean(user), segment });
    if (href) router.replace(href as Href);
  }, [loading, user, segment, router]);
}
