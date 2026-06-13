import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, Package, Bot, BarChart3, LogOut } from 'lucide-react';
import { useAuthStore, useCartStore } from '../store';
import './Navbar.css';

export default function Navbar() {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const cartCount = useCartStore(s => s.items.reduce((sum, i) => sum + i.quantity, 0));

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-amazon">amazon</span>
          <span className="logo-now">now</span>
          <span className="logo-ai">AI</span>
        </Link>

        <form className="nav-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search products, brands, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="search-btn">
            <Search size={18} />
          </button>
        </form>

        <div className="nav-actions">
          <Link to="/agent" className="nav-action-btn agent-btn" title="AI Shopping Agent">
            <Bot size={20} />
            <span>AI Agent</span>
          </Link>

          <Link to="/restock" className="nav-action-btn" title="ReStock AI">
            <Package size={20} />
            <span>ReStock</span>
          </Link>

          {user ? (
            <div className="nav-user-menu">
              <button className="nav-action-btn" onClick={() => setMenuOpen(!menuOpen)}>
                <User size={20} />
                <span>{user.name?.split(' ')[0]}</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown" onClick={() => setMenuOpen(false)}>
                  <Link to="/dashboard"><BarChart3 size={16} /> Dashboard</Link>
                  <Link to="/orders"><Package size={16} /> Orders</Link>
                  <Link to="/profile"><User size={16} /> Profile</Link>
                  {user.email === 'admin@amazon.com' && (
                    <Link to="/admin"><BarChart3 size={16} /> Admin Panel</Link>
                  )}
                  <button onClick={logout}><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-action-btn">
              <User size={20} />
              <span>Sign In</span>
            </Link>
          )}

          <Link to="/cart" className="nav-action-btn cart-btn">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            <span>Cart</span>
          </Link>
        </div>

        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <Link to="/agent">AI Shopping Agent</Link>
          <Link to="/shop">Browse Products</Link>
          <Link to="/restock">ReStock AI</Link>
          <Link to="/cart">Cart ({cartCount})</Link>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/orders">Orders</Link>
              <Link to="/profile">Profile</Link>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
}
