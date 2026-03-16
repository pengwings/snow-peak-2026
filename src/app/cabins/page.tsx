'use client';

import { useState, useEffect } from 'react';
import { Cabin } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/displayName';

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
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <h1 className="text-4xl font-normal mb-1" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Snow Peak Cabin Map</h1>
      <div className="w-8 h-px mb-4" style={{ background: 'var(--border)' }} />
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Click on a cabin to join it. Occupants are listed below.</p>

      {/* Interactive Map Visual */}
      <div className="bg-[#f2ece3] rounded-xl p-0 mb-12 shadow-inner relative overflow-hidden h-[600px] w-full max-w-[500px] mx-auto border-2 border-stone-300">
        
        {/* Drawn Path Background */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M 250 0 Q 230 150 250 300 T 220 600" className="stroke-stone-300" strokeWidth="30" fill="none" strokeLinecap="round" />
          <path d="M 250 0 Q 230 150 250 300 T 220 600" className="stroke-[#eae4db]" strokeWidth="20" fill="none" strokeLinecap="round" />
          
          {/* Some simple grass decorations */}
          <path d="M 50 100 Q 60 80 70 100" stroke="#dcd3c5" strokeWidth="2" fill="none" />
          <path d="M 400 400 Q 410 380 420 400" stroke="#dcd3c5" strokeWidth="2" fill="none" />
          <path d="M 100 500 Q 110 480 120 500" stroke="#dcd3c5" strokeWidth="2" fill="none" />
        </svg>

        <div className="absolute inset-0 z-10 w-full h-full">
          {cabins.map((cabin) => {
            const isOccupant = cabin.occupants.includes(user);
            const isFull = cabin.occupants.length >= cabin.capacity;
            
            // Extract cabin number to match with layout
            const match = cabin.name.match(/\d+/);
            const cabinNum = match ? match[0] : null;
            
            // Layout data based on the provided image
            const mapLayout: Record<string, { top: string; left: string; available: boolean }> = {
              '9': { top: '22%', left: '38%', available: true },
              '10': { top: '38%', left: '72%', available: false },
              '11': { top: '42%', left: '32%', available: true },
              '12': { top: '58%', left: '62%', available: true },
              '13': { top: '62%', left: '26%', available: true },
              '14': { top: '80%', left: '55%', available: true },
            };

            const layout = cabinNum && mapLayout[cabinNum];
            // If cabin isn't in layout (or we shouldn't show it here), hide it
            if (!layout) return null;

            // Optional: dim or disable interaction on cabins not strictly "selectable" per user request
            // Note: The user said 9, 11, 12, 13, 14 were rented. 10 is on the map but they didn't explicitly mention renting it.
            const selectable = layout.available;

            return (
              <div 
                key={cabin.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group
                  ${selectable ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-60 cursor-not-allowed'}
                  ${isOccupant ? 'z-20 scale-105' : 'z-10'}
                `}
                style={{ top: layout.top, left: layout.left }}
                onClick={() => {
                  if (!selectable) return;
                  if (isOccupant) handleAssign(null);
                  else if (!isFull) handleAssign(cabin.id);
                }}
              >
                {/* Square Box like in image */}
                <div className={`w-14 h-14 relative flex items-center justify-center rounded-md rotate-[-2deg] shadow-sm
                  ${isOccupant ? 'bg-[#5c8a40] text-white border-2 border-green-700' :
                    isFull ? 'bg-[#a3534a] text-white' :
                    selectable ? 'bg-[#aeb35b] text-[#f2ece3]' : 'bg-[#c5c1b6] text-gray-500'
                  }
                `}>
                  <div className="font-bold text-xl drop-shadow-sm leading-none pt-1">
                    {cabinNum && cabinNum.padStart(2, '0')}
                  </div>
                  
                  {/* Status Indicator */}
                  {isOccupant && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                  {isFull && !isOccupant && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                      <div className="w-2 h-0.5 bg-white"></div>
                    </div>
                  )}
                </div>

                {/* Tooltip on hover */}
                {selectable && (
                  <div className="absolute top-full mt-2 w-32 bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    <div className="text-xs font-bold text-gray-800 text-center">{cabin.name}</div>
                    <div className="text-[10px] text-center text-gray-500">
                      {cabin.occupants.length} / {cabin.capacity} full
                    </div>
                    <div className="text-[10px] font-bold text-center mt-0.5 uppercase tracking-wider">
                      {isOccupant ? <span className="text-blue-600">Click to leave</span> :
                       isFull ? <span className="text-red-500">Full</span> :
                       <span className="text-green-600">Click to join</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="text-2xl font-normal mb-6" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Occupant Details</h2>
      
      <div className="grid gap-6 md:grid-cols-3">
        {cabins.map((cabin) => {
          const isOccupant = cabin.occupants.includes(user);
          const isFull = cabin.occupants.length >= cabin.capacity;

          return (
            <div key={cabin.id} className={`p-6 ${
              isOccupant ? 'bg-[#edf7f0]' : ''
            }`} style={{ border: '1px solid var(--border)', background: isOccupant ? '#edf7f0' : 'var(--card)' }}>
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
                        {displayName(occ)} {occ === user && <span className="ml-1 text-blue-600 text-sm">(You)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                {isOccupant ? (
                  <button
                    onClick={() => handleAssign(null)}
                    className="w-full py-2 text-sm transition"
                    style={{ background: '#fde8e8', color: '#a33', border: '1px solid #f0c0c0' }}
                  >
                    Leave Cabin
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssign(cabin.id)}
                    disabled={isFull}
                    className="w-full py-2 text-sm transition"
                    style={isFull
                      ? { background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'not-allowed' }
                      : { background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }
                    }
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
