'use client';

import { useState, useEffect } from 'react';
import { Flight } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/displayName';

function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '—';

  // Handle both "YYYY-MM-DDTHH:mm" and "YYYY-MM-DD HH:mm" formats
  const normalized = dateTimeStr.replace(' ', 'T');
  const parts = normalized.split('T');

  if (parts.length < 2) return dateTimeStr; // Return as-is if format is unexpected

  const [datePart, timePart] = parts;
  const [year, month, day] = datePart.split('-');
  const timeComponents = timePart.split(':');

  if (timeComponents.length < 2) return dateTimeStr;

  const [hours24, minutes] = timeComponents;

  let hours = parseInt(hours24, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12

  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [user, setUser] = useState<string | null>(null);

  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightType, setFlightType] = useState<'arriving' | 'departing'>('arriving');


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

  const userArrivingFlight = flights.find(f => f.user === user && f.flightType === 'arriving');
  const userDepartingFlight = flights.find(f => f.user === user && f.flightType === 'departing');

  // Populate form when flight type changes
  useEffect(() => {
    const existingFlight = flightType === 'arriving' ? userArrivingFlight : userDepartingFlight;

    if (existingFlight) {
      setDepartureAirport(existingFlight.departureAirport);
      setArrivalAirport(existingFlight.arrivalAirport);
      // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
      setArrivalTime(existingFlight.arrivalTime.substring(0, 16));
      setDepartureTime(existingFlight.departureTime.substring(0, 16));
      setFlightNumber(existingFlight.flightNumber || '');
    } else {
      // Clear form if no existing flight
      setDepartureAirport('');
      setArrivalAirport('');
      setArrivalTime('');
      setDepartureTime('');
      setFlightNumber('');
    }
  }, [flightType, userArrivingFlight, userDepartingFlight]);

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
        flightType,
      }),
    });

    setDepartureAirport('');
    setArrivalAirport('');
    setArrivalTime('');
    setDepartureTime('');
    setFlightNumber('');
    setFlightType('arriving');

    fetchFlights();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Flight Information</h1>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

      <div className="mb-8 p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-medium mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
          Add or Update Your Flight
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Flight Type</label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="flightType"
                  value="arriving"
                  checked={flightType === 'arriving'}
                  onChange={(e) => setFlightType(e.target.value as 'arriving' | 'departing')}
                  className="mr-2"
                />
                <span className="text-gray-700">Arriving {userArrivingFlight && '✓'}</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="flightType"
                  value="departing"
                  checked={flightType === 'departing'}
                  onChange={(e) => setFlightType(e.target.value as 'arriving' | 'departing')}
                  className="mr-2"
                />
                <span className="text-gray-700">Departing {userDepartingFlight && '✓'}</span>
              </label>
            </div>
          </div>
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

      {flights.length === 0 ? (
        <p className="text-gray-500 italic">No flights added yet.</p>
      ) : (
        <div className="space-y-8">
          {/* Arriving Flights Section */}
          <div>
            <h3 className="text-xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Arriving Flights</h3>
            {(() => {
              const arrivingFlights = flights.filter(f => f.flightType === 'arriving');
              const arrivingGrouped = arrivingFlights.reduce((acc, f) => {
                const key = f.arrivalAirport || 'Unknown';
                if (!acc[key]) acc[key] = [];
                acc[key].push(f);
                return acc;
              }, {} as Record<string, Flight[]>);

              return Object.keys(arrivingGrouped).length === 0 ? (
                <p className="text-gray-500 italic ml-4">No arriving flights yet.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(arrivingGrouped).map(([arrivalCode, groupFlights]) => (
                    <div key={arrivalCode} className="p-6" style={{ border: '1px solid var(--border)', background: 'var(--card)', marginBottom: '1rem' }}>
                      <h4 className="text-lg font-normal mb-4 pb-2 border-b" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
                        Arriving at: {arrivalCode}
                      </h4>
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
                            {formatDateTime(flight.departureTime)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {formatDateTime(flight.arrivalTime)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Departing Flights Section */}
          <div>
            <h3 className="text-xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Departing Flights</h3>
            {(() => {
              const departingFlights = flights.filter(f => f.flightType === 'departing');
              const departingGrouped = departingFlights.reduce((acc, f) => {
                const key = f.departureAirport || 'Unknown';
                if (!acc[key]) acc[key] = [];
                acc[key].push(f);
                return acc;
              }, {} as Record<string, Flight[]>);

              return Object.keys(departingGrouped).length === 0 ? (
                <p className="text-gray-500 italic ml-4">No departing flights yet.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(departingGrouped).map(([departureCode, groupFlights]) => (
                    <div key={departureCode} className="p-6" style={{ border: '1px solid var(--border)', background: 'var(--card)', marginBottom: '1rem' }}>
                      <h4 className="text-lg font-normal mb-4 pb-2 border-b" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
                        Departing from: {departureCode}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Passenger</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Flight #</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>To</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Departs</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Arrives</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {groupFlights
                              .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime())
                              .map((flight) => (
                                <tr key={flight.id} className={flight.user === user ? 'bg-blue-50' : ''}>
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                                    {displayName(flight.user)} {flight.user === user && '(You)'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">
                                    {flight.flightNumber || '—'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">
                                    {flight.arrivalAirport}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                    {formatDateTime(flight.departureTime)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                    {formatDateTime(flight.arrivalTime)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
