'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle, Circle } from 'lucide-react';

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

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
      body: JSON.stringify({ action: 'create', text: newText }),
    });

    setNewText('');
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

  const handleDelete = async (id: string) => {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchTodos();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Trip Todo List</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            required
            className="flex-1 border-gray-300 rounded-md shadow-sm border px-3 py-2"
            placeholder="e.g. Bring extra batteries"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <button
             type="submit"
             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {todos.length === 0 ? (
          <div className="p-6 text-center text-gray-500 italic">No todos yet. Add one above!</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {todos.map((todo) => (
              <li key={todo.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-4 flex-1">
                  <button onClick={() => toggleComplete(todo)} className="text-gray-400 hover:text-blue-600">
                    {todo.completed ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-lg transition-all ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {todo.text}
                    </span>
                    <span className="text-xs text-gray-500">Added by: {todo.user}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
