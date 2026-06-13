
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Package, ShoppingCart, Bot, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { getOrders, getRestockDashboard, getRestockAnalytics } from '../api';
import { useAuthStore } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';
import './UserDashboard.css';

export default function UserDashboard() {
  const user = useAuthStore(s => s.user);
  const [orders, setOrders] = useState([]);
  const [restockItems, setRestockItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOrders(),
      getRestockDashboard(),
      getRestockAnalytics()
    ])
      .then(([ordersRes, restockRes, analyticsRes]) => {
        setOrders(ordersRes.data);
        setRestockItems(restockRes.data);
        setAnalytics(analyticsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
  const dueItems = restockItems.filter(i => i.urgency === 'danger' || i.urgency === 'warning');

  return (
    <div className="user-dash container">
      <div className="dash-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Your shopping overview and activity</p>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <ShoppingCart size={22} />
          <div>
            <span className="dash-stat-val">{orders.length}</span>
            <span className="dash-stat-label">Orders</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <TrendingUp size={22} />
          <div>
            <span className="dash-stat-val">${totalSpent.toFixed(0)}</span>
            <span className="dash-stat-label">Total Spent</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <Package size={22} />
          <div>
            <span className="dash-stat-val">{restockItems.length}</span>
            <span className="dash-stat-label">Tracked Items</span>
          </div>
        </div>
        <div className="dash-stat-card alert">
          <Clock size={22} />
          <div>
            <span className="dash-stat-val">{dueItems.length}</span>
            <span className="dash-stat-label">Due Soon</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-actions">
        <Link to="/agent" className="dash-action-card">
          <Bot size={28} />
          <h3>AI Shopping Agent</h3>
          <p>Type what you need</p>
          <ArrowRight size={16} />
        </Link>
        <Link to="/restock" className="dash-action-card">
          <Package size={28} />
          <h3>ReStock AI</h3>
          <p>{dueItems.length} items due soon</p>
          <ArrowRight size={16} />
        </Link>
        <Link to="/shop" className="dash-action-card">
          <ShoppingCart size={28} />
          <h3>Browse Store</h3>
          <p>Explore categories</p>
          <ArrowRight size={16} />
        </Link>
        <Link to="/orders" className="dash-action-card">
          <BarChart3 size={28} />
          <h3>Order History</h3>
          <p>{orders.length} past orders</p>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="dash-grid">
        <div className="dash-section card">
          <div className="dash-section-header">
            <h3>Recent Orders</h3>
            <Link to="/orders">View All</Link>
          </div>
          {orders.length === 0 ? (
            <p className="empty-text">No orders yet</p>
          ) : (
            <div className="dash-orders">
              {orders.slice(0, 5).map(order => (
                <Link to={`/order/${order._id}`} key={order._id} className="dash-order-item">
                  <div className="order-mini-items">
                    {order.items?.slice(0, 2).map((item, i) => (
                      <img key={i} src={item.image} alt="" />
                    ))}
                  </div>
                  <div className="order-mini-info">
                    <span>${order.total?.toFixed(2)}</span>
                    <span className="order-mini-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`badge badge-${order.fulfillmentStatus === 'delivered' ? 'success' : 'warning'}`}>
                    {order.fulfillmentStatus}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="dash-section card">
          <div className="dash-section-header">
            <h3>Restock Alerts</h3>
            <Link to="/restock">View All</Link>
          </div>
          {dueItems.length === 0 ? (
            <p className="empty-text">All stocked up!</p>
          ) : (
            <div className="dash-restock">
              {dueItems.slice(0, 5).map(item => (
                <div key={item._id} className="dash-restock-item">
                  <img src={item.productId?.image} alt="" />
                  <div>
                    <strong>{item.productId?.name}</strong>
                    <span>{item.daysRemaining} days left</span>
                  </div>
                  <span className={`badge badge-${item.urgency === 'danger' ? 'danger' : 'warning'}`}>
                    {item.urgency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
