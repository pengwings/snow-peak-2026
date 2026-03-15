import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');

  if (!userCookie || !userCookie.value) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: userCookie.value });
}
