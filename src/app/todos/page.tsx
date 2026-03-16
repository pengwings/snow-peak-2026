'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle, Circle } from 'lucide-react';
import { displayName } from '@/lib/displayName';

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [newText, setNewText] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

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

    fetchTodos();
    // Fetch user list for assignee dropdown
    fetch('/api/users')
      .then((r) => r.json())
      .then((data: { name: string }[]) => setUsers(data.map((u) => u.name)))
      .catch(() => {}); // non-fatal
  }, [router]);

  const fetchTodos = async () => {
    const res = await fetch('/api/todos');
    const data = await res.json();
    setTodos(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        text: newText,
        assignee: newAssignee || null,
      }),
    });

    setNewText('');
    setNewAssignee('');
    fetchTodos();
  };

  const toggleComplete = async (todo: Todo) => {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: todo.id, completed: !todo.completed }),
    });
    fetchTodos();
  };

  const handleAssigneeChange = async (todo: Todo, assignee: string) => {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: todo.id, assignee: assignee || null }),
    });
    fetchTodos();
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchTodos();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Trip Todo List</h1>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />

      <div className="mb-6 p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Add a Task</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            type="text"
            required
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            placeholder="e.g. Bring extra batteries"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <div className="flex gap-3">
            <select
              className="flex-1 border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-700"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                          <option key={u} value={u}>{displayName(u)}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-6 py-2 text-sm tracking-widest uppercase"
              style={{ background: 'var(--accent)', color: '#f5f0e8' }}
            >
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="mb-6 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Pending ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <div className="p-6 text-center text-gray-400 italic">All done! 🎉</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pending.map((todo) => (
              <li key={todo.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <button onClick={() => toggleComplete(todo)} className="text-gray-400 hover:text-blue-600 shrink-0">
                  <Circle className="w-6 h-6" />
                </button>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-gray-900 truncate">{todo.text}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Added by {displayName(todo.user)}</span>
                    {users.length > 0 ? (
                      <select
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600"
                        value={todo.assignee ?? ''}
                        onChange={(e) => handleAssigneeChange(todo, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                                    <option key={u} value={u}>{displayName(u)}</option>
                        ))}
                      </select>
                    ) : todo.assignee ? (
                      <span className="text-xs text-blue-600">→ {displayName(todo.assignee)}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="overflow-hidden opacity-75" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
            <h2 className="font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Completed ({completed.length})</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {completed.map((todo) => (
              <li key={todo.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <button onClick={() => toggleComplete(todo)} className="text-green-500 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </button>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="line-through text-gray-400 truncate">{todo.text}</span>
                  {todo.assignee && (
                    <span className="text-xs text-gray-400">→ {displayName(todo.assignee)}</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="text-red-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
