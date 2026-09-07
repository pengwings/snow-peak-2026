'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/displayName';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
          setIsAdmin(data.isAdmin);
        }
      });

    fetch('/api/activities')
      .then((res) => res.json())
      .then(setActivities);
  }, [router]);

  const fetchActivities = async () => {
    const res = await fetch('/api/activities');
    const data = await res.json();
    setActivities(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        editingId
          ? { action: 'edit', activityId: editingId, name: newName, description: newDescription }
          : { action: 'propose', name: newName, description: newDescription }
      ),
    });

    setEditingId(null);
    setNewName('');
    setNewDescription('');
    fetchActivities();
  };

  const handleEditClick = (activity: Activity) => {
    setEditingId(activity.id);
    setNewName(activity.name);
    setNewDescription(activity.description);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewDescription('');
  };

  const handlePromote = async (activityId: string) => {
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'promote', activityId }),
    });
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

  const adminButtons = (activity: Activity) =>
    isAdmin && (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => handleEditClick(activity)}
          className="flex-1 py-1.5 text-xs tracking-widest uppercase"
          style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          Edit
        </button>
        <button
          onClick={() => handlePromote(activity.id)}
          className="flex-1 py-1.5 text-xs tracking-widest uppercase"
          style={
            activity.promoted
              ? { background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted)' }
              : { background: 'var(--accent)', border: '1px solid var(--accent)', color: '#f5f0e8' }
          }
        >
          {activity.promoted ? 'Unpromote' : 'Promote'}
        </button>
      </div>
    );

  const sortedActivities = [...activities].sort((a, b) => b.votes.length - a.votes.length);
  const agreedThreshold = 3;
  const promotedActivities = sortedActivities.filter((a) => a.promoted);
  const agreedActivities = sortedActivities.filter((a) => !a.promoted && a.votes.length >= agreedThreshold);
  const proposedActivities = sortedActivities.filter((a) => !a.promoted && a.votes.length < agreedThreshold);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Trip Activities</h1>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

      <div ref={formRef} className="mb-8 p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">{editingId ? 'Edit Activity' : 'Propose an Activity'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 text-gray-900 placeholder-gray-500"
            placeholder="Activity name, e.g. Hike to the waterfall"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <textarea
            className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 resize-none text-gray-900 placeholder-gray-500"
            placeholder="Description (optional) — details, meeting time, gear needed…"
            rows={2}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 text-sm tracking-widest uppercase"
              style={{ background: 'var(--accent)', color: '#f5f0e8' }}>
              {editingId ? 'Save' : 'Propose'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 text-sm tracking-widest uppercase"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {promotedActivities.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--accent)' }}>Official Plan</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {promotedActivities.map((activity) => (
              <div key={activity.id} className="p-4" style={{ border: '2px solid var(--accent)', background: 'var(--card)' }}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{activity.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#f5f0e8' }}>
                    ★ Promoted
                  </span>
                </div>
                {activity.description && (
                  <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{activity.description}</p>
                )}
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Proposed by: {displayName(activity.proposer)} · {activity.votes.length} votes
                </p>
                {adminButtons(activity)}
              </div>
            ))}
          </div>
        </div>
      )}

      {agreedActivities.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: '#2d6a4f' }}>Agreed Upon ({agreedThreshold}+ Votes)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {agreedActivities.map((activity) => (
              <div key={activity.id} className="p-4" style={{ border: '2px solid #b7d8c0', background: '#edf7f0' }}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold text-green-900">{activity.name}</h3>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                    {activity.votes.length} Votes
                  </span>
                </div>
                {activity.description && (
                  <p className="text-sm text-green-800 mb-2">{activity.description}</p>
                )}
                <p className="text-xs text-green-600">Proposed by: {displayName(activity.proposer)}</p>
                {adminButtons(activity)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Proposed Activities</h2>
        {proposedActivities.length === 0 ? (
          <p className="text-gray-500 italic">No pending proposals.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {proposedActivities.map((activity) => {
              const hasVoted = activity.votes.includes(user);

              return (
                <div key={activity.id} className="p-4" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-bold">
                      {activity.votes.length} Votes
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mb-4">Proposed by: {displayName(activity.proposer)}</p>

                  <button
                    onClick={() => handleVote(activity.id)}
                    className={`w-full py-2 text-sm transition ${
                      hasVoted ? 'bg-[#dff0e8] text-[#2d6a4f]' : ''
                    }`}
                    style={!hasVoted ? { background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } : { border: '1px solid #b7d8c0' }}
                  >
                    {hasVoted ? 'Remove Vote' : 'Upvote'}
                  </button>
                  {adminButtons(activity)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

