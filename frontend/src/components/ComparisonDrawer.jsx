import { X, Star, Truck } from 'lucide-react';

export default function ComparisonDrawer({ products, onClose, onSelect }) {
  if (!products.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl max-h-[85vh] overflow-auto rounded-t-xl sm:rounded-xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold text-lg">Compare Products ({products.length}/3)</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
          {products.map(p => (
            <div key={p._id} className="border rounded-lg p-4 text-center">
              <img src={p.image} alt={p.name} className="h-32 mx-auto object-contain mb-3" />
              <h3 className="text-sm font-medium mb-2 line-clamp-2">{p.name}</h3>
              <div className="flex justify-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className={i < Math.floor(p.rating) ? 'fill-amazon-orange text-amazon-orange' : 'text-gray-300'} />
                ))}
              </div>
              <p className="text-xl font-bold mb-1">${p.price?.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mb-1">Stock: {p.stock}</p>
              <p className="text-xs text-amazon-green flex items-center justify-center gap-1 mb-3">
                <Truck size={12} /> {p.deliveryETA}
              </p>
              <button onClick={() => onSelect(p)} className="amazon-btn-primary w-full">Select This</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
