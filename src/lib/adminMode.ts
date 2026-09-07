import crypto from 'crypto';

/**
 * Admin mode is gated by a password (ADMIN_PASSWORD env var). When enabled,
 * the server sets an httpOnly cookie whose value is a hash derivable only
 * with the password — so it can't be forged by editing cookies, which matters
 * because login itself is name-only.
 */
export const ADMIN_MODE_COOKIE = 'adminMode';

export function adminCookieValue(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return crypto.createHash('sha256').update(`snow-peak-admin-mode:${password}`).digest('hex');
}

export function isAdminModeOn(cookieValue: string | undefined): boolean {
  const expected = adminCookieValue();
  return !!expected && cookieValue === expected;
}
