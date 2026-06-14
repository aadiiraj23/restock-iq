import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import PriceDropAlert from './components/PriceDropAlert';
import WeeklyAutoOrder from './components/WeeklyAutoOrder';
import Home from './pages/Home';
import AIDashboard from './pages/AIDashboard';
import IntentResults from './pages/IntentResults';
import CategoryPage from './pages/CategoryPage';
import SearchPage from './pages/SearchPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmation from './pages/OrderConfirmation';
import OrdersPage from './pages/OrdersPage';
import AccountPage from './pages/AccountPage';
import RestockDashboard from './pages/RestockDashboard';
import RestockCalendar from './pages/RestockCalendar';
import RestockAnalytics from './pages/RestockAnalytics';
import RestockNotifications from './pages/RestockNotifications';

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [showWeeklyOrder, setShowWeeklyOrder] = useState(false);

  // Show Weekly Auto-Order notification after 60 seconds on site (simulated Monday notification)
  useEffect(() => {
    const timer = setTimeout(() => {
      const dismissed = sessionStorage.getItem('weeklyOrderDismissed');
      if (!dismissed) setShowWeeklyOrder(true);
    }, 60000);
    return () => clearTimeout(timer);
  }, []);

  const closeWeeklyOrder = () => {
    setShowWeeklyOrder(false);
    sessionStorage.setItem('weeklyOrderDismissed', 'true');
  };

  return (
    <div className="min-h-screen flex flex-col bg-amazon-light">
      <TopNav onCartClick={() => setCartOpen(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai" element={<AIDashboard />} />
          <Route path="/intent-results" element={<IntentResults />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/restock" element={<RestockDashboard />} />
          <Route path="/restock/calendar" element={<RestockCalendar />} />
          <Route path="/restock/analytics" element={<RestockAnalytics />} />
          <Route path="/restock/notifications" element={<RestockNotifications />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Global AI Features */}
      <PriceDropAlert />
      <WeeklyAutoOrder show={showWeeklyOrder} onClose={closeWeeklyOrder} />
    </div>
  );
}
