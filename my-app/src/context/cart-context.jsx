import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './auth-context';
import {
  ApiError,
  addToCartRequest,
  clearCartRequest,
  getCartRequest,
  removeFromCartRequest,
  updateCartItemRequest,
} from '../services/api';

const CartContext = createContext(null);

// Matches the backend's uniqueness rule: product + size + color = one line.
const lineKey = (productId, size, color) => `${productId}__${size ?? ''}__${color ?? ''}`;

function mapCart(cart) {
  return (cart?.items || [])
    .filter((it) => it.product) // guard against a since-deleted product
    .map((it) => ({
      key: lineKey(it.product._id, it.selectedSize, it.selectedColor),
      productId: it.product._id,
      name: it.product.name,
      brand: it.product.brand,
      price: it.product.price,
      image: it.product.images?.[0],
      stock: it.product.stock,
      size: it.selectedSize || null,
      color: it.selectedColor || null,
      qty: it.quantity,
    }));
}

export function CartProvider({ children }) {
  // Requires AuthProvider to be an ANCESTOR of CartProvider in _layout.jsx.
  const { token, isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const busy = useRef(new Set()); // line keys with a mutation in flight

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const res = await getCartRequest(token);
      setItems(mapCart(res.data));
    } catch {
      // non-fatal — the cart just keeps whatever it last had
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  // Load once whenever auth state changes (login/logout).
  // The Cart screen also calls `refresh()` on focus — see cart.jsx.
  useEffect(() => {
    load();
  }, [load]);

  const addItem = useCallback(
    async (product, qty = 1, options = {}) => {
      if (!isAuthenticated) {
        Alert.alert('Log in required', 'Log in to add items to your bag.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Log in', onPress: () => router.push('/(auth)/login') },
        ]);
        return { ok: false };
      }
      try {
        const res = await addToCartRequest(token, {
          productId: product._id ?? product.id,
          quantity: qty,
          selectedSize: options.size,
          selectedColor: options.color,
        });
        setItems(mapCart(res.data));
        return { ok: true };
      } catch (e) {
        const message = e instanceof ApiError ? e.message : 'Could not add this item to your bag.';
        Alert.alert('Cart', message);
        return { ok: false, message };
      }
    },
    [isAuthenticated, token]
  );

  const changeQty = useCallback(
    async (key, delta) => {
      const line = items.find((l) => l.key === key);
      if (!line || busy.current.has(key)) return;

      const nextQty = line.qty + delta;
      if (nextQty < 1) return; // screen should call removeItem instead

      busy.current.add(key);
      const prevItems = items;
      setItems((prev) => prev.map((l) => (l.key === key ? { ...l, qty: nextQty } : l)));

      try {
        const res = await updateCartItemRequest(token, line.productId, {
          quantity: nextQty,
          selectedSize: line.size,
          selectedColor: line.color,
        });
        setItems(mapCart(res.data));
      } catch (e) {
        setItems(prevItems); // rollback — e.g. "Only 3 in stock"
        Alert.alert('Cart', e instanceof ApiError ? e.message : 'Could not update quantity.');
      } finally {
        busy.current.delete(key);
      }
    },
    [items, token]
  );

  const removeItem = useCallback(
    async (key) => {
      const line = items.find((l) => l.key === key);
      if (!line || busy.current.has(key)) return;
      busy.current.add(key);

      const prevItems = items;
      setItems((prev) => prev.filter((l) => l.key !== key));

      try {
        const res = await removeFromCartRequest(token, line.productId, {
          selectedSize: line.size,
          selectedColor: line.color,
        });
        setItems(mapCart(res.data));
      } catch (e) {
        setItems(prevItems); // rollback
        Alert.alert('Cart', e instanceof ApiError ? e.message : 'Could not remove that item.');
      } finally {
        busy.current.delete(key);
      }
    },
    [items, token]
  );

  const clear = useCallback(async () => {
    if (!isAuthenticated) return;
    const prevItems = items;
    setItems([]); // optimistic
    try {
      await clearCartRequest(token);
    } catch (e) {
      setItems(prevItems);
      Alert.alert('Cart', e instanceof ApiError ? e.message : 'Could not clear your bag.');
    }
  }, [isAuthenticated, token, items]);

  const count = useMemo(() => items.reduce((n, l) => n + l.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, count, loading, addItem, changeQty, removeItem, clear, refresh: load }),
    [items, count, loading, addItem, changeQty, removeItem, clear, load]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart() must be called from inside a <CartProvider>');
  return ctx;
}