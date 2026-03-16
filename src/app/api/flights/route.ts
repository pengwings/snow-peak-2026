import { NextResponse } from 'next/server';
import { db, Flight } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(await db.getFlights());
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { departureAirport, arrivalAirport, arrivalTime, departureTime } = await request.json();

  if (!departureAirport || !arrivalAirport || !arrivalTime || !departureTime) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Remove existing flight for user if any
  await db.removeFlightForUser(user);

  // Add new flight
  const newFlight: Flight = {
    id: Math.random().toString(36).substring(7),
    user,
    departureAirport,
    arrivalAirport,
    arrivalTime,
    departureTime,
  };

  await db.addFlight(newFlight);

  return NextResponse.json({ success: true, flights: await db.getFlights() });
}
