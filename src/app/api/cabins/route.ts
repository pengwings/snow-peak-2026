import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(await db.getCabins());
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cabinId } = await request.json();

  // Remove user from any existing cabin
  const allCabins = await db.getCabins();
  for (const cabin of allCabins) {
    if (cabin.occupants.includes(user)) {
      cabin.occupants = cabin.occupants.filter((occ) => occ !== user);
      await db.updateCabin(cabin);
    }
  }

  // Add user to the new cabin if cabinId is provided
  if (cabinId) {
    const updatedCabins = await db.getCabins();
    const targetCabin = updatedCabins.find((c) => c.id === cabinId);
    if (targetCabin && targetCabin.occupants.length < targetCabin.capacity) {
      targetCabin.occupants.push(user);
      await db.updateCabin(targetCabin);
    } else {
      return NextResponse.json({ error: 'Cabin full or not found' }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true, cabins: await db.getCabins() });
}
