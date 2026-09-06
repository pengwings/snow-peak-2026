import { NextResponse } from 'next/server';
import { db, PackingItem } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json(await db.getPackingItems());
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = sessionUser.name;

  const { action, id, name, provided, personal, packed, assignee } = await request.json();

  // Campground-provided items are managed by trip admins only
  const providedError = () =>
    NextResponse.json({ error: 'Only a trip admin can change what the campground provides' }, { status: 403 });

  if (action === 'create') {
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (provided && !sessionUser.isAdmin) return providedError();
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
    if (item.provided && !sessionUser.isAdmin) return providedError();
    if (name !== undefined) item.name = name;
    if (packed !== undefined) item.packed = packed;
    if (assignee !== undefined) item.assignee = assignee;
    await db.updatePackingItem(item);
  } else if (action === 'delete') {
    const items = await db.getPackingItems();
    const item = items.find(i => i.id === id);
    if (item?.provided && !sessionUser.isAdmin) return providedError();
    await db.removePackingItem(id);
  }

  return NextResponse.json({ success: true, items: await db.getPackingItems() });
}
