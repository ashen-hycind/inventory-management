import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ItemCard({ item }) {
  const { addToCart, updateQuantity, items } = useCart();

  const cartItem = items.find((i) => i.itemId === item.itemId);
  const currentInCart = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = item.stockQuantity <= 0;
  const isMaxInCart = currentInCart >= item.stockQuantity;

  return (
    <div className="group flex flex-col bg-white border border-[#D9D0C7] rounded-2xl overflow-hidden shadow-tactile hover:shadow-tactile-hover hover:-translate-y-1 transition-all duration-200">
      
      {/* Product Image Stage */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFEB]">
        <img
          src={item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80"}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80";
          }}
        />

        {/* Quiet Category Tag */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#FAF8F5]/90 text-[#62736F] border border-[#D9D0C7] backdrop-blur-xs capitalize">
            {item.category || "General"}
          </span>
        </div>
      </div>

      {/* Details & Actions */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white">
        <div>
          <h3 className="font-sans font-bold text-[#242E2C] text-base tracking-tight mb-1 group-hover:text-[#DB846E] transition-colors line-clamp-1">
            {item.name}
          </h3>

          {/* Simple text for remaining stock per user request */}
          <p className="text-xs font-mono font-medium mb-3">
            {isOutOfStock ? (
              <span className="text-[#DB846E]">Out of stock</span>
            ) : item.stockQuantity <= 5 ? (
              <span className="text-[#DB846E]">{item.stockQuantity} remaining</span>
            ) : (
              <span className="text-[#62736F]">{item.stockQuantity} in stock</span>
            )}
          </p>
        </div>

        <div className="pt-3 border-t border-[#D9D0C7]/50 flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#62736F]/70 block">Price</span>
            <span className="font-mono font-bold text-xl text-[#242E2C]">
              ₹{item.price}
            </span>
          </div>

          <div>
            {isOutOfStock ? (
              <span className="text-xs font-semibold text-[#8C9B97] bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#D9D0C7]">
                Unavailable
              </span>
            ) : currentInCart > 0 ? (
              /* Inline Tactile Stepper in Deep Slate */
              <div className="inline-flex items-center bg-[#62736F] text-white rounded-xl shadow-xs overflow-hidden border border-[#4F5D59]">
                <button
                  onClick={() => updateQuantity(item.itemId, currentInCart - 1)}
                  className="px-2.5 py-1.5 hover:bg-[#4F5D59] transition active:scale-95 text-white"
                  title="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="font-mono font-bold text-xs px-2 select-none min-w-[24px] text-center text-[#FAF8F5]">
                  {currentInCart}
                </span>
                <button
                  onClick={() => addToCart(item, 1)}
                  disabled={isMaxInCart}
                  className="px-2.5 py-1.5 hover:bg-[#4F5D59] transition disabled:opacity-30 active:scale-95 text-white"
                  title="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(item)}
                className="text-xs font-semibold py-2 px-3.5 rounded-xl bg-[#DB846E] hover:bg-[#C76F59] text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add to Bag</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
