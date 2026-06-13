import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { catalog } from '../api';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [products, setProducts] = useState([]);

  useEffect(() => {
    catalog.getAll({ search: q }).then(r => setProducts(r.data));
  }, [q]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">
        {q ? `Results for "${q}"` : 'All Products'}
        <span className="text-gray-500 font-normal text-base ml-2">({products.length})</span>
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}
