import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List, SlidersHorizontal } from 'lucide-react';
import { getProducts, getCategories } from '../api';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProductList.css';

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    getCategories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (selectedCategory) params.category = selectedCategory;
    getProducts(params)
      .then(r => {
        let data = r.data;
        if (sortBy === 'price_low') data.sort((a, b) => a.price - b.price);
        if (sortBy === 'price_high') data.sort((a, b) => b.price - a.price);
        if (sortBy === 'rating') data.sort((a, b) => b.rating - a.rating);
        setProducts(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchQuery, selectedCategory, sortBy]);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    const params = new URLSearchParams(searchParams);
    if (cat) params.set('category', cat);
    else params.delete('category');
    setSearchParams(params);
  };

  return (
    <div className="shop-page container">
      <div className="shop-header">
        <h1>{searchQuery ? `Results for "${searchQuery}"` : 'All Products'}</h1>
        <p>{products.length} products found</p>
      </div>

      <div className="shop-layout">
        {/* Sidebar Filters */}
        <aside className="shop-sidebar">
          <div className="filter-section">
            <h3><Filter size={16} /> Categories</h3>
            <ul className="category-list">
              <li>
                <button className={!selectedCategory ? 'active' : ''} onClick={() => handleCategoryChange('')}>
                  All Categories
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat}>
                  <button className={selectedCategory === cat ? 'active' : ''} onClick={() => handleCategoryChange(cat)}>
                    {cat.replace('_', ' ')}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-section">
            <h3><SlidersHorizontal size={16} /> Sort By</h3>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </aside>

        {/* Products */}
        <div className="shop-main">
          <div className="shop-toolbar">
            <span>{products.length} items</span>
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                <Grid size={16} />
              </button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                <List size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading products..." />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <p>No products found. Try a different search or category.</p>
            </div>
          ) : (
            <div className={`shop-grid ${viewMode}`}>
              {products.map(p => (
                <ProductCard key={p._id} product={p} compact={viewMode === 'list'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
