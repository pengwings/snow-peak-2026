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

  const handleAmountChange = (supplyId: string, value: string) => {
    setPayingAmount({ ...payingAmount, [supplyId]: value });
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const totalSpent = supplies.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Supplies & Cost Splitting</h1>

      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Cost Summary</h2>
        <p className="text-blue-800 text-2xl font-bold">${totalSpent.toFixed(2)} Total Spent</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {supplies.map((supply) => {
              const isClaimedByMe = supply.buyer === user;
              const isClaimedByOther = supply.buyer && supply.buyer !== user;

              return (
                <tr key={supply.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {supply.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supply.buyer ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isClaimedByMe ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {supply.buyer} {isClaimedByMe && '(You)'}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Unclaimed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isClaimedByMe ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 border-gray-300 rounded-md shadow-sm border px-2 py-1 text-sm"
                          value={payingAmount[supply.id] ?? (supply.amountPaid || '')}
                          onChange={(e) => handleAmountChange(supply.id, e.target.value)}
                        />
                        <button
                          onClick={() => handleAction(supply.id, 'pay', payingAmount[supply.id])}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span>{supply.amountPaid ? `$${supply.amountPaid.toFixed(2)}` : '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!supply.buyer && (
                      <button
                        onClick={() => handleAction(supply.id, 'claim')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Claim
                      </button>
                    )}
                    {isClaimedByMe && (
                      <button
                        onClick={() => handleAction(supply.id, 'unclaim')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Unclaim
                      </button>
                    )}
                    {isClaimedByOther && (
                      <span className="text-gray-400">Claimed</span>
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
