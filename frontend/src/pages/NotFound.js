import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1 style={{ fontSize: '64px', color: 'var(--primary)', marginBottom: '8px' }}>404</h1>
      <h2 style={{ marginBottom: '12px' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary btn-lg"><Home size={18} /> Go Home</Link>
    </div>
  );
}
