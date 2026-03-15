'use client';

import { useState, useEffect } from 'react';
import { Flight } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [user, setUser] = useState<string | null>(null);
  
  const [airport, setAirport] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  
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
      body: JSON.stringify({ airport, arrivalTime, departureTime }),
    });
    
    // reset form and fetch
    setAirport('');
    setArrivalTime('');
    setDepartureTime('');
    fetchFlights();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  // Group flights by airport
  const groupedFlights = flights.reduce((acc, flight) => {
    if (!acc[flight.airport]) {
      acc[flight.airport] = [];
    }
    acc[flight.airport].push(flight);
    return acc;
  }, {} as Record<string, Flight[]>);

  const hasSubmittedFlight = flights.some(f => f.user === user);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Flight Information</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {hasSubmittedFlight ? 'Update Your Flight' : 'Add Your Flight'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Airport Code</label>
              <input
                type="text"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2"
                placeholder="e.g. PDX"
                value={airport}
                onChange={(e) => setAirport(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
              <input
                type="datetime-local"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departure Time</label>
              <input
                type="datetime-local"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Save Flight Details
          </button>
        </form>
      </div>

      <h2 className="text-2xl font-bold mb-6">Everyone's Flights</h2>
      
      {Object.keys(groupedFlights).length === 0 ? (
        <p className="text-gray-500 italic">No flights added yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFlights).map(([airportCode, airportFlights]) => (
            <div key={airportCode} className="border p-6 rounded-lg shadow-sm bg-white">
              <h3 className="text-xl font-semibold mb-4 text-blue-800 border-b pb-2">
                Airport: {airportCode}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passenger</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arriving</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {airportFlights
                      // Sort by arrival time
                      .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime())
                      .map((flight) => (
                        <tr key={flight.id} className={flight.user === user ? 'bg-blue-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                            {flight.user} {flight.user === user && '(You)'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {new Date(flight.arrivalTime).toLocaleString([], {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {new Date(flight.departureTime).toLocaleString([], {
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
