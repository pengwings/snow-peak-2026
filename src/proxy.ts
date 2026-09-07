import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ADMIN_MODE_COOKIE, isAdminModeOn } from '@/lib/adminMode';

/**
 * Server-side guard for hidden tabs: non-admins (and admins browsing with
 * admin mode off) who open a hidden tab's URL directly are sent home.
 * The matcher limits this to the tab pages, so most requests never hit the DB.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Sub-pages (e.g. /trivia/host) are hidden along with their tab.
  const tab = '/' + pathname.split('/')[1];

  const hiddenTabs = await db.getHiddenTabs();
  if (!hiddenTabs.includes(tab)) return NextResponse.next();

  const name = request.cookies.get('user')?.value;
  const adminModeOn = isAdminModeOn(request.cookies.get(ADMIN_MODE_COOKIE)?.value);
  if (name && adminModeOn) {
    const user = await db.getUser(name);
    if (user?.isAdmin) return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/cabins', '/flights', '/expenses', '/activities', '/todos', '/packing', '/trivia', '/trivia/:path*'],
};
