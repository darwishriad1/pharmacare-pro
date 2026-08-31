import { create } from 'zustand';
import { Product, CartItem, Customer, UnitType, SaleInvoice } from '../types';
import { db } from '../database/db';

export interface HeldInvoice {
  id: string;
  heldAt: string;
  customer?: Customer;
  items: CartItem[];
  overallDiscount: number;
  overallDiscountType: 'percentage' | 'fixed';
  notes?: string;
}

interface POSState {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  overallDiscount: number;
  overallDiscountType: 'percentage' | 'fixed';
  heldInvoices: HeldInvoice[];
  isPaymentModalOpen: boolean;
  isCustomerModalOpen: boolean;
  isHeldInvoicesModalOpen: boolean;
  isSaleSuccessModalOpen: boolean;
  isManualItemModalOpen: boolean;
  lastCompletedInvoice: SaleInvoice | null;
  barcodeSearchQuery: string;

  // Actions
  addItem: (product: Product, unitType?: UnitType, quantity?: number, customBatchId?: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemUnit: (itemId: string, unitType: UnitType) => void;
  updateItemDiscount: (itemId: string, percentage: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setOverallDiscount: (value: number, type?: 'percentage' | 'fixed') => void;
  setBarcodeSearchQuery: (query: string) => void;

  // Modals
  setPaymentModalOpen: (open: boolean) => void;
  setCustomerModalOpen: (open: boolean) => void;
  setHeldInvoicesModalOpen: (open: boolean) => void;
  setSaleSuccessModalOpen: (open: boolean) => void;
  setManualItemModalOpen: (open: boolean) => void;

  // Hold Invoices
  holdCurrentInvoice: (notes?: string) => boolean;
  restoreHeldInvoice: (id: string) => void;
  deleteHeldInvoice: (id: string) => void;

  // Checkout
  checkout: (
    paymentMethod: 'cash' | 'card' | 'credit' | 'mixed',
    paidAmount: number,
    cardAmount?: number,
    cashAmount?: number,
    cashierId?: string,
    cashierName?: string,
    notes?: string,
    customerOverride?: Customer | null
  ) => SaleInvoice | null;

  // Computations
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getGrandTotal: () => number;
  playBeep: (type?: 'scan' | 'success' | 'error') => void;
}

// Audio beep helper
const playAudioFeedback = (type: 'scan' | 'success' | 'error' = 'scan') => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'scan') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Ignore audio context errors in restricted environments
  }
};

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  selectedCustomer: null,
  overallDiscount: 0,
  overallDiscountType: 'fixed',
  heldInvoices: [],
  isPaymentModalOpen: false,
  isCustomerModalOpen: false,
  isHeldInvoicesModalOpen: false,
  isSaleSuccessModalOpen: false,
  isManualItemModalOpen: false,
  lastCompletedInvoice: null,
  barcodeSearchQuery: '',

  playBeep: (type = 'scan') => {
    const settings = db.getSettings();
    if (settings.enableSoundEffects) {
      playAudioFeedback(type);
    }
  },

  addItem: (product: Product, unitType: UnitType = 'package', quantity = 1, customBatchId?: string) => {
    const { cart, playBeep } = get();

    // Get price and multiplier based on unit
    let unitPrice = product.price;
    let unitMultiplier = 1;
    let unitName = 'عبوة';

    if (unitType === 'strip') {
      unitPrice = product.stripPrice || Math.round(product.price / (product.stripsPerPackage || 1));
      unitMultiplier = 1 / (product.stripsPerPackage || 1);
      unitName = 'شريط';
    } else if (unitType === 'piece') {
      const strips = product.stripsPerPackage || 1;
      const pieces = product.piecesPerStrip || 10;
      unitPrice = product.piecePrice || Math.round(product.price / (strips * pieces));
      unitMultiplier = 1 / (strips * pieces);
      unitName = 'حبة';
    }

    // Find nearest expiry batch for display
    const batches = db.getBatchesForProduct(product.id);
    const chosenBatch = customBatchId
      ? batches.find((b) => b.id === customBatchId) || batches[0]
      : batches[0];

    // Check if item with same product and unit already in cart
    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.unitType === unitType && item.batchId === chosenBatch?.id
    );

    let updatedCart: CartItem[];

    if (existingIndex >= 0) {
      updatedCart = [...cart];
      const existing = updatedCart[existingIndex];
      const newQty = existing.quantity + quantity;
      const discountVal = (existing.unitPrice * newQty * existing.discountPercentage) / 100;
      const total = existing.unitPrice * newQty - discountVal;

      updatedCart[existingIndex] = {
        ...existing,
        quantity: newQty,
        discountAmount: discountVal,
        total,
      };
    } else {
      const discountVal = 0;
      const total = unitPrice * quantity;

      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product,
        batchId: chosenBatch?.id,
        batchNumber: chosenBatch?.batchNumber,
        expiryDate: chosenBatch?.expiryDate,
        unitType,
        unitName,
        unitMultiplier,
        quantity,
        unitPrice,
        discountPercentage: 0,
        discountAmount: discountVal,
        vatAmount: 0,
        total,
      };
      updatedCart = [newItem, ...cart];
    }

    playBeep('scan');
    set({ cart: updatedCart, barcodeSearchQuery: '' });
  },

  updateItemQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    const { cart } = get();
    const updated = cart.map((item) => {
      if (item.id === itemId) {
        const discountVal = (item.unitPrice * quantity * item.discountPercentage) / 100;
        const total = item.unitPrice * quantity - discountVal;
        return {
          ...item,
          quantity,
          discountAmount: discountVal,
          total,
        };
      }
      return item;
    });
    set({ cart: updated });
  },

  updateItemUnit: (itemId: string, unitType: UnitType) => {
    const { cart } = get();
    const updated = cart.map((item) => {
      if (item.id === itemId) {
        let unitPrice = item.product.price;
        let unitMultiplier = 1;
        let unitName = 'عبوة';

        if (unitType === 'strip') {
          unitPrice = item.product.stripPrice || Math.round(item.product.price / (item.product.stripsPerPackage || 1));
          unitMultiplier = 1 / (item.product.stripsPerPackage || 1);
          unitName = 'شريط';
        } else if (unitType === 'piece') {
          const strips = item.product.stripsPerPackage || 1;
          const pieces = item.product.piecesPerStrip || 10;
          unitPrice = item.product.piecePrice || Math.round(item.product.price / (strips * pieces));
          unitMultiplier = 1 / (strips * pieces);
          unitName = 'حبة';
        }

        const discountVal = (unitPrice * item.quantity * item.discountPercentage) / 100;
        const total = unitPrice * item.quantity - discountVal;

        return {
          ...item,
          unitType,
          unitName,
          unitMultiplier,
          unitPrice,
          discountAmount: discountVal,
          total,
        };
      }
      return item;
    });
    set({ cart: updated });
  },

  updateItemDiscount: (itemId: string, percentage: number) => {
    const validPct = Math.max(0, Math.min(100, percentage));
    const { cart } = get();
    const updated = cart.map((item) => {
      if (item.id === itemId) {
        const discountVal = (item.unitPrice * item.quantity * validPct) / 100;
        const total = item.unitPrice * item.quantity - discountVal;
        return {
          ...item,
          discountPercentage: validPct,
          discountAmount: discountVal,
          total,
        };
      }
      return item;
    });
    set({ cart: updated });
  },

  removeItem: (itemId: string) => {
    const { cart } = get();
    set({ cart: cart.filter((item) => item.id !== itemId) });
  },

  clearCart: () => {
    set({
      cart: [],
      selectedCustomer: null,
      overallDiscount: 0,
      barcodeSearchQuery: '',
    });
  },

  setCustomer: (customer: Customer | null) => {
    set({ selectedCustomer: customer });
  },

  setOverallDiscount: (value: number, type: 'percentage' | 'fixed' = 'fixed') => {
    set({
      overallDiscount: Math.max(0, value),
      overallDiscountType: type,
    });
  },

  setBarcodeSearchQuery: (query: string) => {
    set({ barcodeSearchQuery: query });
  },

  setPaymentModalOpen: (open: boolean) => set({ isPaymentModalOpen: open }),
  setCustomerModalOpen: (open: boolean) => set({ isCustomerModalOpen: open }),
  setHeldInvoicesModalOpen: (open: boolean) => set({ isHeldInvoicesModalOpen: open }),
  setSaleSuccessModalOpen: (open: boolean) => set({ isSaleSuccessModalOpen: open }),
  setManualItemModalOpen: (open: boolean) => set({ isManualItemModalOpen: open }),

  // Hold current invoice
  holdCurrentInvoice: (notes?: string) => {
    const { cart, selectedCustomer, overallDiscount, overallDiscountType, heldInvoices } = get();
    if (cart.length === 0) return false;

    const newHeld: HeldInvoice = {
      id: `held-${Date.now()}`,
      heldAt: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      customer: selectedCustomer || undefined,
      items: [...cart],
      overallDiscount,
      overallDiscountType,
      notes,
    };

    set({
      heldInvoices: [newHeld, ...heldInvoices],
      cart: [],
      selectedCustomer: null,
      overallDiscount: 0,
    });

    get().playBeep('success');
    return true;
  },

  restoreHeldInvoice: (id: string) => {
    const { heldInvoices } = get();
    const target = heldInvoices.find((h) => h.id === id);
    if (!target) return;

    set({
      cart: target.items,
      selectedCustomer: target.customer || null,
      overallDiscount: target.overallDiscount,
      overallDiscountType: target.overallDiscountType,
      heldInvoices: heldInvoices.filter((h) => h.id !== id),
      isHeldInvoicesModalOpen: false,
    });
  },

  deleteHeldInvoice: (id: string) => {
    const { heldInvoices } = get();
    set({ heldInvoices: heldInvoices.filter((h) => h.id !== id) });
  },

  // Computations
  getSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  },

  getTotalDiscount: () => {
    const { cart, overallDiscount, overallDiscountType, getSubtotal } = get();
    const itemDiscounts = cart.reduce((sum, item) => sum + item.discountAmount, 0);
    const subtotal = getSubtotal();

    let extraDiscount = 0;
    if (overallDiscount > 0) {
      if (overallDiscountType === 'percentage') {
        extraDiscount = ((subtotal - itemDiscounts) * overallDiscount) / 100;
      } else {
        extraDiscount = overallDiscount;
      }
    }
    return itemDiscounts + extraDiscount;
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getTotalDiscount();
    const settings = db.getSettings();
    const vatRate = settings.enableVat ? (settings.vatPercentage || 0) / 100 : 0;

    const afterDiscount = Math.max(0, subtotal - discount);
    const vat = afterDiscount * vatRate;
    return Math.round(afterDiscount + vat);
  },

  checkout: (
    paymentMethod,
    paidAmount,
    cardAmount,
    cashAmount,
    cashierId = 'usr-1',
    cashierName = 'كاشير الصيدلية',
    notes,
    customerOverride
  ) => {
    const { cart, selectedCustomer, getSubtotal, getTotalDiscount, getGrandTotal, clearCart, playBeep } = get();
    if (cart.length === 0) return null;

    const subtotal = getSubtotal();
    const totalDiscount = getTotalDiscount();
    const grandTotal = getGrandTotal();
    const settings = db.getSettings();
    const vatTotal = settings.enableVat ? Math.round(grandTotal * (settings.vatPercentage / (100 + settings.vatPercentage))) : 0;

    const changeAmount = paymentMethod === 'cash' ? Math.max(0, paidAmount - grandTotal) : 0;

    const actualPaidAmount =
      paymentMethod === 'credit'
        ? Math.max(0, Math.min(paidAmount ?? 0, grandTotal))
        : paymentMethod === 'cash'
        ? Math.min(paidAmount ?? grandTotal, grandTotal)
        : paymentMethod === 'mixed'
        ? Math.min(paidAmount ?? grandTotal, grandTotal)
        : grandTotal;

    const activeCustomer = customerOverride !== undefined ? customerOverride : selectedCustomer;

    const invoice = db.createSaleInvoice({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      customerId: activeCustomer?.id,
      customerName: activeCustomer?.name || 'عميل نقدي',
      patientName: activeCustomer?.name || (notes && notes.startsWith('المريض: ') ? notes.replace('المريض: ', '') : undefined) || 'عميل نقدي',
      items: cart,
      subtotal,
      totalDiscount,
      vatTotal,
      grandTotal,
      paidAmount: actualPaidAmount,
      changeAmount,
      paymentMethod,
      cardAmount,
      cashAmount,
      status: 'completed',
      cashierId,
      cashierName,
      notes,
    });

    playBeep('success');
    set({
      lastCompletedInvoice: invoice,
      isPaymentModalOpen: false,
      isSaleSuccessModalOpen: true,
    });

    clearCart();
    return invoice;
  },
}));
