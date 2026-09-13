import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { StudentAuthProvider } from './context/StudentAuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import CartDrawer from './components/CartDrawer';
import Toast from './components/Toast';
import StudentAuthModal from './components/StudentAuthModal';
import StudentOrdersModal from './components/StudentOrdersModal';

import ShopHome from './pages/ShopHome';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

const IS_ADMIN_APP = import.meta.env.VITE_APP_ROLE === 'admin';

export default function App() {
  const [currentPage, setCurrentPage] = useState(IS_ADMIN_APP ? 'admin-login' : 'shop');
  const [lastOrder, setLastOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [isStudentAuthOpen, setIsStudentAuthOpen] = useState(false);
  const [isStudentOrdersOpen, setIsStudentOrdersOpen] = useState(false);

  const showToast = ({ type, message }) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync with browser hash / path
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').replace('/', '');

      if (IS_ADMIN_APP) {
        if (hash === 'dashboard' || hash === 'admin/dashboard') setCurrentPage('admin-dashboard');
        else setCurrentPage('admin-login');
        return;
      }

      // Student App Routing: Strict zero-admin guarantee
      if (hash === 'checkout') setCurrentPage('checkout');
      else if (hash.startsWith('order-confirmation')) setCurrentPage('confirmation');
      else setCurrentPage('shop');
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (page) => {
    if (IS_ADMIN_APP) {
      setCurrentPage(page);
      if (page === 'admin-dashboard') window.location.hash = '/dashboard';
      else window.location.hash = '/login';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Student navigation
    if (page === 'admin-login' || page === 'admin-dashboard') {
      // Prohibit admin navigation on student app
      return;
    }

    setCurrentPage(page);
    if (page === 'shop') window.location.hash = '';
    else if (page === 'checkout') window.location.hash = '/checkout';
    else if (page === 'confirmation') window.location.hash = '/order-confirmation';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSuccess = (order) => {
    setLastOrder(order);
    navigateTo('confirmation');
    showToast({ type: 'success', message: 'Order placed successfully! Note your verification code.' });
  };

  // -------------------------------------------------------------
  // RENDER: ADMIN STAFF APPLICATION
  // -------------------------------------------------------------
  if (IS_ADMIN_APP) {
    return (
      <AuthProvider>
        <div className="min-h-screen flex flex-col text-[#242E2C]">
          <AdminNavbar onNavigate={navigateTo} currentPage={currentPage} />

          <main className="flex-1">
            {currentPage === 'admin-login' ? (
              <AdminLogin onNavigate={navigateTo} showToast={showToast} />
            ) : (
              <AdminDashboard onNavigate={navigateTo} showToast={showToast} />
            )}
          </main>

          <Toast toast={toast} onClose={() => setToast(null)} />

          <footer className="no-print bg-[#FAF8F5]/80 border-t border-[#D9D0C7] py-6 text-xs text-[#62736F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="font-semibold text-[#242E2C]">VMart Staff Portal</p>
              </div>
              <p className="text-[11px] font-mono text-[#8C9B97]">
                Restricted Counter Terminal · Authorized Staff Only
              </p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    );
  }

  // -------------------------------------------------------------
  // RENDER: STUDENT STORE APPLICATION (ZERO ADMIN LINKS)
  // -------------------------------------------------------------
  return (
    <StudentAuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col text-[#242E2C]">
          
          {/* Student Clean Navbar with Student Auth & Orders */}
          <Navbar 
            onNavigate={navigateTo} 
            currentPage={currentPage}
            onOpenAuthModal={() => setIsStudentAuthOpen(true)}
            onOpenOrdersModal={() => setIsStudentOrdersOpen(true)}
          />

          {/* Slide-out Cart Drawer */}
          <CartDrawer onNavigate={navigateTo} />

          {/* Page Routing */}
          <main className="flex-1">
            {currentPage === 'shop' && (
              <ShopHome onNavigate={navigateTo} showToast={showToast} />
            )}

            {currentPage === 'checkout' && (
              <Checkout
                onNavigate={navigateTo}
                onOrderSuccess={handleOrderSuccess}
                onOpenAuthModal={() => setIsStudentAuthOpen(true)}
                showToast={showToast}
              />
            )}

            {currentPage === 'confirmation' && (
              <OrderConfirmation
                orderData={lastOrder}
                onNavigate={navigateTo}
                showToast={showToast}
              />
            )}
          </main>

          {/* Student Auth Modal (Sign In / Register) */}
          <StudentAuthModal
            isOpen={isStudentAuthOpen}
            onClose={() => setIsStudentAuthOpen(false)}
            showToast={showToast}
          />

          {/* Student Orders & Pickup Codes Modal */}
          <StudentOrdersModal
            isOpen={isStudentOrdersOpen}
            onClose={() => setIsStudentOrdersOpen(false)}
            showToast={showToast}
          />

          {/* Toast Notification Alert */}
          <Toast toast={toast} onClose={() => setToast(null)} />

          {/* Student Footer (Zero Staff Links) */}
          <footer className="no-print bg-[#FAF8F5]/80 border-t border-[#D9D0C7] py-8 mt-16 text-xs text-[#62736F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#62736F]" />
                <p className="font-semibold text-[#242E2C]">The Campus Shop — In-Campus Provisions</p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-[#62736F]">
                <span>Order online, collect & pay cash at shop counter</span>
              </div>
            </div>
          </footer>

        </div>
      </CartProvider>
    </StudentAuthProvider>
  );
}
