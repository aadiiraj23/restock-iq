import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, BarChart3, Bell, Plus, Package } from 'lucide-react';
import RestockCard from '../components/RestockCard';
import { restock } from '../api';
import { useCartStore } from '../store';

export default function RestockDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bundling, setBundling] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  const load = () => {
    restock.getDashboard().then(r => { setItems(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleFeedback = async (itemId, type) => {
    await restock.feedback({ itemId, type });
    load();
  };

  const handleReorder = (item) => {
    if (item.productId) addItem(item.productId);
  };

  const handleBundle = async () => {
    setBundling(true);
    try {
      const { data } = await restock.bundle();
      if (data.items) {
        data.items.forEach(i => { if (i.productId) addItem(i.productId); });
      }
      alert(`${data.message || 'Bundle added to cart'}`);
    } finally { setBundling(false); }
  };

  const dueSoon = items.filter(i => i.daysRemaining <= 7);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amazon-navy">ReStock AI Dashboard</h1>
          <p className="text-sm text-gray-600">Predictive replenishment for your household essentials</p>
        </div>
        <div className="flex gap-2">
          <Link to="/restock/calendar" className="amazon-btn flex items-center gap-1 text-sm"><Calendar size={14} /> Calendar</Link>
          <Link to="/restock/analytics" className="amazon-btn flex items-center gap-1 text-sm"><BarChart3 size={14} /> Analytics</Link>
          <Link to="/restock/notifications" className="amazon-btn flex items-center gap-1 text-sm"><Bell size={14} /> Alerts</Link>
        </div>
      </div>

      {dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-amber-800">{dueSoon.length} items need restocking soon</p>
            <p className="text-sm text-amber-700">Bundle them all and save time</p>
          </div>
          <button onClick={handleBundle} disabled={bundling} className="amazon-btn-primary flex items-center gap-1">
            <Package size={14} /> {bundling ? 'Building...' : 'Restock All Due Items'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center py-12 text-gray-500">Loading tracker...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-lg">
          <p className="text-gray-500 mb-4">No items being tracked yet</p>
          <Link to="/" className="amazon-btn-primary inline-flex items-center gap-1"><Plus size={14} /> Shop & Auto-Track</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <RestockCard key={item._id} item={item} onReorder={handleReorder} onFeedback={handleFeedback} />
          ))}
        </div>
      )}
    </div>
  );
}
