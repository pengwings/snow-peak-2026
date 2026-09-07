import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(await db.getExpenses());
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { expenseId, action, amountPaid, name, buyer, participants } = await request.json();

  const cleanParticipants = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : [];

  if (action === 'add') {
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Expense name is required' }, { status: 400 });
    }
    const newExpense = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      buyer: buyer || null,
      amountPaid: amountPaid || null,
      participants: cleanParticipants(participants),
    };
    await db.addExpense(newExpense);
    return NextResponse.json({ success: true, expenses: await db.getExpenses() });
  }

  const expenses = await db.getExpenses();
  const expense = expenses.find((s) => s.id === expenseId);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  if (action === 'delete') {
    await db.removeExpense(expenseId);
    return NextResponse.json({ success: true, expenses: await db.getExpenses() });
  }

  if (action === 'update') {
    if (name !== undefined) expense.name = name.trim();
    if (buyer !== undefined) expense.buyer = buyer || null;
    if (amountPaid !== undefined) expense.amountPaid = amountPaid ? parseFloat(amountPaid) : null;
    if (participants !== undefined) expense.participants = cleanParticipants(participants);
    await db.updateExpense(expense);
  }

  return NextResponse.json({ success: true, expenses: await db.getExpenses() });
}
