import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(await db.getCars());
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { carId } = await request.json();

  const cars = await db.getCars();

  // First check if the user is the driver of any car
  const isDriver = cars.some((car) => car.driver === user);
  if (isDriver) {
    return NextResponse.json({ error: 'Drivers cannot become passengers' }, { status: 400 });
  }

  // Remove user from any existing car
  for (const car of cars) {
    if (car.passengers.includes(user)) {
      car.passengers = car.passengers.filter((pass) => pass !== user);
      await db.updateCar(car);
    }
  }

  // Add user to the new car if carId is provided
  if (carId) {
    const updatedCars = await db.getCars();
    const targetCar = updatedCars.find((c) => c.id === carId);
    if (targetCar && targetCar.passengers.length + 1 < targetCar.capacity) {
      targetCar.passengers.push(user);
      await db.updateCar(targetCar);
    } else {
      return NextResponse.json({ error: 'Car full or not found' }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true, cars: await db.getCars() });
}
