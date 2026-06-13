import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { restock } from '../api';

const URGENCY_DOT = { danger: 'bg-red-500', warning: 'bg-amber-500', safe: 'bg-green-500' };

export default function RestockCalendar() {
  const [events, setEvents] = useState([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    restock.getCalendar().then(r => setEvents(r.data));
  }, []);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  const eventsByDate = {};
  events.forEach(e => {
    const d = new Date(e.date).getDate();
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/restock" className="amazon-link text-sm flex items-center gap-1 mb-4"><ChevronLeft size={14} /> Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6">Restock Calendar</h1>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="amazon-btn text-sm">←</button>
          <h2 className="font-bold">{monthName}</h2>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="amazon-btn text-sm">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDate[day] || [];
            const isToday = day === new Date().getDate() && month.getMonth() === new Date().getMonth();
            return (
              <div key={day} className={`min-h-[72px] border rounded p-1 ${isToday ? 'bg-amazon-orange/10 border-amazon-orange' : ''}`}>
                <span className="text-xs font-medium">{day}</span>
                {dayEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-0.5 mt-0.5" title={e.title}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${URGENCY_DOT[e.urgency]}`} />
                    <span className="text-[10px] truncate">{e.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="font-bold">Upcoming Restocks</h3>
        {events.sort((a, b) => a.daysRemaining - b.daysRemaining).map(e => (
          <div key={e.id} className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3">
            <span className={`w-3 h-3 rounded-full ${URGENCY_DOT[e.urgency]}`} />
            <div className="flex-1">
              <p className="font-medium text-sm">{e.title}</p>
              <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()} · {e.daysRemaining} days</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
