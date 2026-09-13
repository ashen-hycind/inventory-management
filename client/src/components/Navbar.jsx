import React from 'react';
import { ShoppingBag, Store, User, Ticket, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function Navbar({ onNavigate, currentPage, onOpenAuthModal, onOpenOrdersModal }) {
  const { totalItems, setIsCartOpen } = useCart();
  const { currentStudent, isAuthenticated, logout } = useStudentAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#D9D0C7] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => onNavigate('shop')}
          className="flex items-center space-x-3.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 bg-[#62736F] text-white rounded-xl flex items-center justify-center shadow-tactile transition-all duration-200 group-hover:bg-[#DB846E] group-hover:scale-105">
            <Store className="w-5 h-5 text-[#FAF8F5] stroke-[2]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#242E2C] tracking-tight">
                The Campus Shop
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#DB846E]" />
            </div>
            <p className="text-[11px] text-[#62736F] font-medium tracking-wide">In-Campus Goods & Provisions</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Catalog Link */}
          <button
            onClick={() => onNavigate('shop')}
            className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
              currentPage === 'shop'
                ? 'text-[#242E2C] bg-[#D9D0C7]/60'
                : 'text-[#62736F] hover:text-[#242E2C] hover:bg-[#D9D0C7]/30'
            }`}
          >
            Catalog
          </button>

          {/* Student Auth / Orders */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button
                onClick={onOpenOrdersModal}
                className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl text-[#242E2C] bg-[#FAF8F5] hover:bg-[#EBE3DA] border border-[#D9D0C7] transition"
                title="View your active pickup codes and order history"
              >
                <Ticket className="w-4 h-4 text-[#DB846E]" />
                <span>My Orders</span>
              </button>

              <div className="hidden md:flex items-center space-x-1 text-xs font-mono text-[#62736F] bg-[#FAF8F5] px-2.5 py-1.5 rounded-xl border border-[#D9D0C7]">
                <User className="w-3.5 h-3.5 text-[#8C9B97]" />
                <span className="max-w-[100px] truncate">@{currentStudent.username}</span>
              </div>

              <button
                onClick={logout}
                className="p-2 text-[#62736F] hover:text-[#DB846E] hover:bg-[#E8B5A7]/20 rounded-xl border border-transparent hover:border-[#D9D0C7] transition"
                title="Sign out student session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl text-[#62736F] hover:text-[#242E2C] hover:bg-[#D9D0C7]/30 border border-transparent hover:border-[#D9D0C7] transition"
            >
              <User className="w-4 h-4 text-[#8C9B97]" />
              <span>Sign In / Orders</span>
            </button>
          )}

          {/* Cart Trigger with Terracotta Accent */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2.5 text-xs sm:text-sm font-semibold text-[#242E2C] bg-white border border-[#D9D0C7] hover:border-[#62736F] transition py-2 px-3 sm:px-3.5 rounded-xl shadow-tactile active:scale-95 group"
            title="Open Bag"
          >
            <ShoppingBag className="w-4 h-4 text-[#62736F] group-hover:text-[#DB846E] transition-colors" />
            <span className="hidden sm:inline">Bag</span>
            <span className="font-mono font-bold text-xs text-white bg-[#DB846E] px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          </button>

        </div>
      </div>
    </header>
  );
}
