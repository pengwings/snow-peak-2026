'use client';

import { useState, useEffect } from 'react';
import { Expense } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [editingExpense, setEditingExpense] = useState<Record<string, { name?: string; buyer?: string; amountPaid?: string }>>({});
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseBuyer, setNewExpenseBuyer] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

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
    fetchExpenses();
    fetchUsers();
  }, [router]);

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    const data = await res.json();
    setExpenses(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.map((u: { name: string }) => u.name));
  };

  const handleUpdate = async (expenseId: string, field: 'name' | 'buyer' | 'amountPaid') => {
    const value = editingExpense[expenseId]?.[field];
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expenseId,
        action: 'update',
        [field]: value
      }),
    });
    setEditingExpense({ ...editingExpense, [expenseId]: { ...editingExpense[expenseId], [field]: undefined } });
    fetchExpenses();
  };

  const handleDelete = async (expenseId: string) => {
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId, action: 'delete' }),
    });
    fetchExpenses();
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newExpenseName.trim()) return;

    const buyer = newExpenseBuyer.trim() || null;
    const amountPaid = newExpenseAmount ? parseFloat(newExpenseAmount) : null;

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name: newExpenseName, buyer, amountPaid }),
    });
    setNewExpenseName('');
    setNewExpenseBuyer('');
    setNewExpenseAmount('');
    fetchExpenses();
  };

  if (!user) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const totalSpent = expenses.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Expenses</h1>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

      {/* Add New Expense Form */}
      <div className="mb-8 p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-medium mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
          Add New Expense
        </h2>
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                required
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                placeholder="e.g. Paper towels"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer</label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                value={newExpenseBuyer}
                onChange={(e) => setNewExpenseBuyer(e.target.value)}
              >
                <option value="">Select buyer...</option>
                {users.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border-gray-300 rounded-md shadow-sm border px-3 py-2 text-gray-900"
                placeholder="0.00"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2 text-sm tracking-widest uppercase transition-colors"
            style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Summary */}
      <div className="mb-8 px-6 py-4 flex justify-between items-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <span className="text-sm tracking-wide uppercase" style={{ color: 'var(--muted)' }}>Total Spent</span>
        <span className="text-2xl font-medium" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>${totalSpent.toFixed(2)}</span>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)' }}>
        <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Buyer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense, i) => {
              const isEditingName = editingExpense[expense.id]?.name !== undefined;
              const isEditingBuyer = editingExpense[expense.id]?.buyer !== undefined;
              const isEditingAmount = editingExpense[expense.id]?.amountPaid !== undefined;

              return (
                <tr key={expense.id} style={{ borderBottom: i < expenses.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--card)' }}>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 text-sm focus:outline-none"
                          style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                          value={editingExpense[expense.id]?.name ?? ''}
                          onChange={(e) => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], name: e.target.value } })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(expense.id, 'name');
                            if (e.key === 'Escape') setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], name: undefined } });
                          }}
                          onBlur={() => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], name: undefined } })}
                          autoFocus
                        />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleUpdate(expense.id, 'name')}
                          className="text-xs px-2 py-1"
                          style={{ background: 'var(--accent)', color: '#f5f0e8' }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], name: expense.name } })}
                        className="cursor-pointer hover:underline"
                      >
                        {expense.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {isEditingBuyer ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="px-2 py-1 text-sm focus:outline-none"
                          style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                          value={editingExpense[expense.id]?.buyer ?? ''}
                          onChange={(e) => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], buyer: e.target.value } })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(expense.id, 'buyer');
                            if (e.key === 'Escape') setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], buyer: undefined } });
                          }}
                          onBlur={() => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], buyer: undefined } })}
                          autoFocus
                        >
                          <option value="">Select buyer...</option>
                          {users.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleUpdate(expense.id, 'buyer')}
                          className="text-xs px-2 py-1"
                          style={{ background: 'var(--accent)', color: '#f5f0e8' }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], buyer: expense.buyer || '' } })}
                        className="cursor-pointer hover:underline"
                      >
                        {expense.buyer || <span className="italic" style={{ color: 'var(--muted)' }}>Click to add</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {isEditingAmount ? (
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--muted)' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 px-2 py-1 text-sm focus:outline-none"
                          style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                          value={editingExpense[expense.id]?.amountPaid ?? ''}
                          onChange={(e) => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], amountPaid: e.target.value } })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(expense.id, 'amountPaid');
                            if (e.key === 'Escape') setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], amountPaid: undefined } });
                          }}
                          onBlur={() => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], amountPaid: undefined } })}
                          placeholder="0.00"
                          autoFocus
                        />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleUpdate(expense.id, 'amountPaid')}
                          className="text-xs px-2 py-1"
                          style={{ background: 'var(--accent)', color: '#f5f0e8' }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => setEditingExpense({ ...editingExpense, [expense.id]: { ...editingExpense[expense.id], amountPaid: expense.amountPaid?.toString() || '' } })}
                        className="cursor-pointer hover:underline"
                      >
                        {expense.amountPaid ? `$${expense.amountPaid.toFixed(2)}` : <span className="italic" style={{ color: 'var(--muted)' }}>Click to add</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-xs uppercase tracking-wide"
                      style={{ color: '#a33' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
