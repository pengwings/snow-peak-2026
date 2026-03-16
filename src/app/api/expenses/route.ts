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

  const { expenseId, action, amountPaid, name, buyer } = await request.json();

  if (action === 'add') {
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Expense name is required' }, { status: 400 });
    }
    const newExpense = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      buyer: buyer || null,
      amountPaid: amountPaid || null,
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

  if (action === 'claim') {
    if (expense.buyer && expense.buyer !== user) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }
    expense.buyer = user;
    await db.updateExpense(expense);
  } else if (action === 'unclaim') {
    if (expense.buyer === user) {
      expense.buyer = null;
      expense.amountPaid = null;
      await db.updateExpense(expense);
    }
  } else if (action === 'pay') {
    if (expense.buyer === user) {
      expense.amountPaid = parseFloat(amountPaid) || 0;
      await db.updateExpense(expense);
    }
  }

  return NextResponse.json({ success: true, expenses: await db.getExpenses() });
}
