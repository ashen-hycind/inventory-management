import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import ItemCard from '../components/ItemCard';
import { useCart } from '../context/CartContext';

export default function ShopHome({ onNavigate, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const { totalItems, setIsCartOpen, totalPrice, addToCart } = useCart();

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
      showToast?.({ type: 'error', message: 'Could not load items: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category || 'general').filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (item.category || 'general') === selectedCategory;
    const matchesStock = onlyInStock ? item.stockQuantity > 0 : true;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const spotlightItem = items.find((i) => i.name?.toLowerCase().includes('maggi')) || items[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      
      {/* Distinctive Editorial Campus Shop Hero */}
      <div className="animate-reveal bg-[#62736F] rounded-3xl p-6 sm:p-10 mb-10 text-[#FAF8F5] relative overflow-hidden shadow-tactile border border-[#4F5D59]">
        {/* Subtle decorative atmosphere */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#DB846E]/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-20 w-72 h-72 rounded-full bg-[#9FAD9F]/20 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-mono tracking-wider uppercase text-[#D9D0C7] font-medium">
              Campus Provisions & Goods
            </p>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] text-white">
              Daily essentials, snacks & study supplies.
            </h1>

            <p className="text-xs sm:text-sm text-[#E4E9E8] font-normal max-w-xl leading-relaxed">
              Check live inventory available in the on-campus store. Add items to your bag, place an order to reserve your stock, and collect directly at the shop counter.
            </p>
          </div>

          {/* Right Featured Card */}
          {spotlightItem && (
            <div className="lg:col-span-5">
              <div className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 shadow-tactile border border-[#D9D0C7] text-[#242E2C] flex items-center space-x-4">
                <img
                  src={spotlightItem.imageUrl || "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80"}
                  alt={spotlightItem.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-[#EDE7E0] border border-[#D9D0C7] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#62736F] font-semibold block">
                    Featured Item
                  </span>
                  <h3 className="font-sans text-base sm:text-lg font-bold text-[#242E2C] truncate mt-0.5">
                    {spotlightItem.name}
                  </h3>
                  <p className="font-mono text-xs sm:text-sm text-[#62736F] mt-0.5">
                    <span className="font-bold text-[#242E2C]">₹{spotlightItem.price}</span> · {spotlightItem.stockQuantity} in stock
                  </p>
                  
                  <button
                    onClick={() => {
                      addToCart(spotlightItem);
                      showToast?.({ type: 'success', message: `Added ${spotlightItem.name} to bag!` });
                    }}
                    className="mt-3 text-xs font-semibold bg-[#DB846E] hover:bg-[#C76F59] text-white px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Add to Bag</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Control Bar: Categories & Search */}
      <div className="animate-reveal delay-1 bg-white rounded-2xl border border-[#D9D0C7] p-4 shadow-tactile mb-8 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Chips with Palette Colors */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-semibold capitalize tracking-wide transition-all whitespace-nowrap px-4 py-2 rounded-xl border ${
                    isSelected 
                      ? 'bg-[#DB846E] text-white border-[#DB846E] shadow-sm' 
                      : 'bg-[#FAF8F5] text-[#62736F] border-[#D9D0C7] hover:border-[#62736F] hover:text-[#242E2C]'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              );
            })}
          </div>

          {/* Search & In-Stock */}
          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C9B97]" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-2 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none text-xs text-[#242E2C] font-medium placeholder:text-[#8C9B97] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8C9B97] hover:text-[#242E2C]"
                >
                  Clear
                </button>
              )}
            </div>

            <label className="flex items-center space-x-2 text-xs font-semibold text-[#62736F] cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded border-[#D9D0C7] text-[#DB846E] focus:ring-0 focus:ring-offset-0"
              />
              <span>In-stock only</span>
            </label>
          </div>

        </div>
      </div>

      {/* Product Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white border border-[#D9D0C7] rounded-2xl p-4 animate-pulse">
              <div className="aspect-[4/3] bg-[#EDE7E0] rounded-xl mb-3" />
              <div className="h-4 bg-[#EDE7E0] rounded w-2/3 mb-2" />
              <div className="h-4 bg-[#EDE7E0] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center max-w-sm mx-auto bg-white rounded-3xl border border-[#D9D0C7] p-8 shadow-tactile">
          <p className="text-base font-bold text-[#242E2C] mb-1">No products found</p>
          <p className="text-xs text-[#62736F] mb-6">
            We couldn't find items matching "{searchQuery}".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setOnlyInStock(false);
            }}
            className="px-5 py-2.5 bg-[#DB846E] hover:bg-[#C76F59] text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item, index) => (
            <div 
              key={item.itemId} 
              className="animate-reveal"
              style={{ animationDelay: `${Math.min(index * 35 + 40, 350)}ms` }}
            >
              <ItemCard item={item} />
            </div>
          ))}
        </div>
      )}

      {/* Floating Bottom Bag Pill */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#242E2C] text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-5 border border-[#4F5D59] animate-reveal text-xs">
          <div className="flex items-center space-x-2.5">
            <span className="font-mono font-bold text-xs text-[#E8B5A7]">{totalItems} in bag</span>
            <span className="text-[#62736F]">|</span>
            <span className="font-mono font-bold text-sm text-white">₹{totalPrice}</span>
          </div>
          
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-1.5 font-semibold bg-[#DB846E] hover:bg-[#C76F59] text-white px-4 py-1.5 rounded-full shadow-xs transition active:scale-95"
          >
            <span>View Bag</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

    </div>
  );
}
