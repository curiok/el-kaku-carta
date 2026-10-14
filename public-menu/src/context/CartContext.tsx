import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, CartItemOption, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, options: CartItemOption[]) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'kaku_public_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('Could not save cart to sessionStorage:', err);
    }
  }, [items]);

  const generateCartItemId = (productId: string, options: CartItemOption[]) => {
    const sortedOptionKeys = [...options]
      .map(o => `${o.groupId}:${o.optionId}`)
      .sort()
      .join('|');
    return `${productId}__${sortedOptionKeys}`;
  };

  const addItem = (product: Product, quantity: number, options: CartItemOption[]) => {
    if (quantity <= 0) return;

    const cartItemId = generateCartItemId(product.id, options);
    const optionsSum = options.reduce((sum, opt) => sum + (opt.additionalPrice || 0), 0);
    const unitFinalPrice = product.basePrice + optionsSum;

    setItems(prev => {
      const existingIdx = prev.findIndex(item => item.cartItemId === cartItemId);
      if (existingIdx !== -1) {
        // Update quantity of existing identical configuration
        const copy = [...prev];
        const updatedQty = copy[existingIdx].quantity + quantity;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: updatedQty,
          subtotal: copy[existingIdx].unitFinalPrice * updatedQty
        };
        return copy;
      }

      // Add new item
      const mainImg = product.images && product.images.length > 0
        ? product.images[product.mainImageIndex || 0] || product.images[0]
        : '';

      const newItem: CartItem = {
        cartItemId,
        productId: product.id,
        productName: product.name,
        productImage: mainImg,
        unitBasePrice: product.basePrice,
        unitFinalPrice,
        quantity,
        selectedOptions: options,
        subtotal: unitFinalPrice * quantity
      };

      return [...prev, newItem];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems(prev => {
      return prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: item.unitFinalPrice * newQty
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItemsCount = items.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItemsCount,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
