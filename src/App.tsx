import React, { useEffect, useState, useRef } from 'react';
import { useSettingsStore } from './stores/useSettingsStore';
import { useNotificationStore } from './stores/useNotificationStore';
import { usePOSStore } from './stores/usePOSStore';
import { useAuthStore } from './stores/useAuthStore';
import { StatusBar } from './components/layout/StatusBar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileHeader } from './components/layout/MobileHeader';
import { PharmacyTabBar } from './components/layout/PharmacyTabBar';
import { MobileMenuDrawer } from './components/layout/MobileMenuDrawer';
import { BottomNavigationBar } from './components/layout/BottomNavigationBar';
import { ShortcutsModal } from './components/layout/ShortcutsModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { ManualItemModal } from './components/pos/ManualItemModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { db } from './database/db';

// Views
import { LoginView } from './components/auth/LoginView';
import { QuickLockModal } from './components/auth/QuickLockModal';
import { ManagerAuthModal } from './components/auth/ManagerAuthModal';
import { QuickUserSwitchModal } from './components/auth/QuickUserSwitchModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { POSView } from './components/pos/POSView';
import { ProductsView } from './components/products/ProductsView';
import { InventoryView } from './components/inventory/InventoryView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { CustomersView } from './components/customers/CustomersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { CashboxView } from './components/cashbox/CashboxView';
import { CashierDrawerModal } from './components/cashbox/CashierDrawerModal';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { UserManagementModal } from './components/settings/UserManagementModal';
import { AccessDeniedView } from './components/common/AccessDeniedView';

export default function App() {
  const { isAuthenticated, canAccessTab } = useAuthStore();
  const {
    activeTab,
    setActiveTab,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    isUserManagementModalOpen,
    setUserManagementModalOpen,
    toast,
    hideToast,
  } = useSettingsStore();
  const { isManualItemModalOpen, setManualItemModalOpen } = usePOSStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const shortcutsOpenRef = useRef(isShortcutsModalOpen);
  shortcutsOpenRef.current = isShortcutsModalOpen;

  useEffect(() => {
    // Run automated alert checks once on startup safely
    try {
      db.checkAndGenerateAlerts();
    } catch (e) {
      console.warn('Alerts check error ignored:', e);
    }

    // Setup global keyboard shortcut handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Help / Shortcuts modal
      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutsModalOpen(!shortcutsOpenRef.current);
      }
      // Alt + 0-9: Quick Switch Views
      if (e.altKey) {
        if (e.key === '0' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setActiveTab('dashboard');
        } else if (e.key === '1') {
          e.preventDefault();
          setActiveTab('pos');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('products');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('inventory');
        } else if (e.key === '4') {
          e.preventDefault();
          setActiveTab('invoices');
        } else if (e.key === '5') {
          e.preventDefault();
          setActiveTab('purchases');
        } else if (e.key === '6') {
          e.preventDefault();
          setActiveTab('customers');
        } else if (e.key === '7') {
          e.preventDefault();
          setActiveTab('expenses');
        } else if (e.key === '8') {
          e.preventDefault();
          setActiveTab('reports');
        } else if (e.key === '9') {
          e.preventDefault();
          setActiveTab('settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, setShortcutsModalOpen]);

  const renderActiveView = () => {
    // Check permission to access active tab
    if (!canAccessTab(activeTab)) {
      const TAB_RESTRICTION_INFO: Record<string, { role: string; perm?: string; name: string }> = {
        dashboard: { role: 'المدير العام أو الصيدلي المسؤول', perm: 'reports_view', name: 'لوحة التحكم والتحليلات الإدارية' },
        purchases: { role: 'المدير أو الصيدلي أو المحاسب', perm: 'purchases_manage', name: 'المشتريات وإدارة الموردين' },
        cashbox: { role: 'المدير العام أو المحاسب المالي', perm: 'expenses_manage', name: 'الصندوق والخزينة والمالية' },
        expenses: { role: 'المدير أو المحاسب أو الصيدلي', perm: 'expenses_manage', name: 'المصروفات اليومية' },
        reports: { role: 'المدير العام أو المحاسب المالي', perm: 'reports_view', name: 'التقارير المالية والأرباح' },
        settings: { role: 'المدير العام', perm: 'settings_manage', name: 'إعدادات النظام والمستخدمين' },
      };

      const info = TAB_RESTRICTION_INFO[activeTab] || {
        role: 'المدير العام',
        name: 'هذا القسم',
      };

      return (
        <AccessDeniedView
          requiredRoleName={info.role}
          requiredPermissionName={info.perm}
          tabName={info.name}
          onAuthorized={() => {}}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSView />;
      case 'products':
        return <ProductsView />;
      case 'inventory':
        return <InventoryView />;
      case 'invoices':
        return <InvoicesView />;
      case 'purchases':
        return <PurchasesView />;
      case 'customers':
        return <CustomersView />;
      case 'expenses':
        return <ExpensesView />;
      case 'cashbox':
        return <CashboxView />;
      case 'drawer':
        return <CashierDrawerModal isViewMode={true} onClose={() => setActiveTab('pos')} />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-slate-950 overflow-hidden select-none">
        <LoginView />
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
            <div
              className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
                toast.type === 'warning'
                  ? 'bg-amber-900/90 border-amber-700/60 text-amber-50'
                  : toast.type === 'error'
                  ? 'bg-rose-900/90 border-rose-700/60 text-rose-50'
                  : toast.type === 'info'
                  ? 'bg-sky-900/90 border-sky-700/60 text-sky-50'
                  : 'bg-teal-900/90 border-teal-700/60 text-teal-50'
              }`}
            >
              {toast.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-sky-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <p className="text-xs sm:text-sm font-semibold flex-1 leading-snug">{toast.message}</p>
              <button
                onClick={hideToast}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden select-none">
      {/* Top Header: Dark Teal Gradient */}
      <MobileHeader />

      {/* Top Pharmacy Tab Bar: POS, Invoices Log, Inventory */}
      <PharmacyTabBar />

      {/* Main App Content View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Desktop view on wide screens) */}
        <div className="hidden xl:flex">
          <Sidebar />
        </div>

        {/* Content Workspace Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
          <ErrorBoundary fallbackTitle="قسم النظام الحالي">
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Sticky Navigation Bar for Easy Section Switching */}
      <BottomNavigationBar />

      {/* Mobile Slide-Up Menu Drawer for All Other Modules */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Slide-out Notifications Drawer */}
      <NotificationDrawer />

      {/* Manual Item Modal Triggered globally */}
      <ManualItemModal
        isOpen={isManualItemModalOpen}
        onClose={() => setManualItemModalOpen(false)}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Security & Access Management Modals */}
      <QuickLockModal />
      <ManagerAuthModal />
      <QuickUserSwitchModal />
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setUserManagementModalOpen(false)}
      />

      {/* Global Animated Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'warning'
                ? 'bg-amber-900/90 border-amber-700/60 text-amber-50'
                : toast.type === 'error'
                ? 'bg-rose-900/90 border-rose-700/60 text-rose-50'
                : toast.type === 'info'
                ? 'bg-sky-900/90 border-sky-700/60 text-sky-50'
                : 'bg-teal-900/90 border-teal-700/60 text-teal-50'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-5 h-5 text-sky-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-semibold flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={hideToast}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
