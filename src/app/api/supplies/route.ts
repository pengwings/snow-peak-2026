import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(db.supplies);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { supplyId, action, amountPaid } = await request.json();

  const supply = db.supplies.find((s) => s.id === supplyId);
  if (!supply) {
    return NextResponse.json({ error: 'Supply not found' }, { status: 404 });
  }

  if (action === 'claim') {
    if (supply.buyer && supply.buyer !== user) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }
    supply.buyer = user;
    db.updateSupply(supply);
  } else if (action === 'unclaim') {
    if (supply.buyer === user) {
      supply.buyer = null;
      supply.amountPaid = null;
      db.updateSupply(supply);
    }
  } else if (action === 'pay') {
    if (supply.buyer === user) {
      supply.amountPaid = parseFloat(amountPaid) || 0;
      db.updateSupply(supply);
    }
  }

  return NextResponse.json({ success: true, supplies: db.supplies });
}
