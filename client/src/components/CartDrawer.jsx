import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ onNavigate }) {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Opaque backdrop */}
      <div 
        className="absolute inset-0 bg-[#242E2C]/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-16">
        <div className="w-screen max-w-md bg-[#FAF8F5] border-l border-[#D9D0C7] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#D9D0C7] flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2.5">
              <ShoppingBag className="w-5 h-5 text-[#62736F]" />
              <h2 className="text-base font-bold text-[#242E2C] tracking-tight">Your Provisions Bag</h2>
              <span className="font-mono font-bold text-xs text-white bg-[#DB846E] px-2 py-0.5 rounded-full shadow-xs">
                {totalItems}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-[#62736F] hover:text-[#242E2C] p-1.5 rounded-lg hover:bg-[#D9D0C7]/40 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Item rows */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#FAF8F5]">
            {items.length === 0 ? (
              <div className="text-center py-24 flex flex-col items-center justify-center text-[#62736F]">
                <div className="w-14 h-14 bg-white text-[#62736F] rounded-2xl flex items-center justify-center mb-3 border border-[#D9D0C7] shadow-tactile">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-[#242E2C] mb-1">Your bag is empty</p>
                <p className="text-xs text-[#62736F] max-w-xs mb-6">
                  Select snacks, refreshments, or supplies from the store catalog.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 bg-[#DB846E] hover:bg-[#C76F59] text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Browse Campus Store
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.itemId}
                    className="p-3.5 rounded-xl bg-white border border-[#D9D0C7] shadow-tactile flex items-start space-x-3.5"
                  >
                    {/* Thumbnail */}
                    <img
                      src={item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=80"}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg bg-[#F4EFEB] border border-[#D9D0C7] flex-shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=80";
                      }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#242E2C] truncate">{item.name}</h4>
                        <button
                          onClick={() => removeFromCart(item.itemId)}
                          className="text-[#8C9B97] hover:text-[#DB846E] transition p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="font-mono font-bold text-xs text-[#DB846E] mb-2.5">₹{item.price}</p>
                      
                      {/* Stepper */}
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#D9D0C7] rounded-lg bg-[#FAF8F5]">
                          <button
                            onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-[#D9D0C7]/50 text-[#242E2C] font-bold text-xs transition rounded-l-lg"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 font-mono text-xs font-bold text-[#242E2C] min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                            disabled={item.quantity >= item.stockQuantity}
                            className="px-2 py-1 hover:bg-[#D9D0C7]/50 text-[#242E2C] font-bold text-xs transition rounded-r-lg disabled:opacity-30"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono font-bold text-sm text-[#242E2C]">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="border-t border-[#D9D0C7] p-6 bg-white space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#62736F] font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-[#242E2C]">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between text-[#62736F] font-medium">
                  <span>Counter collection</span>
                  <span className="text-[#62736F] font-semibold">Pay cash / UPI at counter</span>
                </div>
                <div className="border-t border-[#D9D0C7]/60 pt-3 flex justify-between items-baseline text-base font-bold text-[#242E2C]">
                  <span>Total Due</span>
                  <span className="font-mono font-bold text-xl text-[#DB846E]">₹{totalPrice}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigate('checkout');
                }}
                className="w-full py-3.5 px-4 bg-[#DB846E] hover:bg-[#C76F59] text-white text-sm font-semibold tracking-wide rounded-xl shadow-tactile transition flex items-center justify-center space-x-2 group active:scale-95"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-center text-[11px] text-[#62736F] font-medium">
                Generates a single-use pickup code to present at the counter.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
