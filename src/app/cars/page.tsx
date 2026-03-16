'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/displayName';

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

  if (!user) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const isUserDriver = cars.some((car) => car.driver === user);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Rental Cars</h1>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

      {isUserDriver && (
        <div className="mb-6 px-4 py-3 text-sm" style={{ background: '#fdf3d8', border: '1px solid #e8d89a', color: '#7a5c10' }}>
          You are a designated driver and cannot join other cars as a passenger.
        </div>
      )}

      <div className="grid gap-px md:grid-cols-2" style={{ background: 'var(--border)' }}>
        {cars.map((car) => {
          const isPassenger = car.passengers.includes(user!);
          const totalOccupants = car.passengers.length + 1;
          const isFull = totalOccupants >= car.capacity;

          return (
            <div key={car.id} className="p-6" style={{ background: 'var(--card)' }}>
              <h2 className="text-xl font-normal mb-1" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>{car.name}</h2>
              <p className="text-xs uppercase tracking-wide mb-5" style={{ color: 'var(--muted)' }}>
                {totalOccupants} / {car.capacity} seats
              </p>

              <div className="mb-4">
                <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Driver</h3>
                <div className="flex items-center gap-2 text-sm px-3 py-2" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                  {displayName(car.driver)} {car.driver === user && '(You)'}
                </div>
              </div>

              <div className="mb-5">
                <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Passengers</h3>
                {car.passengers.length === 0 ? (
                  <p className="text-sm italic" style={{ color: 'var(--muted)' }}>No passengers yet</p>
                ) : (
                  <ul className="space-y-1">
                    {car.passengers.map((pass, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        {displayName(pass)} {pass === user && '(You)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!isUserDriver && (
                isPassenger ? (
                  <button
                    onClick={() => handleAssign(null)}
                    className="w-full py-2 text-sm text-red-700 transition"
                    style={{ background: '#fde8e8', border: '1px solid #f0c0c0' }}
                  >
                    Leave Car
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssign(car.id)}
                    disabled={isFull}
                    className="w-full py-2 text-sm transition"
                    style={isFull
                      ? { background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'not-allowed' }
                      : { background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }
                    }
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
