import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, Bell, TrendingUp, ShoppingCart, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { getRestockDashboard, getRestockAnalytics, getNotifications, submitRestockFeedback, createRestockBundle } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import './RestockDashboard.css';

export default function RestockDashboard() {
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');

  useEffect(() => {
    Promise.all([
      getRestockDashboard(),
      getRestockAnalytics(),
      getNotifications()
    ])
      .then(([itemsRes, analyticsRes, notifRes]) => {
        setItems(itemsRes.data);
        setAnalytics(analyticsRes.data);
        setNotifications(notifRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFeedback = async (itemId, type) => {
    try {
      await submitRestockFeedback({ itemId, type });
      toast.success('Thanks! Prediction updated.');
      const res = await getRestockDashboard();
      setItems(res.data);
    } catch (err) {
      toast.error('Failed to submit feedback');
    }
  };

  const handleBundle = async () => {
    try {
      const res = await createRestockBundle();
      toast.success(`Bundle created: ${res.data.message}`);
    } catch (err) {
      toast.error('Failed to create bundle');
    }
  };

  if (loading) return <LoadingSpinner text="Loading restock data..." />;

  const dueItems = items.filter(i => i.urgency === 'danger' || i.urgency === 'warning');

  return (
    <div className="restock-page container">
      <div className="restock-header">
        <div>
          <h1><Package size={24} /> ReStock AI</h1>
          <p>Smart replenishment — never run out of essentials</p>
        </div>
        <div className="restock-actions">
          <Link to="/restock/calendar" className="btn btn-outline">
            <Calendar size={16} /> Calendar
          </Link>
          {dueItems.length > 0 && (
            <button className="btn btn-primary" onClick={handleBundle}>
              <ShoppingCart size={16} /> Restock All ({dueItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="restock-stats">
        <div className="stat-card">
          <div className="stat-icon danger"><AlertTriangle size={20} /></div>
          <div>
            <span className="stat-value">{items.filter(i => i.urgency === 'danger').length}</span>
            <span className="stat-label">Critical</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Bell size={20} /></div>
          <div>
            <span className="stat-value">{items.filter(i => i.urgency === 'warning').length}</span>
            <span className="stat-label">Due Soon</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircle size={20} /></div>
          <div>
            <span className="stat-value">{items.filter(i => i.urgency === 'safe').length}</span>
            <span className="stat-label">Well Stocked</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon budget"><TrendingUp size={20} /></div>
          <div>
            <span className="stat-value">${analytics?.projectedSpend?.toFixed(0) || 0}</span>
            <span className="stat-label">Projected Spend</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="restock-tabs">
        <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>
          Tracker ({items.length})
        </button>
        <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>
          Alerts ({notifications.length})
        </button>
        <button className={activeTab === 'budget' ? 'active' : ''} onClick={() => setActiveTab('budget')}>
          Budget
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tracker' && (
        <div className="restock-grid">
          {items.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <h3>No items tracked</h3>
              <p>Add products to your restock tracker from product pages</p>
              <Link to="/shop" className="btn btn-primary"><Plus size={16} /> Browse Products</Link>
            </div>
          ) : (
            items.map(item => (
              <div key={item._id} className={`restock-card card urgency-${item.urgency}`}>
                <div className="restock-card-top">
                  <img src={item.productId?.image} alt={item.productId?.name} />
                  <div className="restock-card-info">
                    <h4>{item.productId?.name || 'Product'}</h4>
                    <p className="restock-category">{item.category}</p>
                    <span className={`badge badge-${item.urgency === 'danger' ? 'danger' : item.urgency === 'warning' ? 'warning' : 'success'}`}>
                      {item.urgency === 'danger' ? 'Critical' : item.urgency === 'warning' ? 'Low Stock' : 'Good'}
                    </span>
                  </div>
                </div>

                <div className="restock-progress">
                  <div className="progress-header">
                    <span>Days remaining</span>
                    <strong>{item.daysRemaining} days</strong>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${item.urgency}`}
                      style={{ width: `${Math.min(100, (item.daysRemaining / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="restock-card-actions">
                  <span className="confidence">Confidence: {Math.round((item.confidence || 0.8) * 100)}%</span>
                  <div className="feedback-btns">
                    <button title="Finished early" onClick={() => handleFeedback(item._id, 'finished_early')}>
                      <ThumbsDown size={14} />
                    </button>
                    <button title="Still have plenty" onClick={() => handleFeedback(item._id, 'still_plenty')}>
                      <ThumbsUp size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="notif-list">
          {notifications.length === 0 ? (
            <p className="empty-text">No alerts right now. All good!</p>
          ) : (
            notifications.map((n, i) => (
              <div key={n._id || i} className={`notif-card card type-${n.type}`}>
                <div className="notif-icon">
                  {n.type === 'restock' ? <AlertTriangle size={18} /> : <Bell size={18} />}
                </div>
                <div className="notif-content">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'budget' && analytics && (
        <div className="budget-section card">
          <h3>Budget Overview</h3>
          <div className="budget-bar">
            <div className="budget-progress">
              <div
                className={`budget-fill ${analytics.overBudget ? 'over' : ''}`}
                style={{ width: `${Math.min(100, (analytics.projectedSpend / analytics.monthlyBudget) * 100)}%` }}
              />
            </div>
            <div className="budget-labels">
              <span>Projected: ${analytics.projectedSpend?.toFixed(2)}</span>
              <span>Budget: ${analytics.monthlyBudget?.toFixed(2)}</span>
            </div>
          </div>
          {analytics.overBudget && (
            <div className="budget-warning">
              <AlertTriangle size={16} /> You're projected to exceed your monthly budget
            </div>
          )}
          <div className="category-spend">
            <h4>Spending by Category</h4>
            {Object.entries(analytics.categorySpend || {}).map(([cat, amount]) => (
              <div key={cat} className="category-row">
                <span>{cat}</span>
                <span>${amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
