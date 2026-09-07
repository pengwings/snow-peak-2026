import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findMatchingName } from '@/lib/nameMatch';
import { VIEWER_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const { name, viewOnly } = await request.json();

  // "Browse without signing in": no account needed, pages render read-only.
  if (viewOnly === true) {
    const response = NextResponse.json({ success: true, viewer: true });
    response.cookies.set(VIEWER_COOKIE, '1', { httpOnly: true, path: '/' });
    response.cookies.set('user', '', { httpOnly: true, path: '/', maxAge: 0 });
    response.cookies.set('adminMode', '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Match case-insensitively and tolerate small typos, resolving to the
  // canonical name so all data stays keyed under it.
  const users = await db.getUsers();
  const matchedName = findMatchingName(name, users.map(u => u.name));

  if (!matchedName) {
    return NextResponse.json({ error: 'User not found. Please contact an administrator.' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, name: matchedName });
  response.cookies.set('user', matchedName, {
    httpOnly: true,
    path: '/',
    // session cookie
  });
  // Every login starts with admin mode off; it takes the password to turn on
  response.cookies.set('adminMode', '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set(VIEWER_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });

  return response;
}
