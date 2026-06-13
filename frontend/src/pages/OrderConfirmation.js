import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, MapPin, RefreshCw } from 'lucide-react';
import { getOrderStatus } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import './OrderConfirmation.css';

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => {
    getOrderStatus(id)
      .then(r => setOrder(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [id]); // eslint-disable-line

  if (loading) return <LoadingSpinner text="Loading order status..." />;
  if (!order) return <div className="container" style={{ padding: 60, textAlign: 'center' }}>Order not found</div>;

  const icons = [CheckCircle, Package, Truck, MapPin];

  return (
    <div className="order-confirm-page container">
      <div className="order-success-banner">
        <CheckCircle size={48} />
        <h1>Order Confirmed!</h1>
        <p>Your order #{order.orderId?.slice(-8)} has been placed successfully</p>
      </div>

      <div className="order-tracking card">
        <div className="tracking-header">
          <h3>Delivery Status</h3>
          <button className="btn btn-outline btn-sm" onClick={fetchStatus}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="tracking-eta">
          <span>Estimated delivery: <strong>{order.eta || '30 mins'}</strong></span>
          <span className={`badge badge-${order.status === 'delivered' ? 'success' : 'warning'}`}>
            {order.status}
          </span>
        </div>

        <div className="tracking-steps">
          {order.trackingSteps?.map((step, i) => {
            const Icon = icons[i] || CheckCircle;
            return (
              <div key={i} className={`tracking-step ${step.completed ? 'completed' : ''}`}>
                <div className="step-icon"><Icon size={18} /></div>
                <div className="step-info">
                  <strong>{step.label}</strong>
                  {step.time && <span>{new Date(step.time).toLocaleTimeString()}</span>}
                </div>
                {i < order.trackingSteps.length - 1 && <div className="step-line" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="order-actions">
        <Link to="/agent" className="btn btn-primary">Shop Again with AI</Link>
        <Link to="/orders" className="btn btn-outline">View All Orders</Link>
        <Link to="/" className="btn btn-outline">Back to Home</Link>
      </div>
    </div>
  );
}
