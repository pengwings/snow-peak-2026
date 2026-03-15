'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
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
  }, [router]);

  if (!user) return <div className="min-h-screen p-8 flex justify-center">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl overflow-hidden mb-12">
        <div className="px-8 py-12 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Snow Peak Trip
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
            Welcome back, <span className="font-semibold text-white">{user}</span>! Let's get everything organized for the perfect getaway.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/cabins" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition duration-200 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
              🏠 Cabins
            </h2>
            <p className="text-gray-600 flex-1">View cabin assignments and choose where you'll be sleeping.</p>
            <span className="text-blue-600 font-medium text-sm mt-4 flex items-center group-hover:translate-x-1 transition-transform">
              Manage Cabins &rarr;
            </span>
          </div>
        </Link>

        <Link href="/cars" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition duration-200 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
              🚗 Rental Cars
            </h2>
            <p className="text-gray-600 flex-1">Check who is driving, who is riding, and claim your seat.</p>
            <span className="text-blue-600 font-medium text-sm mt-4 flex items-center group-hover:translate-x-1 transition-transform">
              View Rides &rarr;
            </span>
          </div>
        </Link>

        <Link href="/flights" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition duration-200 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
              ✈️ Flights
            </h2>
            <p className="text-gray-600 flex-1">Log your arrival and departure times so we can coordinate airport pickups.</p>
            <span className="text-blue-600 font-medium text-sm mt-4 flex items-center group-hover:translate-x-1 transition-transform">
              Add Flight Info &rarr;
            </span>
          </div>
        </Link>

        <Link href="/supplies" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition duration-200 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
              🛒 Supplies
            </h2>
            <p className="text-gray-600 flex-1">See what we need, claim items to buy, and enter costs to split later.</p>
            <span className="text-blue-600 font-medium text-sm mt-4 flex items-center group-hover:translate-x-1 transition-transform">
              Shop Supplies &rarr;
            </span>
          </div>
        </Link>

        <Link href="/activities" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition duration-200 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
              🏔️ Activities
            </h2>
            <p className="text-gray-600 flex-1">Propose ideas for what we should do and vote on others' suggestions.</p>
            <span className="text-blue-600 font-medium text-sm mt-4 flex items-center group-hover:translate-x-1 transition-transform">
              Vote on Activities &rarr;
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
