import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('hostel_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('hostel_shop_cart', JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [items]);

  const addToCart = (product, quantityToAdd = 1) => {
    setItems((prevItems) => {
      const existing = prevItems.find((i) => i.itemId === product.itemId);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantityToAdd, product.stockQuantity);
        return prevItems.map((i) =>
          i.itemId === product.itemId ? { ...i, quantity: newQty } : i
        );
      }
      return [
        ...prevItems,
        {
          itemId: product.itemId,
          name: product.name,
          price: Number(product.price),
          stockQuantity: Number(product.stockQuantity),
          imageUrl: product.imageUrl,
          quantity: Math.min(quantityToAdd, product.stockQuantity)
        }
      ];
    });
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const clamped = Math.min(newQuantity, item.stockQuantity);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const removeFromCart = (itemId) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
