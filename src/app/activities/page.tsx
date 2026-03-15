'use client';

import { useState, useEffect } from 'react';
import { Activity } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState('');

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

    fetchActivities();
  }, [router]);

  const fetchActivities = async () => {
    const res = await fetch('/api/activities');
    const data = await res.json();
    setActivities(data);
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'propose', name: newActivity }),
    });

    setNewActivity('');
    fetchActivities();
  };

  const handleVote = async (activityId: string) => {
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', activityId }),
    });
    fetchActivities();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  // sort by votes
  const sortedActivities = [...activities].sort((a, b) => b.votes.length - a.votes.length);

  // Consider an activity agreed upon if it has 3 or more votes (can be changed)
  const agreedThreshold = 3;
  const agreedActivities = sortedActivities.filter((a) => a.votes.length >= agreedThreshold);
  const proposedActivities = sortedActivities.filter((a) => a.votes.length < agreedThreshold);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Trip Activities</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-xl font-semibold mb-4">Propose an Activity</h2>
        <form onSubmit={handlePropose} className="flex gap-4">
          <input
            type="text"
            required
            className="flex-1 border-gray-300 rounded-md shadow-sm border px-3 py-2"
            placeholder="e.g. Hike to the waterfall"
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Propose
          </button>
        </form>
      </div>

      {agreedActivities.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-green-700">Agreed Upon Activities ({agreedThreshold}+ Votes)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {agreedActivities.map((activity) => (
              <div key={activity.id} className="border-2 border-green-200 bg-green-50 p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-green-900">{activity.name}</h3>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                    {activity.votes.length} Votes
                  </span>
                </div>
                <p className="text-sm text-green-700 mb-3">Proposed by: {activity.proposer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Proposed Activities</h2>
        {proposedActivities.length === 0 ? (
          <p className="text-gray-500 italic">No pending proposals.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {proposedActivities.map((activity) => {
              const hasVoted = activity.votes.includes(user);

              return (
                <div key={activity.id} className="border p-4 rounded-lg shadow-sm bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-bold">
                      {activity.votes.length} Votes
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Proposed by: {activity.proposer}</p>
                  
                  <button
                    onClick={() => handleVote(activity.id)}
                    className={`w-full py-2 rounded-md transition font-medium ${
                      hasVoted
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {hasVoted ? 'Remove Vote' : 'Upvote'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
