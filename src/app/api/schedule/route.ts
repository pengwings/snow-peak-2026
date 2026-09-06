import { NextResponse } from 'next/server';
import { db, ScheduleItem } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json(await db.getScheduleItems());
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: 'Only a trip admin can change the schedule' }, { status: 403 });
  }

  const { action, id, day, time, endTime, title, description } = await request.json();

  const fields = {
    time: time ?? '',
    // an end time only applies to timed events
    endTime: time ? (endTime ?? '') : '',
    title,
    description: description ?? '',
  };
  if (fields.endTime && fields.endTime <= fields.time) {
    return NextResponse.json({ error: 'End time must be after the start time' }, { status: 400 });
  }

  if (action === 'create') {
    if (!day || !title) return NextResponse.json({ error: 'Day and title are required' }, { status: 400 });

    const newItem: ScheduleItem = {
      id: Math.random().toString(36).substring(7),
      day,
      ...fields,
    };
    await db.addScheduleItem(newItem);
  } else if (action === 'update') {
    if (!id || !day || !title) return NextResponse.json({ error: 'Id, day and title are required' }, { status: 400 });

    await db.updateScheduleItem({ id, day, ...fields });
  } else if (action === 'delete') {
    if (!id) return NextResponse.json({ error: 'Id is required' }, { status: 400 });

    await db.removeScheduleItem(id);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, items: await db.getScheduleItems() });
}
