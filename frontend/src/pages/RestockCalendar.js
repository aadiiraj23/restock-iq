import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { getRestockCalendar } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import './RestockCalendar.css';

export default function RestockCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    getRestockCalendar()
      .then(r => setEvents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  if (loading) return <LoadingSpinner text="Loading calendar..." />;

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDay(currentMonth);
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();

  return (
    <div className="calendar-page container">
      <div className="calendar-header">
        <Link to="/restock" className="btn btn-outline btn-sm"><ArrowLeft size={14} /> Back</Link>
        <h1><Calendar size={24} /> Restock Calendar</h1>
      </div>

      <div className="calendar-card card">
        <div className="calendar-nav">
          <button onClick={prevMonth}><ChevronLeft size={20} /></button>
          <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-day-label">{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={i} className="calendar-cell empty" />;
            const dayEvents = getEventsForDay(day);
            const isToday = day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
            return (
              <div key={i} className={`calendar-cell ${isToday ? 'today' : ''} ${dayEvents.length ? 'has-events' : ''}`}>
                <span className="day-number">{day}</span>
                {dayEvents.map((e, j) => (
                  <div key={j} className={`calendar-event urgency-${e.urgency}`}>
                    <span className="event-dot" />
                    <span className="event-name">{e.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="upcoming-section">
        <h3>Upcoming Restocks</h3>
        <div className="upcoming-list">
          {events
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 8)
            .map((e, i) => (
              <div key={i} className={`upcoming-item urgency-${e.urgency}`}>
                <div className="upcoming-date">
                  <span className="date-day">{new Date(e.date).getDate()}</span>
                  <span className="date-month">{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div className="upcoming-info">
                  <strong>{e.title}</strong>
                  <span>{e.daysRemaining} days remaining · {e.category}</span>
                </div>
                <span className={`badge badge-${e.urgency === 'danger' ? 'danger' : e.urgency === 'warning' ? 'warning' : 'success'}`}>
                  {e.urgency}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
