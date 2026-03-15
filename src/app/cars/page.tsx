'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
        }
      });

    fetchCars();
  }, [router]);

  const fetchCars = async () => {
    const res = await fetch('/api/cars');
    const data = await res.json();
    setCars(data);
  };

  const handleAssign = async (carId: string | null) => {
    await fetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId }),
    });
    fetchCars();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const isUserDriver = cars.some((car) => car.driver === user);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Rental Cars</h1>
      
      {isUserDriver && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-md">
          You are designated as a driver and cannot join other cars as a passenger.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {cars.map((car) => {
          const isPassenger = car.passengers.includes(user);
          const totalOccupants = car.passengers.length + 1; // +1 for driver
          const isFull = totalOccupants >= car.capacity;

          return (
            <div key={car.id} className="border p-6 rounded-lg shadow-sm bg-white">
              <h2 className="text-xl font-semibold mb-1">{car.name}</h2>
              <p className="text-sm text-gray-500 mb-4">
                Occupants: {totalOccupants} / {car.capacity}
              </p>
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Driver</h3>
                <div className="flex items-center text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {car.driver} {car.driver === user && '(You)'}
                </div>
              </div>

              <div className="mb-4 min-h-[100px]">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Passengers</h3>
                {car.passengers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No passengers yet</p>
                ) : (
                  <ul className="space-y-1">
                    {car.passengers.map((pass, i) => (
                      <li key={i} className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {pass} {pass === user && '(You)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!isUserDriver && (
                isPassenger ? (
                  <button
                    onClick={() => handleAssign(null)}
                    className="w-full py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition"
                  >
                    Leave Car
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssign(car.id)}
                    disabled={isFull}
                    className={`w-full py-2 rounded-md transition ${
                      isFull
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFull ? 'Full' : 'Join as Passenger'}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
