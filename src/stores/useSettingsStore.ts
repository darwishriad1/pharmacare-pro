import { create } from 'zustand';
import { PharmacySettings } from '../types';
import { db } from '../database/db';

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'invoices'
  | 'purchases'
  | 'customers'
  | 'reports'
  | 'expenses'
  | 'cashbox'
  | 'drawer'
  | 'settings';

export type PurchasesSubTab = 'create_invoice' | 'invoices' | 'suppliers';
export type CustomersSubTab = 'directory' | 'receipts' | 'statements' | 'reports';
export type InventorySubTab = 'batches' | 'products' | 'audit' | 'reorder' | 'expiry_hub' | 'valuation';

interface SettingsState {
  settings: PharmacySettings;
  activeTab: ActiveTab;
  purchasesSubTab: PurchasesSubTab;
  customersSubTab: CustomersSubTab;
  inventorySubTab: InventorySubTab;
  selectedCustomerIdForStatement: string | null;
  isNewCustomerModalTriggered: boolean;
  isQuickPayModalTriggered: boolean;
  isSidebarCollapsed: boolean;
  isShortcutsModalOpen: boolean;
  isNotificationDrawerOpen: boolean;
  isUserManagementModalOpen: boolean;
  toast: { message: string; type: 'success' | 'warning' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  hideToast: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setPurchasesSubTab: (subTab: PurchasesSubTab) => void;
  setCustomersSubTab: (subTab: CustomersSubTab) => void;
  setInventorySubTab: (subTab: InventorySubTab) => void;
  setSelectedCustomerIdForStatement: (id: string | null) => void;
  triggerNewCustomerModal: () => void;
  clearNewCustomerModalTrigger: () => void;
  triggerQuickPayModal: () => void;
  clearQuickPayModalTrigger: () => void;
  toggleSidebar: () => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setNotificationDrawerOpen: (open: boolean) => void;
  setUserManagementModalOpen: (open: boolean) => void;
  updateSettings: (newSettings: Partial<PharmacySettings>) => void;
  formatCurrency: (amount: number) => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  // Sync with DB
  const initial = db.getSettings();

  db.subscribe(() => {
    set({ settings: db.getSettings() });
  });

  return {
    settings: initial,
    activeTab: 'dashboard',
    purchasesSubTab: 'create_invoice',
    customersSubTab: 'directory',
    inventorySubTab: 'batches',
    selectedCustomerIdForStatement: null,
    isNewCustomerModalTriggered: false,
    isQuickPayModalTriggered: false,
    isSidebarCollapsed: false,
    isShortcutsModalOpen: false,
    isNotificationDrawerOpen: false,
    isUserManagementModalOpen: false,
    toast: null,
    showToast: (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
      set({ toast: { message, type } });
      setTimeout(() => {
        const current = get().toast;
        if (current && current.message === message) {
          set({ toast: null });
        }
      }, 3500);
    },
    hideToast: () => set({ toast: null }),
    setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),
    setPurchasesSubTab: (subTab: PurchasesSubTab) => set({ purchasesSubTab: subTab }),
    setCustomersSubTab: (subTab: CustomersSubTab) => set({ customersSubTab: subTab }),
    setInventorySubTab: (subTab: InventorySubTab) => set({ inventorySubTab: subTab }),
    setSelectedCustomerIdForStatement: (id: string | null) => set({ selectedCustomerIdForStatement: id }),
    triggerNewCustomerModal: () => set({ isNewCustomerModalTriggered: true }),
    clearNewCustomerModalTrigger: () => set({ isNewCustomerModalTriggered: false }),
    triggerQuickPayModal: () => set({ isQuickPayModalTriggered: true }),
    clearQuickPayModalTrigger: () => set({ isQuickPayModalTriggered: false }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setShortcutsModalOpen: (open: boolean) => set({ isShortcutsModalOpen: open }),
    setNotificationDrawerOpen: (open: boolean) => set({ isNotificationDrawerOpen: open }),
    setUserManagementModalOpen: (open: boolean) => set({ isUserManagementModalOpen: open }),

    updateSettings: (newSettings: Partial<PharmacySettings>) => {
      const updated = db.updateSettings(newSettings);
      set({ settings: updated });
    },

    formatCurrency: (amount: number | string | undefined | null) => {
      try {
        const { settings } = get();
        const symbol = settings?.currencySymbol || 'ر.ي';
        const num = typeof amount === 'number' ? (isNaN(amount) ? 0 : amount) : (parseFloat(String(amount)) || 0);
        const formatted = new Intl.NumberFormat('ar-YE', {
          maximumFractionDigits: 2,
        }).format(num);
        return `${formatted} ${symbol}`;
      } catch {
        const symbol = get().settings?.currencySymbol || 'ر.ي';
        const num = Number(amount) || 0;
        return `${num.toFixed(2)} ${symbol}`;
      }
    },
  };
});
