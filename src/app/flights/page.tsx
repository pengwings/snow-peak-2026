'use client';

import { useState, useEffect } from 'react';
import { Flight } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/displayName';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [user, setUser] = useState<string | null>(null);

  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');


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

    fetchFlights();
  }, [router]);

  const fetchFlights = async () => {
    const res = await fetch('/api/flights');
    const data = await res.json();
    setFlights(data);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departureAirport,
        arrivalAirport,
        arrivalTime,
        departureTime,
        flightNumber,
      }),
    });

    setDepartureAirport('');
    setArrivalAirport('');
    setArrivalTime('');
    setDepartureTime('');
    setFlightNumber('');

    fetchFlights();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  // Group flights by arrival airport for easy scanning
  const grouped = flights.reduce((acc, f) => {
    const key = f.arrivalAirport || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {} as Record<string, Flight[]>);

  const hasSubmittedFlight = flights.some(f => f.user === user);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Flight Information</h1>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

      <div className="mb-8 p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-medium mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
          {hasSubmittedFlight ? 'Update Your Flight' : 'Add Your Flight'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departure Airport</label>
              <input
                type="text"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                placeholder="e.g. JFK"
                value={departureAirport}
                onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Airport</label>
              <input
                type="text"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                placeholder="e.g. PDX"
                value={arrivalAirport}
                onChange={(e) => setArrivalAirport(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Departure Time</label>
              <input
                type="datetime-local"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Arrival Time</label>
              <input
                type="datetime-local"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Flight Number (Optional)</label>
              <input
                type="text"
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                placeholder="e.g. AA1234"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              />
            </div>

          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2 text-sm tracking-widest uppercase transition-colors"
            style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
          >
            Save Flight Details
          </button>
        </form>
      </div>

      <h2 className="text-2xl font-normal mb-6" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Everyone's Flights</h2>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500 italic">No flights added yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([arrivalCode, groupFlights]) => (
            <div key={arrivalCode} className="p-6" style={{ border: '1px solid var(--border)', background: 'var(--card)', marginBottom: '1rem' }}>
              <h3 className="text-lg font-normal mb-4 pb-2 border-b" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
                Arriving at: {arrivalCode}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Passenger</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Flight #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>From</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Departs</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Arrives</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupFlights
                      .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime())
                      .map((flight) => (
                        <tr key={flight.id} className={flight.user === user ? 'bg-blue-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                            {displayName(flight.user)} {flight.user === user && '(You)'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">
                            {flight.flightNumber || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">
                            {flight.departureAirport}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {new Date(flight.departureTime).toLocaleString([], {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {new Date(flight.arrivalTime).toLocaleString([], {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
