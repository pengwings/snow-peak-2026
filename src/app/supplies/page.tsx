'use client';

import { useState, useEffect } from 'react';
import { Supply } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [payingAmount, setPayingAmount] = useState<Record<string, string>>({});

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
    fetchSupplies();
  }, [router]);

  const fetchSupplies = async () => {
    const res = await fetch('/api/supplies');
    const data = await res.json();
    setSupplies(data);
  };

  const handleAction = async (supplyId: string, action: string, amountPaid?: string) => {
    await fetch('/api/supplies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplyId, action, amountPaid }),
    });
    fetchSupplies();
  };

  if (!user) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const totalSpent = supplies.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Supplies</h1>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

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
            {supplies.map((supply, i) => {
              const isClaimedByMe = supply.buyer === user;
              const isClaimedByOther = supply.buyer && supply.buyer !== user;
              return (
                <tr key={supply.id} style={{ borderBottom: i < supplies.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--card)' }}>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{supply.name}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {supply.buyer ? (
                      <span className="px-2 py-0.5 text-xs rounded" style={{ background: isClaimedByMe ? '#d4edda' : 'var(--background)', color: isClaimedByMe ? '#2d6a4f' : 'var(--muted)', border: '1px solid var(--border)' }}>
                        {supply.buyer} {isClaimedByMe && '(You)'}
                      </span>
                    ) : (
                      <span className="italic" style={{ color: 'var(--muted)' }}>Unclaimed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {isClaimedByMe ? (
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--muted)' }}>$</span>
                        <input
                          type="number" step="0.01" min="0"
                          className="w-24 px-2 py-1 text-sm focus:outline-none"
                          style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                          value={payingAmount[supply.id] ?? (supply.amountPaid || '')}
                          onChange={(e) => setPayingAmount({ ...payingAmount, [supply.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handleAction(supply.id, 'pay', payingAmount[supply.id])}
                          className="text-xs px-2 py-1"
                          style={{ background: 'var(--accent)', color: '#f5f0e8' }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span>{supply.amountPaid ? `$${supply.amountPaid.toFixed(2)}` : '—'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {!supply.buyer && (
                      <button onClick={() => handleAction(supply.id, 'claim')} className="text-xs uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                        Claim
                      </button>
                    )}
                    {isClaimedByMe && (
                      <button onClick={() => handleAction(supply.id, 'unclaim')} className="text-xs uppercase tracking-wide" style={{ color: '#a33' }}>
                        Unclaim
                      </button>
                    )}
                    {isClaimedByOther && (
                      <span className="text-xs italic" style={{ color: 'var(--muted)' }}>Claimed</span>
                    )}
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
