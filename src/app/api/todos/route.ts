import { NextResponse } from 'next/server';
import { db, Todo } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json(await db.getTodos());
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie?.value;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, id, text, completed, assignee } = await request.json();

  if (action === 'create') {
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });
    const newTodo: Todo = {
      id: Math.random().toString(36).substring(7),
      text,
      completed: false,
      user,
      assignee: assignee ?? null,
    };
    await db.addTodo(newTodo);
  } else if (action === 'update') {
    const todos = await db.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (text !== undefined) todo.text = text;
    if (completed !== undefined) todo.completed = completed;
    if (assignee !== undefined) todo.assignee = assignee;
    await db.updateTodo(todo);
  } else if (action === 'delete') {
    await db.removeTodo(id);
  }

  return NextResponse.json({ success: true, todos: await db.getTodos() });
}
