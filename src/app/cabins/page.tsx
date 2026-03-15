'use client';

import { useState, useEffect } from 'react';
import { Cabin } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function CabinsPage() {
  const [cabins, setCabins] = useState<Cabin[]>([]);
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

    fetchCabins();
  }, [router]);

  const fetchCabins = async () => {
    const res = await fetch('/api/cabins');
    const data = await res.json();
    setCabins(data);
  };

  const handleAssign = async (cabinId: string | null) => {
    await fetch('/api/cabins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cabinId }),
    });
    fetchCabins();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <h1 className="text-3xl font-bold mb-4">Snow Peak Cabin Map</h1>
      <p className="text-gray-600 mb-8">Click on a cabin on the map to join it. Current occupants are listed below the map.</p>

      {/* Interactive Map Visual */}
      <div className="bg-green-50 border-4 border-green-800 rounded-xl p-8 mb-12 shadow-inner relative overflow-hidden min-h-[400px]">
        {/* Background elements to look like a campground */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-green-200 rounded-full opacity-50 blur-xl"></div>
        <div className="absolute bottom-10 right-20 w-32 h-32 bg-green-200 rounded-full opacity-50 blur-xl"></div>
        
        <div className="flex flex-col md:flex-row justify-around items-center h-full gap-8 relative z-10">
          {cabins.map((cabin) => {
            const isOccupant = cabin.occupants.includes(user);
            const isFull = cabin.occupants.length >= cabin.capacity;

            return (
              <div 
                key={cabin.id}
                className={`relative group flex flex-col items-center cursor-pointer transform transition-all hover:scale-105 ${
                  isOccupant ? 'scale-105' : ''
                }`}
                onClick={() => {
                  if (isOccupant) handleAssign(null);
                  else if (!isFull) handleAssign(cabin.id);
                }}
              >
                {/* Cabin Graphic */}
                <div className={`w-32 h-32 relative flex flex-col items-center justify-end rounded-t-xl overflow-hidden shadow-lg border-4 ${
                  isOccupant ? 'border-blue-500 bg-blue-100' : 
                  isFull ? 'border-red-500 bg-red-100' : 
                  'border-amber-800 bg-amber-100'
                }`}>
                  {/* Roof */}
                  <div className={`absolute top-0 w-0 h-0 border-l-[64px] border-l-transparent border-r-[64px] border-r-transparent border-b-[40px] ${
                    isOccupant ? 'border-b-blue-600' :
                    isFull ? 'border-b-red-600' :
                    'border-b-amber-900'
                  }`}></div>
                  
                  {/* Door */}
                  <div className="w-8 h-12 bg-amber-950 rounded-t-md mx-auto relative z-10">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full absolute right-1 top-5"></div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute -top-3 -right-3">
                  {isOccupant && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                      Your Cabin
                    </span>
                  )}
                  {isFull && !isOccupant && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                      Full
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="mt-4 text-center bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow border border-gray-200">
                  <h3 className="font-bold text-gray-800">{cabin.name}</h3>
                  <div className="text-sm font-medium text-gray-600">
                    <span className={isFull ? 'text-red-600' : 'text-green-600'}>
                      {cabin.occupants.length}
                    </span>
                    <span> / {cabin.capacity} beds</span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {isOccupant ? 'Click to Leave' : (isFull ? 'Unavailable' : 'Click to Join')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 border-b pb-2">Occupant Details</h2>
      
      <div className="grid gap-6 md:grid-cols-3">
        {cabins.map((cabin) => {
          const isOccupant = cabin.occupants.includes(user);
          const isFull = cabin.occupants.length >= cabin.capacity;

          return (
            <div key={cabin.id} className={`border p-6 rounded-lg shadow-sm ${
              isOccupant ? 'bg-blue-50 border-blue-200' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{cabin.name}</h2>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded-md text-gray-600">
                  {cabin.occupants.length} / {cabin.capacity}
                </span>
              </div>
              
              <div className="min-h-[120px]">
                {cabin.occupants.length === 0 ? (
                  <p className="text-gray-500 italic text-sm">Empty cabin</p>
                ) : (
                  <ul className="space-y-2">
                    {cabin.occupants.map((occ, i) => (
                      <li key={i} className="flex items-center text-gray-800 font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full mr-3 ${
                          occ === user ? 'bg-blue-500' : 'bg-green-500'
                        }`}></span>
                        {occ} {occ === user && <span className="ml-1 text-blue-600 text-sm">(You)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                {isOccupant ? (
                  <button
                    onClick={() => handleAssign(null)}
                    className="w-full py-2 bg-red-100 text-red-600 font-semibold rounded-md hover:bg-red-200 transition"
                  >
                    Leave Cabin
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssign(cabin.id)}
                    disabled={isFull}
                    className={`w-full py-2 rounded-md font-semibold transition ${
                      isFull
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFull ? 'Cabin is Full' : 'Join Cabin'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
