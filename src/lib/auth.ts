import { cookies } from 'next/headers';
import { db, User } from './db';
import { ADMIN_MODE_COOKIE, isAdminModeOn } from './adminMode';

/**
 * Set (to "1") when a visitor chooses to browse without signing in. It grants
 * nothing beyond what unauthenticated reads already allow; it only tells the
 * pages to render read-only instead of bouncing to the login screen.
 */
export const VIEWER_COOKIE = 'viewer';

export async function isViewOnly(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(VIEWER_COOKIE)?.value === '1';
}

export type SessionUser = User & {
  /** Actual role, regardless of admin mode — only for deciding whether to offer the toggle. */
  realAdmin: boolean;
};

/**
 * Resolves the session cookie to a real user row, or null.
 *
 * isAdmin is the EFFECTIVE admin state: true only for an admin who has turned
 * admin mode on with the password. Every admin check in the API routes goes
 * through this, so admin powers are password-gated everywhere at once.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const name = cookieStore.get('user')?.value;
  if (!name) return null;
  const user = await db.getUser(name);
  if (!user) return null;

  const adminModeOn = isAdminModeOn(cookieStore.get(ADMIN_MODE_COOKIE)?.value);
  return {
    ...user,
    isAdmin: user.isAdmin && adminModeOn,
    realAdmin: user.isAdmin,
  };
}
