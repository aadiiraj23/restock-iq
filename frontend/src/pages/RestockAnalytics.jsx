import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, DollarSign } from 'lucide-react';
import { restock } from '../api';

export default function RestockAnalytics() {
  const [data, setData] = useState(null);
  const [budget, setBudget] = useState(150);

  useEffect(() => {
    restock.getAnalytics().then(r => {
      setData(r.data);
      setBudget(r.data.monthlyBudget || 150);
    });
  }, []);

  const saveBudget = async () => {
    try {
      await restock.setBudget(budget);
      const { data: updated } = await restock.getAnalytics();
      setData(updated);
    } catch {
      setData(prev => ({ ...prev, monthlyBudget: budget, overBudget: prev?.projectedSpend > budget }));
    }
  };

  if (!data) return <div className="text-center py-16">Loading analytics...</div>;

  const categories = Object.entries(data.categorySpend || {});
  const maxSpend = Math.max(...categories.map(([, v]) => v), 1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/restock" className="amazon-link text-sm flex items-center gap-1 mb-4"><ChevronLeft size={14} /> Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6">ReStock Analytics</h1>

      {data.overBudget && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <div>
            <p className="font-bold text-red-700">Over budget warning</p>
            <p className="text-sm text-red-600">Projected spend (${data.projectedSpend?.toFixed(2)}) exceeds your monthly budget</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-5 text-center">
          <DollarSign className="mx-auto text-amazon-orange mb-2" size={24} />
          <p className="text-2xl font-bold">${data.projectedSpend?.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Projected Spend (14 days)</p>
        </div>
        <div className="bg-white border rounded-lg p-5 text-center">
          <p className="text-2xl font-bold">{data.dueSoonCount}</p>
          <p className="text-xs text-gray-500">Items Due Soon</p>
        </div>
        <div className="bg-white border rounded-lg p-5 text-center">
          <p className="text-2xl font-bold">${data.monthlyBudget}</p>
          <p className="text-xs text-gray-500">Monthly Budget</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-5 mb-6">
        <h2 className="font-bold mb-4">Spend by Category</h2>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm">No data yet</p>
        ) : categories.map(([cat, spend]) => (
          <div key={cat} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize">{cat.replace('_', ' ')}</span>
              <span className="font-medium">${spend.toFixed(2)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amazon-orange rounded-full" style={{ width: `${(spend / maxSpend) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-5">
        <h2 className="font-bold mb-3">Set Monthly Budget</h2>
        <div className="flex gap-3">
          <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} className="border rounded px-3 py-2 flex-1" />
          <button onClick={saveBudget} className="amazon-btn-primary px-6">Save</button>
        </div>
      </div>
    </div>
  );
}
