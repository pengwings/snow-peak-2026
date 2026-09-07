import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json(await db.getCabins());
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cabinId, forUser } = await request.json();

  // Admins may move other trip members in and out of cabins
  let user = sessionUser.name;
  if (forUser && forUser !== sessionUser.name) {
    if (!sessionUser.isAdmin) {
      return NextResponse.json({ error: "Only a trip admin can change another member's cabin" }, { status: 403 });
    }
    if (!(await db.getUser(forUser))) {
      return NextResponse.json({ error: 'Unknown user' }, { status: 400 });
    }
    user = forUser;
  }

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
