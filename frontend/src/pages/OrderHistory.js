import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck } from 'lucide-react';
import { getOrders } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import './OrderHistory.css';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading orders..." />;

  const statusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={16} />;
      case 'shipped': return <Truck size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="orders-page container">
      <h1><Package size={24} /> Order History</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h3>No orders yet</h3>
          <p>Start shopping with our AI Agent</p>
          <Link to="/agent" className="btn btn-primary">AI Shopping Agent</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <Link to={`/order/${order._id}`} key={order._id} className="order-card card">
              <div className="order-card-header">
                <span className="order-id">#{order._id?.slice(-8)}</span>
                <span className={`badge badge-${order.fulfillmentStatus === 'delivered' ? 'success' : 'warning'}`}>
                  {statusIcon(order.fulfillmentStatus)} {order.fulfillmentStatus}
                </span>
              </div>
              <div className="order-card-items">
                {order.items?.slice(0, 3).map((item, i) => (
                  <img key={i} src={item.image} alt={item.name} className="order-item-thumb" />
                ))}
                {order.items?.length > 3 && <span className="more-items">+{order.items.length - 3}</span>}
              </div>
              <div className="order-card-footer">
                <span className="order-total">${order.total?.toFixed(2)}</span>
                <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
