import React, { useState, useEffect } from 'react';
import { BarChart3, Package, ShoppingCart, Users, Database, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { getProducts, getOrders, getRestockDashboard, getCategories } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [restockItems, setRestockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProducts({ limit: 100 }),
      getOrders(),
      getRestockDashboard(),
      getCategories()
    ])
      .then(([prodRes, ordRes, restockRes, catRes]) => {
        setProducts(prodRes.data);
        setOrders(ordRes.data);
        setRestockItems(restockRes.data);
        setCategories(catRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading admin panel..." />;

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;
  const lowStock = products.filter(p => p.stock < 30);

  return (
    <div className="admin-page">
      <div className="admin-sidebar">
        <div className="admin-logo">
          <Settings size={20} />
          <span>Admin Panel</span>
        </div>
        <nav className="admin-nav">
          {[
            { id: 'overview', icon: <BarChart3 size={18} />, label: 'Overview' },
            { id: 'products', icon: <Package size={18} />, label: 'Products' },
            { id: 'orders', icon: <ShoppingCart size={18} />, label: 'Orders' },
            { id: 'analytics', icon: <Database size={18} />, label: 'Analytics' },
          ].map(tab => (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-main">
        {activeTab === 'overview' && (
          <div className="admin-overview">
            <h2>Dashboard Overview</h2>
            <div className="admin-stats">
              <div className="admin-stat-card">
                <Package size={24} />
                <span className="admin-stat-val">{products.length}</span>
                <span className="admin-stat-label">Products</span>
              </div>
              <div className="admin-stat-card">
                <ShoppingCart size={24} />
                <span className="admin-stat-val">{orders.length}</span>
                <span className="admin-stat-label">Orders</span>
              </div>
              <div className="admin-stat-card revenue">
                <BarChart3 size={24} />
                <span className="admin-stat-val">${totalRevenue.toFixed(0)}</span>
                <span className="admin-stat-label">Revenue</span>
              </div>
              <div className="admin-stat-card">
                <Users size={24} />
                <span className="admin-stat-val">${avgOrder.toFixed(0)}</span>
                <span className="admin-stat-label">Avg Order</span>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="admin-section card">
              <h3>Products by Category</h3>
              <div className="category-bars">
                {categories.map(cat => {
                  const count = products.filter(p => p.category === cat).length;
                  const pct = (count / products.length) * 100;
                  return (
                    <div key={cat} className="cat-bar-row">
                      <span className="cat-name">{cat.replace('_', ' ')}</span>
                      <div className="cat-bar">
                        <div className="cat-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="cat-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
              <div className="admin-section card">
                <h3>⚠️ Low Stock Products ({lowStock.length})</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map(p => (
                      <tr key={p._id}>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td className="stock-low">{p.stock}</td>
                        <td>${p.price?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="admin-products">
            <div className="admin-page-header">
              <h2>Products ({products.length})</h2>
              <button className="btn btn-primary"><Plus size={16} /> Add Product</button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td><img src={p.image} alt="" className="table-thumb" /></td>
                    <td className="td-name">{p.name}</td>
                    <td><span className="table-badge">{p.category}</span></td>
                    <td>${p.price?.toFixed(2)}</td>
                    <td className={p.stock < 30 ? 'stock-low' : ''}>{p.stock}</td>
                    <td>⭐ {p.rating}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn edit"><Edit size={14} /></button>
                        <button className="action-btn delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="admin-orders">
            <h2>Orders ({orders.length})</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td className="td-mono">#{o._id?.slice(-8)}</td>
                    <td>{o.items?.length || 0} items</td>
                    <td className="td-price">${o.total?.toFixed(2)}</td>
                    <td><span className={`badge badge-${o.fulfillmentStatus === 'delivered' ? 'success' : 'warning'}`}>{o.fulfillmentStatus}</span></td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="admin-analytics">
            <h2>Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card card">
                <h4>Restock Tracking</h4>
                <p className="analytics-big">{restockItems.length}</p>
                <span>items being tracked</span>
              </div>
              <div className="analytics-card card">
                <h4>Due Items</h4>
                <p className="analytics-big">{restockItems.filter(i => i.daysRemaining <= 7).length}</p>
                <span>due within 7 days</span>
              </div>
              <div className="analytics-card card">
                <h4>Avg Order Value</h4>
                <p className="analytics-big">${avgOrder.toFixed(2)}</p>
                <span>per order</span>
              </div>
              <div className="analytics-card card">
                <h4>Categories</h4>
                <p className="analytics-big">{categories.length}</p>
                <span>product categories</span>
              </div>
            </div>

            <div className="admin-section card">
              <h3>Order Fulfillment Status</h3>
              <div className="status-bars">
                {['processing', 'packed', 'shipped', 'delivered'].map(status => {
                  const count = orders.filter(o => o.fulfillmentStatus === status).length;
                  return (
                    <div key={status} className="status-row">
                      <span>{status}</span>
                      <div className="status-bar">
                        <div style={{ width: `${orders.length ? (count / orders.length) * 100 : 0}%` }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
