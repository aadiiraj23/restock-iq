import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, DollarSign, TrendingUp, BarChart3, PieChart, Target, Sparkles } from 'lucide-react';
import { useRestockStore } from '../store';

// Simulated monthly history (in production this would come from order aggregation)
const MONTHLY_HISTORY = [
  { month: 'Jan', personal_care: 28, kitchen: 15, cleaning: 12 },
  { month: 'Feb', personal_care: 22, kitchen: 18, cleaning: 8 },
  { month: 'Mar', personal_care: 35, kitchen: 12, cleaning: 15 },
  { month: 'Apr', personal_care: 19, kitchen: 22, cleaning: 10 },
  { month: 'May', personal_care: 30, kitchen: 16, cleaning: 14 },
  { month: 'Jun', personal_care: 24, kitchen: 20, cleaning: 11 },
];

export default function RestockAnalytics() {
  const { items, budget, setBudget, getMetrics, getAlerts } = useRestockStore();
  const [budgetInput, setBudgetInput] = useState(budget);
  const [saved, setSaved] = useState(false);

  const metrics = getMetrics();
  const alerts = getAlerts();

  // Category spend calculation from tracked items
  const categorySpend = {};
  items.forEach(i => {
    const cat = (i.category || 'other').replace(/_/g, ' ');
    categorySpend[cat] = (categorySpend[cat] || 0) + (i.price || 0);
  });
  const categories = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]);
  const maxSpend = Math.max(...categories.map(([, v]) => v), 1);
  const totalSpend = categories.reduce((s, [, v]) => s + v, 0);

  // Budget usage
  const projectedSpend = items.filter(i => i.remainingDays <= 30).reduce((s, i) => s + (i.price || 0), 0);
  const budgetUsedPercent = Math.min(100, (projectedSpend / budget) * 100);

  // Monthly chart max
  const maxMonthlyTotal = Math.max(...MONTHLY_HISTORY.map(m => m.personal_care + m.kitchen + m.cleaning), 1);

  const handleSaveBudget = () => {
    setBudget(budgetInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link to="/restock" className="text-sm text-amazon-orange hover:underline flex items-center gap-1 mb-4"><ChevronLeft size={14} /> Back to Dashboard</Link>

      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6"><BarChart3 size={24} className="text-amazon-orange" /> Analytics & Budget Manager</h1>

      {/* Budget Alert */}
      {alerts.overBudget && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <div><p className="font-bold text-red-700">Budget Threshold Warning</p><p className="text-sm text-red-600">Projected spend (${projectedSpend.toFixed(2)}) exceeds budget (${budget})</p></div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-5 text-center">
          <DollarSign className="mx-auto text-amazon-orange mb-2" size={24} />
          <p className="text-2xl font-bold">${projectedSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Projected (30 days)</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <Target className="mx-auto text-emerald-500 mb-2" size={24} />
          <p className="text-2xl font-bold">${budget}</p>
          <p className="text-xs text-gray-500">Monthly Budget</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <TrendingUp className="mx-auto text-blue-500 mb-2" size={24} />
          <p className="text-2xl font-bold">{metrics.critical + metrics.warning}</p>
          <p className="text-xs text-gray-500">Items Due Soon</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <Sparkles className="mx-auto text-purple-500 mb-2" size={24} />
          <p className="text-2xl font-bold">{metrics.totalTracked}</p>
          <p className="text-xs text-gray-500">Items Tracked</p>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2"><PieChart size={16} className="text-amazon-orange" /> Budget Usage This Month</h2>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1">
            <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${budgetUsedPercent > 90 ? 'bg-red-500' : budgetUsedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${budgetUsedPercent}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold w-12 text-right">{Math.round(budgetUsedPercent)}%</span>
        </div>
        <p className="text-xs text-slate-500">${projectedSpend.toFixed(2)} of ${budget} budget projected</p>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-amazon-orange" /> Monthly Spending History</h2>
        <div className="flex items-end gap-3 h-48 mt-4">
          {MONTHLY_HISTORY.map((m, idx) => {
            const pctP = (m.personal_care / maxMonthlyTotal) * 100;
            const pctK = (m.kitchen / maxMonthlyTotal) * 100;
            const pctC = (m.cleaning / maxMonthlyTotal) * 100;
            const total = m.personal_care + m.kitchen + m.cleaning;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-40 gap-0.5">
                  <div className="bg-blue-400 rounded-t transition-all" style={{ height: `${pctP}%` }} title={`Personal Care: $${m.personal_care}`} />
                  <div className="bg-amber-400 transition-all" style={{ height: `${pctK}%` }} title={`Kitchen: $${m.kitchen}`} />
                  <div className="bg-emerald-400 rounded-b transition-all" style={{ height: `${pctC}%` }} title={`Cleaning: $${m.cleaning}`} />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{m.month}</span>
                <span className="text-[10px] text-slate-400">${total}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> Personal Care</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Kitchen</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" /> Cleaning</span>
        </div>
      </div>

      {/* Current Category Spend */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-bold mb-4">Current Tracked Items by Category</h2>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No items tracked yet. Add items from the dashboard.</p>
        ) : (
          <div className="space-y-3">
            {categories.map(([cat, spend]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize font-medium text-slate-700">{cat}</span>
                  <span className="font-bold text-slate-900">${spend.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amazon-orange rounded-full transition-all duration-500" style={{ width: `${(spend / maxSpend) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
              <span>Total tracked value</span>
              <span>${totalSpend.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Budget Setting */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Target size={16} className="text-amazon-orange" /> Set Monthly Budget</h2>
        <p className="text-sm text-slate-500 mb-3">AI alerts you when projected spend exceeds this amount</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input type="number" value={budgetInput} onChange={e => setBudgetInput(Number(e.target.value))} className="w-full border rounded-lg pl-7 pr-3 py-2.5 outline-none focus:border-amazon-orange" />
          </div>
          <button onClick={handleSaveBudget} className={`px-6 py-2.5 rounded-lg font-bold text-white transition ${saved ? 'bg-emerald-500' : 'bg-amazon-orange hover:bg-amazon-orange-dark'}`}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {[75, 100, 150, 200, 300].map(amt => (
            <button key={amt} onClick={() => setBudgetInput(amt)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${budgetInput === amt ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>${amt}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
