import { NextResponse } from 'next/server';
import { db, PackingItem } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(await db.getPackingItems());
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, id, name, provided, personal, packed, assignee } = await request.json();

  if (action === 'create') {
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const newItem: PackingItem = {
      id: Math.random().toString(36).substring(7),
      name,
      provided: provided ?? false,
      personal: personal ?? false,
      packed: false,
      user,
      assignee: assignee ?? null,
    };
    await db.addPackingItem(newItem);
  } else if (action === 'update') {
    const items = await db.getPackingItems();
    const item = items.find(i => i.id === id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (name !== undefined) item.name = name;
    if (packed !== undefined) item.packed = packed;
    if (assignee !== undefined) item.assignee = assignee;
    await db.updatePackingItem(item);
  } else if (action === 'delete') {
    await db.removePackingItem(id);
  }

  return NextResponse.json({ success: true, items: await db.getPackingItems() });
}
