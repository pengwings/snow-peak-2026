import { NextResponse } from 'next/server';
import { db, Activity } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json(await db.getActivities());
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = sessionUser.name;

  const { name, description, activityId, action } = await request.json();

  if (action === 'propose') {
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const newActivity: Activity = {
      id: Math.random().toString(36).substring(7),
      name,
      description: description ?? '',
      proposer: user,
      votes: [user], // proposer auto-votes
      promoted: false,
    };
    await db.addActivity(newActivity);
  } else if (action === 'vote') {
    const activities = await db.getActivities();
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });

    const hasVoted = activity.votes.includes(user);
    if (hasVoted) {
      // unvote
      activity.votes = activity.votes.filter((v) => v !== user);
    } else {
      // vote
      activity.votes.push(user);
    }
    await db.updateActivity(activity);
  } else if (action === 'edit') {
    if (!sessionUser.isAdmin) {
      return NextResponse.json({ error: 'Only a trip admin can edit activities' }, { status: 403 });
    }
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const activities = await db.getActivities();
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });

    activity.name = name;
    activity.description = description ?? '';
    await db.updateActivity(activity);
  } else if (action === 'promote') {
    if (!sessionUser.isAdmin) {
      return NextResponse.json({ error: 'Only a trip admin can promote activities' }, { status: 403 });
    }

    const activities = await db.getActivities();
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });

    activity.promoted = !activity.promoted;
    await db.updateActivity(activity);
  }

  return NextResponse.json({ success: true, activities: await db.getActivities() });
}
