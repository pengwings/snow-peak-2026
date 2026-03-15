import { NextResponse } from 'next/server';
import { db, Activity } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(db.activities);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, activityId, action } = await request.json();

  if (action === 'propose') {
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    
    const newActivity: Activity = {
      id: Math.random().toString(36).substring(7),
      name,
      proposer: user,
      votes: [user], // proposer auto-votes
    };
    db.addActivity(newActivity);
  } else if (action === 'vote') {
    const activity = db.activities.find((a) => a.id === activityId);
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });

    const hasVoted = activity.votes.includes(user);
    if (hasVoted) {
      // unvote
      activity.votes = activity.votes.filter((v) => v !== user);
    } else {
      // vote
      activity.votes.push(user);
    }
    db.updateActivity(activity);
  }

  return NextResponse.json({ success: true, activities: db.activities });
}
