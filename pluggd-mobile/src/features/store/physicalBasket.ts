import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { HostedCheckoutState } from '../../commerce/policy';
import { supabase } from '../../lib/supabase';

export type BasketOptionSelection = Record<string, string>;

export type PhysicalBasketProduct = {
  productId: string;
  title: string;
  imageUrl: string | null;
  unitPrice: number;
  productType: string;
  stockQuantity: number | null;
  selectedOptions: BasketOptionSelection;
};

export type PhysicalBasketLine = PhysicalBasketProduct & {
  key: string;
  quantity: number;
};

type AddBasketResult = 'added' | 'line_limit' | 'sold_out';

type PhysicalBasketState = {
  lines: PhysicalBasketLine[];
  addLine: (product: PhysicalBasketProduct, quantity?: number) => AddBasketResult;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
};

export const MAX_PHYSICAL_BASKET_LINES = 20;
export const MAX_PHYSICAL_LINE_QUANTITY = 4;

function normaliseOptions(options: BasketOptionSelection): BasketOptionSelection {
  return Object.fromEntries(
    Object.entries(options)
      .map(([key, value]) => [key.trim(), value.trim()] as const)
      .filter(([key, value]) => Boolean(key && value))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function physicalBasketLineKey(productId: string, options: BasketOptionSelection) {
  return `${productId}:${JSON.stringify(normaliseOptions(options))}`;
}

function lineLimit(line: Pick<PhysicalBasketLine, 'stockQuantity'>) {
  const stock = line.stockQuantity;
  return Math.max(0, Math.min(MAX_PHYSICAL_LINE_QUANTITY, stock == null ? MAX_PHYSICAL_LINE_QUANTITY : stock));
}

export const usePhysicalBasketStore = create<PhysicalBasketState>()(
  persist(
    (set, get) => ({
      lines: [],
      addLine: (product, requestedQuantity = 1) => {
        const selectedOptions = normaliseOptions(product.selectedOptions);
        const key = physicalBasketLineKey(product.productId, selectedOptions);
        const existing = get().lines.find((line) => line.key === key);
        const maximum = lineLimit({ stockQuantity: product.stockQuantity });
        if (maximum < 1) return 'sold_out';
        if (!existing && get().lines.length >= MAX_PHYSICAL_BASKET_LINES) return 'line_limit';

        const quantity = Math.max(
          1,
          Math.min(maximum, (existing?.quantity ?? 0) + Math.max(1, Math.floor(requestedQuantity))),
        );
        const nextLine: PhysicalBasketLine = {
          ...product,
          selectedOptions,
          key,
          quantity,
        };
        set((state) => ({
          lines: existing
            ? state.lines.map((line) => (line.key === key ? nextLine : line))
            : [...state.lines, nextLine],
        }));
        return 'added';
      },
      setQuantity: (key, requestedQuantity) => set((state) => ({
        lines: state.lines.map((line) => {
          if (line.key !== key) return line;
          const maximum = lineLimit(line);
          return { ...line, quantity: Math.max(1, Math.min(maximum, Math.floor(requestedQuantity))) };
        }),
      })),
      removeLine: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'pluggd:physical-basket:v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

export function physicalBasketCount(lines: PhysicalBasketLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function physicalBasketSubtotal(lines: PhysicalBasketLine[]) {
  return lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
}

export type PhysicalOrderReconciliation = {
  state: HostedCheckoutState;
  orderId: string | null;
  message: string;
};

export async function reconcilePhysicalBasketOrder(sessionId: string): Promise<PhysicalOrderReconciliation> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return {
      state: 'failed',
      orderId: null,
      message: 'Sign in with the account used at checkout to verify this order.',
    };
  }

  const selectOrder = async (column: 'stripe_session_id' | 'payment_id') => (supabase as any)
    .from('orders')
    .select('id,status')
    .eq('user_id', authData.user!.id)
    .eq(column, sessionId)
    .maybeSingle();

  let result = await selectOrder('stripe_session_id');
  if (!result.data && !result.error) result = await selectOrder('payment_id');
  if (result.error) {
    return {
      state: 'pending',
      orderId: null,
      message: 'Payment received. PLUGGD is waiting for verified order confirmation.',
    };
  }
  if (!result.data) {
    return {
      state: 'pending',
      orderId: null,
      message: 'The payment provider has not linked the order yet. Check again shortly.',
    };
  }

  const status = String(result.data.status || 'pending').toLowerCase();
  if (status === 'completed') {
    return { state: 'success', orderId: result.data.id, message: 'Payment verified and your Store order is confirmed.' };
  }
  if (status === 'cancelled') {
    return { state: 'cancelled', orderId: result.data.id, message: 'Checkout was cancelled and the basket was not charged.' };
  }
  if (status === 'refunded') {
    return { state: 'failed', orderId: result.data.id, message: 'This order was refunded.' };
  }
  return {
    state: 'pending',
    orderId: result.data.id,
    message: 'Payment is still being confirmed by the provider.',
  };
}
