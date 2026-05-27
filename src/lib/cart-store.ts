import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name_bn: string;
  price: number;
  image: string;
  qty: number;
};

type State = {
  items: CartItem[];
  add: (i: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      add: (i, qty = 1) =>
        set((s) => {
          const existing = s.items.find((x) => x.productId === i.productId);
          if (existing) {
            return {
              items: s.items.map((x) =>
                x.productId === i.productId ? { ...x, qty: x.qty + qty } : x,
              ),
            };
          }
          return { items: [...s.items, { ...i, qty }] };
        }),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((x) => x.productId !== productId) })),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items
            .map((x) => (x.productId === productId ? { ...x, qty } : x))
            .filter((x) => x.qty > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((a, b) => a + b.qty, 0),
      subtotal: () => get().items.reduce((a, b) => a + b.qty * b.price, 0),
    }),
    { name: "medi-cart" },
  ),
);
