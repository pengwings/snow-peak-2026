import { NextResponse } from 'next/server';
import { db, Flight } from '@/lib/db';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid'; // need uuid

export async function GET() {
  return NextResponse.json(db.flights);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { airport, arrivalTime, departureTime } = await request.json();

  if (!airport || !arrivalTime || !departureTime) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Remove existing flight for user if any
  db.removeFlightForUser(user);

  // Add new flight
  const newFlight: Flight = {
    id: Math.random().toString(36).substring(7),
    user,
    airport,
    arrivalTime,
    departureTime,
  };

  db.addFlight(newFlight);

  return NextResponse.json({ success: true, flights: db.flights });
}
