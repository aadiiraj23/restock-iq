import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShoppingCart, Menu, Mic, User, Package, Bell } from 'lucide-react';
import { useCartStore, useAuthStore } from '../store';

export default function TopNav({ onCartClick }) {
  const navigate = useNavigate();
  const items = useCartStore(s => s.items);
  const user = useAuthStore(s => s.user);
  const count = items.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-amazon-navy text-white">
        <div className="max-w-[1500px] mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1 shrink-0 px-2 py-1 hover:outline hover:outline-1 hover:outline-white rounded-sm">
            <span className="text-2xl font-bold tracking-tight">amazon<span className="text-amazon-orange">now</span></span>
          </Link>

          <div className="hidden sm:flex items-center gap-1 text-sm shrink-0 px-2 py-1 hover:outline hover:outline-1 hover:outline-white rounded-sm cursor-pointer">
            <MapPin size={16} />
            <div>
              <div className="text-gray-300 text-xs">Deliver to</div>
              <div className="font-bold">Seattle 98101</div>
            </div>
          </div>

          <form
            className="flex flex-1 max-w-3xl"
            onSubmit={e => { e.preventDefault(); const q = e.target.q.value; if (q) navigate(`/search?q=${encodeURIComponent(q)}`); }}
          >
            <select className="bg-gray-100 text-gray-700 text-sm px-3 rounded-l-md border-0 hidden md:block" defaultValue="all">
              <option value="all">All</option>
              <option value="snacks">Snacks</option>
              <option value="medicine">Health</option>
              <option value="cleaning">Cleaning</option>
            </select>
            <input name="q" type="text" placeholder="Search Amazon Now" className="flex-1 px-4 py-2 text-amazon-navy text-sm border-0 focus:ring-2 focus:ring-amazon-orange outline-none" />
            <button type="submit" className="bg-amazon-orange hover:bg-amazon-orange-dark px-4 rounded-r-md">
              <Search size={20} className="text-amazon-navy" />
            </button>
          </form>

          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            <Link to="/ai" className="nav-link flex items-center gap-1">
              <Mic size={14} /> AI Shop
            </Link>
            <Link to="/restock" className="nav-link">ReStock</Link>
            <Link to="/orders" className="nav-link flex items-center gap-1">
              <Package size={14} /> Orders
            </Link>
            <Link to="/account" className="nav-link flex items-center gap-1">
              <User size={14} />
              <span>{user?.name?.split(' ')[0] || 'Account'}</span>
            </Link>
            <Link to="/restock/notifications" className="nav-link"><Bell size={16} /></Link>
            <button onClick={onCartClick} className="nav-link flex items-end gap-1 relative">
              <ShoppingCart size={28} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-amazon-orange text-amazon-navy text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{count}</span>
              )}
              <span className="text-sm font-bold mb-0.5">Cart</span>
            </button>
          </nav>

          <button className="lg:hidden p-2" onClick={onCartClick}><ShoppingCart size={24} /></button>
        </div>
      </div>

      <div className="bg-amazon-dark text-white text-sm">
        <div className="max-w-[1500px] mx-auto px-4 py-1.5 flex items-center gap-4 overflow-x-auto">
          <Link to="/ai" className="flex items-center gap-1 shrink-0 hover:underline font-medium">
            <Menu size={16} /> AI Prompt Dashboard
          </Link>
          <Link to="/" className="shrink-0 hover:underline">Recommended</Link>
          <Link to="/category/snacks" className="shrink-0 hover:underline">Snacks</Link>
          <Link to="/category/medicine" className="shrink-0 hover:underline">Health</Link>
          <Link to="/category/cleaning" className="shrink-0 hover:underline">Cleaning</Link>
          <Link to="/category/personal_care" className="shrink-0 hover:underline">Personal Care</Link>
          <Link to="/category/groceries" className="shrink-0 hover:underline">Groceries</Link>
          <Link to="/restock" className="shrink-0 hover:underline text-amazon-yellow font-medium">ReStock AI</Link>
          <span className="shrink-0 text-amazon-yellow">⚡ Express Delivery</span>
        </div>
      </div>
    </header>
  );
}
