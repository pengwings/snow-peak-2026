import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({ hiddenTabs: await db.getHiddenTabs() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { hiddenTabs } = await request.json();
  if (!Array.isArray(hiddenTabs) || hiddenTabs.some((t) => typeof t !== 'string')) {
    return NextResponse.json({ error: 'hiddenTabs must be a list of tab paths' }, { status: 400 });
  }

  await db.setHiddenTabs(hiddenTabs);
  return NextResponse.json({ success: true, hiddenTabs: await db.getHiddenTabs() });
}
