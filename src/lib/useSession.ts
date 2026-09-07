'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/basePath';

export type Session = {
  /** Signed-in member's name, or null while browsing in view-only mode. */
  user: string | null;
  /** Effective admin state (admin role with admin mode turned on). */
  isAdmin: boolean;
  /** Actual admin role, regardless of admin mode. */
  realAdmin: boolean;
  /** True when the visitor chose to browse without signing in. */
  viewer: boolean;
  /** False until /api/me has answered. */
  ready: boolean;
};

const EMPTY: Session = { user: null, isAdmin: false, realAdmin: false, viewer: false, ready: false };

/**
 * Loads the current session for a page. Visitors who are neither signed in
 * nor browsing view-only are sent to the login page. Once `ready`, a null
 * `user` means the page should render read-only.
 */
export function useSession(): Session {
  const router = useRouter();
  const [session, setSession] = useState<Session>(EMPTY);

  useEffect(() => {
    apiFetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user && !data.viewer) {
          router.push('/login');
          return;
        }
        setSession({
          user: data.user ?? null,
          isAdmin: !!data.isAdmin,
          realAdmin: !!data.realAdmin,
          viewer: !!data.viewer,
          ready: true,
        });
      });
  }, [router]);

  return session;
}
