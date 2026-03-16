import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const trimmedName = name.trim();

  // Check if user exists in the database
  const users = await db.getUsers();
  const userExists = users.some(u => u.name === trimmedName);

  if (!userExists) {
    return NextResponse.json({ error: 'User not found. Please contact an administrator.' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, name: trimmedName });
  response.cookies.set('user', trimmedName, {
    httpOnly: true,
    path: '/',
    // session cookie
  });

  return response;
}
