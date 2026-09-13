import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { api } from '../services/api';

export default function Checkout({ onNavigate, onOrderSuccess, onOpenAuthModal, showToast }) {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { currentStudent, isAuthenticated } = useStudentAuth();
  
  const [studentName, setStudentName] = useState(currentStudent?.displayName || '');
  const [studentEmail, setStudentEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentStudent?.displayName && !studentName) {
      setStudentName(currentStudent.displayName);
    }
  }, [currentStudent]);

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="text-lg font-bold text-[#242E2C] mb-2">Your provisions bag is empty</h2>
        <p className="text-xs text-[#62736F] mb-6">
          Add some items from the catalog before completing your order.
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="px-5 py-2.5 bg-[#DB846E] hover:bg-[#C76F59] text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!studentName.trim()) {
      setErrorMessage('Please enter your full name for counter pickup.');
      return;
    }

    try {
      setIsSubmitting(true);

      const itemsOrdered = items.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity
      }));

      const result = await api.createOrder({
        studentName: studentName.trim(),
        studentUsername: currentStudent?.username || "",
        studentEmail: studentEmail.trim(),
        itemsOrdered
      });

      clearCart();
      onOrderSuccess(result);
    } catch (err) {
      console.error('Order checkout failed:', err);
      setErrorMessage(err.message || 'Unable to place order. Please check item stock.');
      showToast?.({ type: 'error', message: err.message || 'Checkout failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-reveal">
      
      {/* Back Link */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate('shop')}
          className="inline-flex items-center text-xs font-semibold text-[#62736F] hover:text-[#242E2C] transition group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" /> Back to Store
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Student Details */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#D9D0C7] shadow-tactile space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#242E2C] tracking-tight">
              Pickup & Verification Details
            </h2>
            <p className="text-xs text-[#62736F] mt-1.5 font-normal">
              Enter your name so the shop staff can verify your order when you collect it at the counter.
            </p>
          </div>

          {/* Student Session Link Banner */}
          {isAuthenticated ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Linked to your student account: <strong>@{currentStudent.username}</strong>
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">Code will be saved</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#D9D0C7] text-xs text-[#62736F] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#DB846E] flex-shrink-0" />
                <span>Want to see your pickup code if you accidentally close this tab?</span>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="text-xs font-bold text-[#DB846E] hover:underline underline-offset-4 cursor-pointer text-left"
              >
                Sign in / Create Account
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-[#FDF4F2] border border-[#E8B5A7] text-[#DB846E] text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#62736F] mb-1.5">
                Full Name <span className="text-[#DB846E]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aryan Sharma"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none text-xs text-[#242E2C] font-semibold placeholder:text-[#8C9B97] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#62736F] mb-1.5">
                Campus Email <span className="text-[#8C9B97] font-normal lowercase">(optional, for records)</span>
              </label>
              <input
                type="email"
                placeholder="student@college.edu"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none text-xs text-[#242E2C] font-medium placeholder:text-[#8C9B97] transition"
              />
            </div>

            {/* Collection Terms in Soft Oatmeal / Sage */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D9D0C7] flex items-start gap-3 text-xs text-[#62736F] leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-[#62736F] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#242E2C] block font-semibold mb-0.5">Pay at Counter (Zero Advance Digital Payment):</strong>
                Placing this order immediately reserves inventory and gives you a single-use pickup code to present at the store counter.
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#DB846E] hover:bg-[#C76F59] text-white text-sm font-semibold tracking-wide rounded-xl shadow-tactile transition flex items-center justify-center space-x-2 disabled:opacity-60 active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reserving stock & generating code...</span>
                  </>
                ) : (
                  <span>Place Order & Get Pickup Code (₹{totalPrice})</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Summary: Cart Ledger */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-[#D9D0C7] p-6 space-y-5 sticky top-24 shadow-tactile">
            <div className="flex items-baseline justify-between pb-3 border-b border-[#D9D0C7]/60">
              <h3 className="font-display text-base font-bold text-[#242E2C]">Order Summary</h3>
              <span className="font-mono text-xs font-semibold text-[#62736F] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#D9D0C7]">
                {totalItems} items
              </span>
            </div>

            <div className="divide-y divide-[#D9D0C7]/40 max-h-64 overflow-y-auto pr-1 text-xs">
              {items.map((item) => (
                <div key={item.itemId} className="py-3 flex justify-between items-baseline">
                  <div>
                    <p className="font-semibold text-[#242E2C]">{item.name}</p>
                    <p className="font-mono text-[11px] text-[#62736F]">Qty: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <span className="font-mono font-bold text-[#242E2C]">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#D9D0C7]/60 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#62736F] font-medium">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-[#242E2C]">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-[#62736F] font-medium">
                <span>Counter Packing</span>
                <span className="font-semibold text-[#62736F] uppercase tracking-wider text-[11px]">FREE</span>
              </div>
              <div className="pt-3 border-t border-[#D9D0C7]/60 flex justify-between items-baseline text-[#242E2C]">
                <span className="font-display font-bold text-base">Total Due</span>
                <span className="font-mono font-bold text-2xl text-[#DB846E]">₹{totalPrice}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
