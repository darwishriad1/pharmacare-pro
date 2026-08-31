import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Coins,
  Wallet,
  Settings,
  ShieldAlert,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface NavItem {
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: number;
  roles?: ('admin' | 'pharmacist' | 'cashier' | 'accountant')[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isSidebarCollapsed, setShortcutsModalOpen } = useSettingsStore();
  const { hasRole, canAccessTab } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم (المؤشرات)',
      sublabel: 'المؤشرات والرسوم البيانية',
      icon: LayoutDashboard,
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      id: 'pos',
      label: 'نقطة البيع (POS)',
      sublabel: 'شاشة الكاشير والفواتير',
      icon: ShoppingCart,
    },
    {
      id: 'products',
      label: 'دليل الأدوية والمنتجات',
      sublabel: 'الكتالوج، الأسعار والباركود',
      icon: Pill,
    },
    {
      id: 'inventory',
      label: 'المخزون والصلاحيات',
      sublabel: 'الدفعات، الهوالك والتواريخ',
      icon: Package,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'invoices',
      label: 'سجل المبيعات والمرتجع',
      sublabel: 'فواتير المبيعات والمرتجعات',
      icon: Receipt,
    },
    {
      id: 'purchases',
      label: 'المشتريات والموردين',
      sublabel: 'فواتير الشراء وحسابات الموردين',
      icon: Truck,
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      id: 'customers',
      label: 'العملاء والديون',
      sublabel: 'سجل العملاء وحسابات الآجل',
      icon: Users,
    },
    {
      id: 'cashbox',
      label: 'الصندوق والخزينة والمالية',
      sublabel: 'حركة النقدية، المصروفات، وجرد الدرج',
      icon: Coins,
      roles: ['admin', 'accountant'],
    },
    {
      id: 'drawer',
      label: 'درج الكاشير والمطابقة',
      sublabel: 'مطابقة مبيعات اليوم، الفائض والعجز',
      icon: Wallet,
    },
    {
      id: 'expenses',
      label: 'المصروفات اليومية',
      sublabel: 'إيجار، كهرباء ومشتريات تشغيل',
      icon: Receipt,
      roles: ['admin', 'accountant', 'pharmacist'],
    },
    {
      id: 'reports',
      label: 'التقارير والإحصائيات',
      sublabel: 'أرباح وخسائر، حركة أصناف',
      icon: BarChart3,
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      id: 'settings',
      label: 'الإعدادات والمستخدمين',
      sublabel: 'بيانات الصيدلية، الطابعات، نسخ احتياطي',
      icon: Settings,
      roles: ['admin', 'pharmacist', 'accountant'],
    },
  ];

  return (
    <aside
      className={`bg-white text-slate-700 border-l border-teal-100 shadow-sm transition-all duration-300 flex flex-col justify-between select-none z-20 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Navigation Links */}
      <div className="p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          if (!canAccessTab(item.id) || (item.roles && !hasRole(item.roles))) {
            return null;
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-right relative ${
                isActive
                  ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white font-bold shadow-md shadow-teal-700/20'
                  : 'hover:bg-teal-50/70 text-slate-700 hover:text-teal-900'
              }`}
              title={item.label}
            >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-teal-700 group-hover:bg-teal-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
              </div>

              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold truncate leading-tight">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isActive ? 'text-teal-100 font-normal' : 'text-slate-400'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              )}

              {/* Collapsed Badge indicator */}
              {isSidebarCollapsed && item.badge && (
                <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-teal-100 bg-slate-50/60">
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors ${
            isSidebarCollapsed ? 'px-1' : ''
          }`}
          title="دليل الاختصارات السريعة"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0 text-teal-600" />
          {!isSidebarCollapsed && <span>مساعدة واختصارات (F1)</span>}
        </button>

        {!isSidebarCollapsed && (
          <div className="mt-2 text-center text-[10px] text-slate-500 font-medium">
            <div>نظام إدارة الصيدليات المتكامل</div>
            <div className="text-teal-700 font-semibold mt-0.5">الإصدار 2.4 - سحابي ومحلي</div>
          </div>
        )}
      </div>
    </aside>
  );
};
