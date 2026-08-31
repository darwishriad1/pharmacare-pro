import React from 'react';
import {
  ShoppingCart,
  Receipt,
  Package,
  Truck,
  Users,
  BarChart3,
  LayoutDashboard,
  Wallet
} from 'lucide-react';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';
import { usePOSStore } from '../../stores/usePOSStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const BottomNavigationBar: React.FC = () => {
  const { activeTab, setActiveTab, setPurchasesSubTab } = useSettingsStore();
  const { cart } = usePOSStore();
  const { currentUser, hasRole, canAccessTab } = useAuthStore();

  const isCashier = currentUser?.role === 'cashier';
  const canSeeReports = canAccessTab('reports');

  // Dynamic 6th navigation button
  const isReportsOpen = activeTab === 'reports';
  const isDashboardOpen = activeTab === 'dashboard';

  const toggleReportsOrDashboard = () => {
    if (isReportsOpen) {
      setActiveTab('dashboard');
    } else {
      setActiveTab('reports');
    }
  };

  const dynamicSlot = canSeeReports
    ? isReportsOpen
      ? {
          id: 'dashboard' as ActiveTab,
          label: 'لوحة التحكم',
          icon: LayoutDashboard,
          isActive: true,
          action: toggleReportsOrDashboard,
        }
      : {
          id: 'reports' as ActiveTab,
          label: 'التقارير',
          icon: BarChart3,
          isActive: isDashboardOpen || isReportsOpen,
          action: toggleReportsOrDashboard,
        }
    : {
        id: 'expenses' as ActiveTab,
        label: 'سند صرف',
        icon: Receipt,
        isActive: activeTab === 'expenses',
        action: () => setActiveTab('expenses'),
      };

  const middleSlot = isCashier
    ? {
        id: 'drawer' as ActiveTab,
        label: 'الدرج',
        icon: Wallet,
        isActive: activeTab === 'drawer',
        action: () => setActiveTab('drawer'),
      }
    : {
        id: 'purchases' as ActiveTab,
        label: 'المشتريات',
        icon: Truck,
        isActive: activeTab === 'purchases',
        action: () => {
          setActiveTab('purchases');
          setPurchasesSubTab('create_invoice');
        },
      };

  const NAV_ITEMS = [
    {
      id: 'pos' as ActiveTab,
      label: 'المبيعات',
      icon: ShoppingCart,
      badge: cart.length > 0 ? cart.length : undefined,
      isActive: activeTab === 'pos',
      action: () => setActiveTab('pos'),
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'الفواتير',
      icon: Receipt,
      isActive: activeTab === 'invoices',
      action: () => setActiveTab('invoices'),
    },
    {
      id: isCashier ? ('products' as ActiveTab) : ('inventory' as ActiveTab),
      label: isCashier ? 'دليل الأدوية' : 'المخزون',
      icon: Package,
      isActive: activeTab === 'inventory' || activeTab === 'products',
      action: () => setActiveTab(isCashier ? 'products' : 'inventory'),
    },
    middleSlot,
    {
      id: 'customers' as ActiveTab,
      label: 'العملاء',
      icon: Users,
      isActive: activeTab === 'customers',
      action: () => setActiveTab('customers'),
    },
    dynamicSlot,
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="شريط التنقل الرئيسي"
      className="bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.07)] px-1.5 sm:px-4 py-1 z-40 shrink-0 select-none"
    >
      <div className="max-w-4xl mx-auto grid grid-cols-6 gap-1 sm:gap-2 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`relative flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer min-h-[48px] ${
                isActive
                  ? 'bg-gradient-to-b from-teal-50 to-teal-100/70 border border-teal-200/80 shadow-xs'
                  : 'hover:bg-slate-100/70 text-slate-500 hover:text-teal-700'
              }`}
            >
              {/* Active Indicator Top Light Bar */}
              {isActive && (
                <span className="absolute -top-1 w-7 sm:w-9 h-0.5 bg-teal-700 rounded-full shadow-xs" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-150 ${
                    isActive ? 'text-teal-800 scale-110 stroke-[2.3]' : 'text-slate-500 stroke-[1.8]'
                  }`}
                />
                {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-600 text-white font-mono text-[9px] font-black min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center shadow-xs border border-white">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight transition-colors ${
                  isActive ? 'font-black text-teal-950' : 'font-semibold text-slate-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
