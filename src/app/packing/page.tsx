'use client';

import { useState, useEffect } from 'react';
import { PackingItem } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle, Circle, Check, Plus } from 'lucide-react';
import { displayName } from '@/lib/displayName';

export default function PackingPage() {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [newSharedName, setNewSharedName] = useState('');
  const [newSharedAssignee, setNewSharedAssignee] = useState('');
  const [newPersonalName, setNewPersonalName] = useState('');
  const [newProvidedName, setNewProvidedName] = useState('');

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

    fetchItems();
    // Fetch user list for assignee dropdown
    fetch('/api/users')
      .then((r) => r.json())
      .then((data: { name: string }[]) => setUsers(data.map((u) => u.name)))
      .catch(() => {}); // non-fatal
  }, [router]);

  const fetchItems = async () => {
    const res = await fetch('/api/packing');
    const data = await res.json();
    setItems(data);
  };

  const createItem = async (body: Record<string, unknown>) => {
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...body }),
    });
    fetchItems();
  };

  const handleAddShared = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSharedName.trim()) return;
    await createItem({ name: newSharedName, assignee: newSharedAssignee || null });
    setNewSharedName('');
    setNewSharedAssignee('');
  };

  const handleAddPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonalName.trim()) return;
    await createItem({ name: newPersonalName, personal: true });
    setNewPersonalName('');
  };

  const handleAddProvided = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvidedName.trim()) return;
    await createItem({ name: newProvidedName, provided: true });
    setNewProvidedName('');
  };

  const togglePacked = async (item: PackingItem) => {
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: item.id, packed: !item.packed }),
    });
    fetchItems();
  };

  const handleAssigneeChange = async (item: PackingItem, assignee: string) => {
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: item.id, assignee: assignee || null }),
    });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchItems();
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const provided = items.filter((i) => i.provided);
  const personal = items.filter((i) => !i.provided && i.personal && i.user === user);
  const shared = items.filter((i) => !i.provided && !i.personal);
  const personalPacked = personal.filter((i) => i.packed).length;
  const sharedPacked = shared.filter((i) => i.packed).length;

  const packToggle = (item: PackingItem) => (
    <button
      onClick={() => togglePacked(item)}
      className={item.packed ? 'text-green-500 shrink-0' : 'text-gray-400 hover:text-green-600 shrink-0'}
      title={item.packed ? 'Packed — click to unmark' : 'Mark as packed'}
    >
      {item.packed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
    </button>
  );

  const deleteButton = (item: PackingItem) => (
    <button
      onClick={() => handleDelete(item.id)}
      className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition shrink-0"
      title="Delete"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Packing List</h1>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />

      {/* Provided at the campground */}
      <div className="mb-6 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <h2 className="font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Provided at the Campground ({provided.length})
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>No need to pack these — they&apos;ll be there waiting for you.</p>
        </div>
        {provided.length === 0 ? (
          <div className="p-6 text-center text-gray-400 italic">Nothing listed yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {provided.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
                <Check className="w-5 h-5 text-green-600 shrink-0" />
                <span className="flex-1 text-gray-900 truncate">{item.name}</span>
                {deleteButton(item)}
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={handleAddProvided}
          className="flex gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
        >
          <input
            type="text"
            className="flex-1 px-3 py-1.5 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            placeholder="Add something the campground provides"
            value={newProvidedName}
            onChange={(e) => setNewProvidedName(e.target.value)}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs tracking-widest uppercase"
            style={{ background: 'var(--accent)', color: '#f5f0e8' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </div>

      {/* Shared group items */}
      <div className="mb-6 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Shared Items ({sharedPacked}/{shared.length} packed)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Group gear everyone can see — assign who&apos;s bringing each item.</p>
        </div>
        {shared.length === 0 ? (
          <div className="p-6 text-center text-gray-400 italic">No shared items yet — add the first one below.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {shared.map((item) => (
              <li key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
                {packToggle(item)}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={item.packed ? 'text-gray-400 line-through truncate' : 'text-gray-900 truncate'}>{item.name}</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.user && (
                      <span className="text-xs text-gray-400">Added by {displayName(item.user)}</span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Brought by:</span>
                    <select
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600"
                      value={item.assignee ?? ''}
                      onChange={(e) => handleAssigneeChange(item, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u} value={u}>{displayName(u)}</option>
                      ))}
                    </select>
                    {item.assignee === user && (
                      <span className="text-xs font-medium text-blue-600">You&apos;re on it!</span>
                    )}
                  </div>
                </div>
                {deleteButton(item)}
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={handleAddShared}
          className="flex gap-2 px-4 py-3 flex-wrap"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
        >
          <input
            type="text"
            className="flex-1 min-w-40 px-3 py-1.5 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            placeholder="e.g. Marshmallow roasting sticks"
            value={newSharedName}
            onChange={(e) => setNewSharedName(e.target.value)}
          />
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-700"
            value={newSharedAssignee}
            onChange={(e) => setNewSharedAssignee(e.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u} value={u}>{displayName(u)}</option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs tracking-widest uppercase"
            style={{ background: 'var(--accent)', color: '#f5f0e8' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </div>

      {/* Personal packing list */}
      <div className="mb-6 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Your Personal List ({personalPacked}/{personal.length} packed)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Only you see this list — your own stuff to pack.</p>
        </div>
        {personal.length === 0 ? (
          <div className="p-6 text-center text-gray-400 italic">Your list is empty — add your own things below.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {personal.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition">
                {packToggle(item)}
                <span className={`flex-1 min-w-0 truncate ${item.packed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</span>
                {deleteButton(item)}
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={handleAddPersonal}
          className="flex gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
        >
          <input
            type="text"
            className="flex-1 px-3 py-1.5 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            placeholder="e.g. Toothbrush, warm socks"
            value={newPersonalName}
            onChange={(e) => setNewPersonalName(e.target.value)}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs tracking-widest uppercase"
            style={{ background: 'var(--accent)', color: '#f5f0e8' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </div>
    </div>
  );
}
