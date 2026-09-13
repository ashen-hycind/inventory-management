import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminNavbar({ onNavigate, currentPage }) {
  const { currentUser, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#D9D0C7] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => onNavigate('admin-dashboard')}
          className="flex items-center space-x-3.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 bg-[#242E2C] text-white rounded-xl flex items-center justify-center shadow-tactile transition-all duration-200">
            <ShieldCheck className="w-5 h-5 text-[#FAF8F5] stroke-[2]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#242E2C] tracking-tight">
                VMart Staff Portal
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#DB846E]" />
            </div>
            <p className="text-[11px] text-[#62736F] font-medium tracking-wide">Operations & Counter Fulfillment</p>
          </div>
        </div>

        {/* Right Actions for Staff */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#62736F] bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#D9D0C7]">
                <ShieldCheck className="w-4 h-4 text-[#9FAD9F]" />
                <span>{currentUser?.email || 'admin@vmart.com'}</span>
              </div>
              
              <button
                onClick={async () => {
                  await logout();
                  onNavigate('admin-login');
                }}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-[#62736F] hover:text-[#DB846E] hover:bg-[#E8B5A7]/30 border border-[#D9D0C7] transition"
                title="Sign out staff session"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono font-medium text-[#62736F]">
              Restricted Staff Access
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
