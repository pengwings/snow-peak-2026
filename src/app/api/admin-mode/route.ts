import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ADMIN_MODE_COOKIE, adminCookieValue } from '@/lib/adminMode';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.realAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { enable, password } = await request.json();

  if (!enable) {
    const response = NextResponse.json({ success: true, adminMode: false });
    response.cookies.set(ADMIN_MODE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }

  const expected = adminCookieValue();
  if (!expected) {
    return NextResponse.json(
      { error: 'No admin password is configured. Set ADMIN_PASSWORD in the environment.' },
      { status: 500 }
    );
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, adminMode: true });
  // Session cookie: closing the browser drops admin mode
  response.cookies.set(ADMIN_MODE_COOKIE, expected, { httpOnly: true, path: '/' });
  return response;
}
