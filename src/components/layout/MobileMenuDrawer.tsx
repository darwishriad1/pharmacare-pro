import React from 'react';
import {
  X,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Truck,
  Coins,
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Database,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  User
} from 'lucide-react';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../database/db';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, setShortcutsModalOpen, settings, formatCurrency } = useSettingsStore();
  const { currentUser, logout, hasRole, canAccessTab } = useAuthStore();

  if (!isOpen) return null;

  const navigateTo = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'لوحة التحكم (المؤشرات الرئيسية)',
      sublabel: 'المؤشرات والرسوم البيانية والحالة العامة للصيدلية',
      icon: LayoutDashboard,
      color: 'text-teal-700 bg-teal-50 border-teal-200',
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      id: 'pos' as ActiveTab,
      label: 'المبيعات ونقطة البيع (POS)',
      sublabel: 'شاشة الكاشير، الفواتير السريعة وعمليات البيع',
      icon: ShoppingCart,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'سجل المبيعات والفواتير',
      sublabel: 'عرض فواتير المبيعات، المرتجعات، وإعادة الطباعة',
      icon: Receipt,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      id: 'purchases' as ActiveTab,
      label: 'المشتريات وحسابات الموردين',
      sublabel: 'فواتير التوريد، الدفعات، والذمم الدائنة',
      icon: Truck,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      id: 'cashbox' as ActiveTab,
      label: 'الصندوق والخزينة والإدارة المالية',
      sublabel: 'السيولة النقدية، المصروفات، المقبوضات وجرد الورديات',
      icon: Coins,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      roles: ['admin', 'accountant'],
    },
    {
      id: 'drawer' as ActiveTab,
      label: 'درج الكاشير والمطابقة اليومية',
      sublabel: 'مطابقة مبيعات اليوم، الفائض والعجز وسندات المصروفات',
      icon: Wallet,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'expenses' as ActiveTab,
      label: 'المصروفات والمصاريف اليومية',
      sublabel: 'إيجار، رواتب، كهرباء، ونثريات التشغيل',
      icon: Receipt,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      roles: ['admin', 'accountant', 'pharmacist'],
    },
    {
      id: 'reports' as ActiveTab,
      label: 'التقارير والأرباح والإحصائيات',
      sublabel: 'تقرير الأرباح، حركة الأصناف، وتقفيل الوردية',
      icon: BarChart3,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      roles: ['admin', 'pharmacist', 'accountant'],
    },
    {
      id: 'settings' as ActiveTab,
      label: 'إعدادات النظام والنسخ الاحتياطي',
      sublabel: 'بيانات الصيدلية، الطابعات، وتصدير قاعدة البيانات',
      icon: Settings,
      color: 'text-teal-700 bg-teal-50 border-teal-200',
      roles: ['admin', 'pharmacist', 'accountant'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-up Drawer Content */}
      <div className="relative bg-white border-t border-teal-100 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 text-slate-800">
        
        {/* Drag handle & Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-t-3xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center font-bold text-base">
              ☰
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">القائمة والمزيد</h2>
              <p className="text-xs text-teal-100">جميع أقسام النظام والخدمات السريعة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Pill */}
        <div className="p-3 bg-teal-50/70 border border-teal-100 mx-4 mt-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {currentUser?.name?.charAt(0) || 'م'}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm">{currentUser?.name}</div>
              <div className="text-[11px] text-teal-700 font-semibold">
                {currentUser?.role === 'admin'
                  ? 'مدير النظام'
                  : currentUser?.role === 'pharmacist'
                  ? 'دكتور صيدلي'
                  : 'كاشير مبيعات'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>

        {/* Menu Items List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {menuItems.map((item) => {
            if (!canAccessTab(item.id) || (item.roles && !hasRole(item.roles as any))) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full min-h-[58px] flex items-center gap-3 p-3 rounded-2xl border transition-all text-right active:scale-98 ${
                  isActive
                    ? 'bg-teal-50 border-teal-300 shadow-xs ring-1 ring-teal-400/40'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2.5 rounded-xl border shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-teal-900' : 'text-slate-800'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-600 text-white font-bold">
                        النشط
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.sublabel}</p>
                </div>
              </button>
            );
          })}

          {/* Help & Shortcuts Button */}
          <button
            onClick={() => {
              setShortcutsModalOpen(true);
              onClose();
            }}
            className="w-full min-h-[58px] flex items-center gap-3 p-3 rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-right transition-colors active:scale-98"
          >
            <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-100 text-amber-800 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-xs sm:text-sm font-bold text-amber-900">دليل الاختصارات والمساعدة</span>
              <p className="text-[11px] text-amber-700">طريقة استخدام الاختصارات السريعة (F1)</p>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 text-center text-[10px] text-slate-400 pb-6">
          <span>{settings.pharmacyName || 'الصيدلية'} • الإصدار 2.4 مهيأ للهاتف المحمول</span>
        </div>
      </div>
    </div>
  );
};
