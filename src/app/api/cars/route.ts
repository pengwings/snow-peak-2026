import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(db.cars);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { carId } = await request.json();

  // First check if the user is the driver of any car
  const isDriver = db.cars.some((car) => car.driver === user);
  if (isDriver) {
    return NextResponse.json({ error: 'Drivers cannot become passengers' }, { status: 400 });
  }

  // Remove user from any existing car
  const allCars = db.cars;
  allCars.forEach((car) => {
    if (car.passengers.includes(user)) {
      car.passengers = car.passengers.filter((pass) => pass !== user);
      db.updateCar(car);
    }
  });

  // Add user to the new car if carId is provided
  if (carId) {
    const targetCar = db.cars.find((c) => c.id === carId);
    if (targetCar && targetCar.passengers.length + 1 < targetCar.capacity) {
      targetCar.passengers.push(user);
      db.updateCar(targetCar);
    } else {
      return NextResponse.json({ error: 'Car full or not found' }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true, cars: db.cars });
}
