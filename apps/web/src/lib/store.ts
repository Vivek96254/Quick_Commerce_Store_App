import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'quickmart-auth',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

interface CartItem {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discountedPrice: number | null;
    unit: string;
    stockQuantity: number;
    isAvailable: boolean;
    images: Array<{ url: string; isPrimary: boolean }>;
  };
  itemTotal: number;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  isLoading: boolean;
  setCart: (cart: {
    items: CartItem[];
    itemCount: number;
    subtotal: number;
    deliveryFee: number;
    total: number;
  }) => void;
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
      isLoading: false,
      setCart: (cart) =>
        set({
          items: cart.items,
          itemCount: cart.itemCount,
          subtotal: cart.subtotal,
          deliveryFee: cart.deliveryFee,
          total: cart.total,
        }),
      addItem: (item) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId,
          );
          let newItems: CartItem[];

          if (existingIndex >= 0) {
            newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + item.quantity,
              itemTotal:
                (newItems[existingIndex].product.discountedPrice ||
                  newItems[existingIndex].product.price) *
                (newItems[existingIndex].quantity + item.quantity),
            };
          } else {
            newItems = [...state.items, item];
          }

          const subtotal = newItems.reduce((sum, i) => sum + i.itemTotal, 0);
          return {
            items: newItems,
            itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
            subtotal,
            total: subtotal + state.deliveryFee,
          };
        }),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter((i) => i.productId !== productId);
            const subtotal = newItems.reduce((sum, i) => sum + i.itemTotal, 0);
            return {
              items: newItems,
              itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
              subtotal,
              total: subtotal + state.deliveryFee,
            };
          }

          const newItems = state.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  itemTotal:
                    (item.product.discountedPrice || item.product.price) * quantity,
                }
              : item,
          );

          const subtotal = newItems.reduce((sum, i) => sum + i.itemTotal, 0);
          return {
            items: newItems,
            itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
            subtotal,
            total: subtotal + state.deliveryFee,
          };
        }),
      removeItem: (productId) =>
        set((state) => {
          const newItems = state.items.filter((i) => i.productId !== productId);
          const subtotal = newItems.reduce((sum, i) => sum + i.itemTotal, 0);
          return {
            items: newItems,
            itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
            subtotal,
            total: subtotal + state.deliveryFee,
          };
        }),
      clearCart: () =>
        set({
          items: [],
          itemCount: 0,
          subtotal: 0,
          total: 0,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'quickmart-cart',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
    },
  ),
);
