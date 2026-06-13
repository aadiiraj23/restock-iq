import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { catalog } from '../api';

export default function CategoryPage() {
  const { category } = useParams();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    catalog.getAll({ category }).then(r => setProducts(r.data));
  }, [category]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold capitalize mb-1">{category?.replace('_', ' ')}</h1>
      <p className="text-sm text-gray-500 mb-6">{products.length} results</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}
