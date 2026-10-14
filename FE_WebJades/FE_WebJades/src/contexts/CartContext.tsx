import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartProductInput = {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  categoryName?: string;
  price?: number;
  salePrice?: number;
  image?: string;
  shortDescription?: string;
};

export type CartItem = CartProductInput & {
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  isCartOpen: boolean;
  addToCart: (product: CartProductInput, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => void;
};

const CART_STORAGE_KEY = "king_jades_cart";

const CartContext = createContext<CartContextValue | null>(null);

const readCartStorage = (): CartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && item.id && item.name)
      .map((item) => ({
        ...item,
        id: String(item.id),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));
  } catch {
    return [];
  }
};

const writeCartStorage = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("king-jades-cart-updated"));
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => readCartStorage());
  const [isCartOpen, setIsCartOpen] = useState(false);

  const persist = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
    writeCartStorage(nextItems);
  }, []);

  const refreshCart = useCallback(() => {
    setItems(readCartStorage());
  }, []);

  const addToCart = useCallback(
    (product: CartProductInput, quantity = 1) => {
      if (!product?.id) return;

      setItems((prev) => {
        const existed = prev.find((item) => item.id === product.id);
        const safeQuantity = Math.max(1, quantity);

        const nextItems = existed
          ? prev.map((item) =>
              item.id === product.id
                ? { ...item, ...product, quantity: item.quantity + safeQuantity }
                : item,
            )
          : [...prev, { ...product, quantity: safeQuantity }];

        writeCartStorage(nextItems);
        return nextItems;
      });

      setIsCartOpen(true);
    },
    [],
  );

  const removeFromCart = useCallback(
    (id: string) => {
      persist(items.filter((item) => item.id !== id));
    },
    [items, persist],
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      const safeQuantity = Math.max(1, quantity);
      persist(
        items.map((item) =>
          item.id === id ? { ...item, quantity: safeQuantity } : item,
        ),
      );
    },
    [items, persist],
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const openCart = useCallback(() => {
    refreshCart();
    setIsCartOpen(true);
  }, [refreshCart]);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  useEffect(() => {
    const handleStorage = () => refreshCart();
    const handleOpen = () => openCart();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("king-jades-cart-updated", handleStorage);
    window.addEventListener("king-jades-open-cart", handleOpen);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("king-jades-cart-updated", handleStorage);
      window.removeEventListener("king-jades-open-cart", handleOpen);
    };
  }, [openCart, refreshCart]);

  const cartCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      cartCount,
      isCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      refreshCart,
    }),
    [
      items,
      cartCount,
      isCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      refreshCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
};

export { CART_STORAGE_KEY };
