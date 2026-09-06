import { cookies } from 'next/headers';
import { db, User } from './db';

/** Resolves the session cookie to a real user row (with admin flag), or null. */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const name = cookieStore.get('user')?.value;
  if (!name) return null;
  return db.getUser(name);
}
