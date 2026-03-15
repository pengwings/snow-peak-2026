import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const trimmedName = name.trim();

  // Add user to db
  db.addUser(trimmedName);

  const response = NextResponse.json({ success: true, name: trimmedName });
  response.cookies.set('user', trimmedName, {
    httpOnly: true,
    path: '/',
    // session cookie
  });

  return response;
}
