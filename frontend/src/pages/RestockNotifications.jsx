import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Bell, Tag, Package } from 'lucide-react';
import { restock } from '../api';

const TYPE_STYLE = {
  restock: { icon: Package, color: 'text-red-500', bg: 'bg-red-50' },
  sale: { icon: Tag, color: 'text-amazon-orange', bg: 'bg-amber-50' },
  order: { icon: Package, color: 'text-amazon-blue', bg: 'bg-blue-50' },
  system: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' }
};

export default function RestockNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    restock.getNotifications().then(r => setNotifications(r.data));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/restock" className="amazon-link text-sm flex items-center gap-1 mb-4"><ChevronLeft size={14} /> Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Bell size={24} /> Notification Center</h1>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No active notifications</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, i) => {
            const style = TYPE_STYLE[n.type] || TYPE_STYLE.system;
            const Icon = style.icon;
            return (
              <div key={n._id || i} className={`border rounded-lg p-4 ${style.bg}`}>
                <div className="flex gap-3">
                  <Icon className={`shrink-0 ${style.color}`} size={20} />
                  <div>
                    <p className="font-bold text-sm">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.triggerTime ? new Date(n.triggerTime).toLocaleString() : 'Just now'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
