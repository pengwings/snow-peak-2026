import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ user: null, isAdmin: false, realAdmin: false });
  }

  // isAdmin = effective (admin + admin mode unlocked with the password);
  // realAdmin = actual role (the navbar uses it to offer the toggle).
  return NextResponse.json({
    user: user.name,
    isAdmin: user.isAdmin,
    realAdmin: user.realAdmin,
  });
}
