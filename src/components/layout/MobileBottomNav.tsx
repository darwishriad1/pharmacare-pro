import React from 'react';
import {
  ShoppingCart,
  Pill,
  Users,
  Package,
  Menu,
  Receipt,
  Truck,
  BarChart3,
  Settings,
  Coins
} from 'lucide-react';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';
import { usePOSStore } from '../../stores/usePOSStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMore }) => {
  const { activeTab, setActiveTab } = useSettingsStore();
  const { cart } = usePOSStore();
  const { unreadCount } = useNotificationStore();

  const isMoreActive = ['invoices', 'purchases', 'expenses', 'reports', 'settings'].includes(activeTab);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1 select-none shadow-2xl">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        
        {/* 1. POS Tab */}
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-150 min-w-[64px] min-h-[52px] active:scale-95 relative ${
            activeTab === 'pos'
              ? 'text-emerald-400 font-bold bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'pos' ? 'stroke-[2.5]' : ''}`} />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full shadow-sm ring-2 ring-slate-900 animate-pulse">
                {cart.length}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 leading-none font-semibold">الكاشير</span>
        </button>

        {/* 2. Products Tab */}
        <button
          onClick={() => setActiveTab('products')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-150 min-w-[64px] min-h-[52px] active:scale-95 ${
            activeTab === 'products'
              ? 'text-emerald-400 font-bold bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pill className={`w-5 h-5 ${activeTab === 'products' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-1 leading-none font-semibold">الأدوية</span>
        </button>

        {/* 3. Customers Tab */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-150 min-w-[64px] min-h-[52px] active:scale-95 ${
            activeTab === 'customers'
              ? 'text-purple-400 font-bold bg-purple-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'customers' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-1 leading-none font-semibold">العملاء</span>
        </button>

        {/* 4. Inventory Tab */}
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-150 min-w-[64px] min-h-[52px] active:scale-95 relative ${
            activeTab === 'inventory'
              ? 'text-emerald-400 font-bold bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className={`w-5 h-5 ${activeTab === 'inventory' ? 'stroke-[2.5]' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-3.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          )}
          <span className="text-[11px] mt-1 leading-none font-semibold">المخزون</span>
        </button>

        {/* 5. More Menu Tab */}
        <button
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-150 min-w-[64px] min-h-[52px] active:scale-95 ${
            isMoreActive
              ? 'text-emerald-400 font-bold bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className={`w-5 h-5 ${isMoreActive ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-1 leading-none font-semibold">المزيد</span>
        </button>

      </div>
    </nav>
  );
};
