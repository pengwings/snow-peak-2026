import { NextResponse } from 'next/server';
import { db, Flight } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json(await db.getFlights());
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { departureAirport, arrivalAirport, arrivalTime, departureTime, flightNumber, flightType, forUser } = await request.json();

  // Admins may manage flights on behalf of another trip member
  let user = sessionUser.name;
  if (forUser && forUser !== sessionUser.name) {
    if (!sessionUser.isAdmin) {
      return NextResponse.json({ error: "Only a trip admin can change another member's flights" }, { status: 403 });
    }
    if (!(await db.getUser(forUser))) {
      return NextResponse.json({ error: 'Unknown user' }, { status: 400 });
    }
    user = forUser;
  }

  if (!departureAirport || !arrivalAirport || !arrivalTime || !departureTime || !flightType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Remove existing flight of this type for user if any
  await db.removeFlightByType(user, flightType);

  // Add new flight
  const newFlight: Flight = {
    id: Math.random().toString(36).substring(7),
    user,
    departureAirport,
    arrivalAirport,
    arrivalTime,
    departureTime,
    flightNumber,
    flightType,
  };

  await db.addFlight(newFlight);

  return NextResponse.json({ success: true, flights: await db.getFlights() });
}
