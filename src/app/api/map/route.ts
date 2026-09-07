import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { extractMyMapsId } from '@/lib/myMaps';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ mapId: await db.getMapId() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Only a trip admin can change the map' }, { status: 403 });
  }

  const { link } = await request.json();
  if (typeof link !== 'string') {
    return NextResponse.json({ error: 'link must be a string' }, { status: 400 });
  }

  // An empty link clears the map
  if (!link.trim()) {
    await db.setMapId(null);
    return NextResponse.json({ success: true, mapId: null });
  }

  const mapId = extractMyMapsId(link);
  if (!mapId) {
    return NextResponse.json(
      { error: "That doesn't look like a Google My Maps link. It should contain \"mid=\"." },
      { status: 400 }
    );
  }

  await db.setMapId(mapId);
  return NextResponse.json({ success: true, mapId });
}
