import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Package2,
  Truck,
  FilePlus2,
  FileSpreadsheet,
  Users,
  UserPlus,
  Receipt,
  FileText,
  DollarSign,
  Wallet
} from 'lucide-react';
import { useSettingsStore, ActiveTab, PurchasesSubTab, CustomersSubTab } from '../../stores/useSettingsStore';
import { usePOSStore } from '../../stores/usePOSStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../database/db';

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  onClick: () => void;
  isActive: boolean;
  highlight?: boolean;
}

export const PharmacyTabBar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    purchasesSubTab,
    setPurchasesSubTab,
    customersSubTab,
    setCustomersSubTab,
    triggerNewCustomerModal,
    triggerQuickPayModal,
  } = useSettingsStore();

  const { cart } = usePOSStore();
  const [salesCount, setSalesCount] = useState(0);
  const [purchasesCount, setPurchasesCount] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [debtorsCount, setDebtorsCount] = useState(0);

  const refreshCounts = () => {
    setSalesCount(db.getSales().length);
    setPurchasesCount(db.getPurchases().length);
    setSuppliersCount(db.getSuppliers().length);
    const custs = db.getCustomers();
    setCustomersCount(custs.length);
    setDebtorsCount(custs.filter((c) => c.currentBalance > 0).length);
    setPaymentsCount(db.getCustomerPayments().length);
  };

  useEffect(() => {
    refreshCounts();
    const unsub = db.subscribe(refreshCounts);
    return unsub;
  }, []);

  const isPurchasesContext = activeTab === 'purchases';
  const isCustomersContext = activeTab === 'customers';

  // Tabs for General / Main mode
  const POS_TABS: TabItem[] = [
    {
      id: 'pos',
      label: 'شاشة البيع (POS)',
      icon: ShoppingCart,
      badge: cart.length > 0 ? cart.length : undefined,
      onClick: () => setActiveTab('pos'),
      isActive: activeTab === 'pos',
    },
    {
      id: 'invoices',
      label: 'سجل الفواتير والمرتجعات',
      icon: History,
      badge: salesCount > 0 ? salesCount : undefined,
      onClick: () => setActiveTab('invoices'),
      isActive: activeTab === 'invoices',
    },
  ];

  // Dynamic Tabs when in Purchases/Suppliers mode
  const PURCHASES_TABS: TabItem[] = [
    {
      id: 'create_invoice',
      label: 'فاتورة شراء',
      icon: FilePlus2,
      onClick: () => {
        setActiveTab('purchases');
        setPurchasesSubTab('create_invoice');
      },
      isActive: isPurchasesContext && purchasesSubTab === 'create_invoice',
    },
    {
      id: 'invoices',
      label: 'سجل المشتريات',
      icon: FileSpreadsheet,
      badge: purchasesCount > 0 ? purchasesCount : undefined,
      onClick: () => {
        setActiveTab('purchases');
        setPurchasesSubTab('invoices');
      },
      isActive: isPurchasesContext && purchasesSubTab === 'invoices',
    },
    {
      id: 'suppliers',
      label: 'الموردين',
      icon: Users,
      badge: suppliersCount > 0 ? suppliersCount : undefined,
      onClick: () => {
        setActiveTab('purchases');
        setPurchasesSubTab('suppliers');
      },
      isActive: isPurchasesContext && purchasesSubTab === 'suppliers',
    },
  ];

  // Dynamic Tabs for Customers section replacing Invoice, Log, Store
  // بدل الفاتورة: تسجيل عميل
  // بدل السجل: سند قبض
  // بدل المخزون: كشف حساب
  const CUSTOMERS_TABS: TabItem[] = [
    {
      id: 'directory',
      label: 'تسجيل عميل',
      icon: UserPlus,
      onClick: () => {
        setActiveTab('customers');
        setCustomersSubTab('directory');
      },
      isActive: isCustomersContext && customersSubTab === 'directory',
      badge: customersCount > 0 ? customersCount : undefined,
    },
    {
      id: 'receipts',
      label: 'سند قبض',
      icon: Receipt,
      badge: paymentsCount > 0 ? paymentsCount : undefined,
      onClick: () => {
        setActiveTab('customers');
        setCustomersSubTab('receipts');
      },
      isActive: isCustomersContext && customersSubTab === 'receipts',
    },
    {
      id: 'statements',
      label: 'كشف حساب',
      icon: FileText,
      badge: debtorsCount > 0 ? debtorsCount : undefined,
      onClick: () => {
        setActiveTab('customers');
        setCustomersSubTab('statements');
      },
      isActive: isCustomersContext && customersSubTab === 'statements',
    },
  ];

  let currentTabs: TabItem[] = POS_TABS;
  if (isCustomersContext) {
    currentTabs = CUSTOMERS_TABS;
  } else if (isPurchasesContext) {
    currentTabs = PURCHASES_TABS;
  }

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-xs px-2 sm:px-4 py-1.5 sm:py-2 sticky top-[57px] sm:top-[61px] z-30 select-none">
      <div className={`max-w-7xl mx-auto grid ${currentTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-1 sm:gap-1.5 sm:flex sm:items-center sm:justify-start sm:gap-2`}>
        {currentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`relative flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs md:text-sm font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-md shadow-teal-800/25 ring-1 ring-teal-900/30'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-teal-200' : 'text-teal-700'}`} />
              <span className="truncate">{tab.label}</span>

              {/* Badge */}
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black leading-none shrink-0 ${
                    tab.id === 'pos'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : isActive
                      ? 'bg-teal-900 text-teal-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
