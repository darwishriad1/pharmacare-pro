import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse,
  Coins,
  Wallet,
  Settings as SettingsIcon,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Maximize,
  Minimize,
  Keyboard,
  Building2,
  ShieldCheck,
  Check,
  ArrowRightLeft,
  Sparkles,
  Calculator,
  Clock,
  Radio
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { db } from '../../database/db';

export const MobileHeader: React.FC = () => {
  const { currentUser, logout, hasRole } = useAuthStore();
  const {
    settings,
    updateSettings,
    setNotificationDrawerOpen,
    setShortcutsModalOpen,
    setActiveTab,
    activeTab,
    showToast,
  } = useSettingsStore();
  const { unreadCount } = useNotificationStore();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isFinancialAdmin = hasRole(['admin', 'accountant']);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
          showToast('تم تفعيل وضع الشاشة الكاملة للكاشير', 'info');
        }).catch(() => {
          showToast('تعذر الدخول إلى وضع الشاشة الكاملة', 'warning');
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => {
            setIsFullscreen(false);
          });
        }
      }
    } catch {
      // Ignore fullscreen restriction in nested iframes
    }
  };

  return (
    <header
      id="app-top-header"
      className="bg-slate-900 text-white border-b border-slate-800/80 sticky top-0 z-40 px-2.5 sm:px-4 py-1.5 sm:py-2 select-none shadow-md backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        
        {/* ======================================================== */}
        {/* Right Section (RTL): Real Medical App Brand & Identity  */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Medical Brand Emblem */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 p-0.5 shadow-md shadow-teal-900/40 flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0"
            title="الانتقال إلى لوحة التحكم (المؤشرات)"
          >
            <div className="w-full h-full rounded-[10px] bg-slate-950/20 backdrop-blur-xs flex items-center justify-center">
              <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
          </div>

          {/* Pharmacy Name & System Identity */}
          <div className="min-w-0 cursor-pointer" onClick={() => setActiveTab('dashboard')} title="الواجهة الرئيسية: لوحة التحكم">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-xs sm:text-sm md:text-base text-slate-50 truncate leading-tight tracking-tight">
                {settings.pharmacyName || 'صيدلية الشفاء الذكية'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>متصل</span>
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate mt-0.5">
              <span className="flex items-center gap-0.5 text-teal-400/90 font-semibold">
                <Building2 className="w-2.5 h-2.5" />
                {settings.branchName || 'الفرع الرئيسي'}
              </span>
              <span className="text-slate-600 hidden md:inline">•</span>
              <span className="text-slate-400 hidden md:inline font-mono">
                نظام إدارة الصيدليات الذكي (SmartRx)
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Left Section (RTL): Professional Actions, Tools & User   */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

          {/* 1. Cashbox & Financial Management Button (للمدير والمحاسب فقط) */}
          {isFinancialAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('cashbox')}
              className={`h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg border text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs ${
                activeTab === 'cashbox' || activeTab === 'expenses'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-400 shadow-md ring-2 ring-teal-400/30'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700/80 hover:border-slate-600'
              }`}
              title="فتح قسم الصندوق والخزينة والإدارة المالية للصيدلية (المدير والمحاسب)"
            >
              <Coins className={`w-3.5 h-3.5 ${activeTab === 'cashbox' ? 'text-white animate-pulse' : 'text-amber-400'}`} />
              <span className="font-bold text-xs">الصندوق</span>
              <span className="hidden md:inline text-[10px] text-teal-300 font-normal border-r border-slate-700/80 pr-1.5">
                المالية
              </span>
            </button>
          )}

          {/* 2. Keyboard Shortcuts (F1) */}
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(true)}
            className="h-8 sm:h-8.5 px-2 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/80 transition-all text-xs font-medium hidden sm:flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
            title="اختصارات لوحة المفاتيح السريعة (F1)"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-amber-300 font-mono font-bold">F1</span>
          </button>

          {/* 3. Fullscreen POS Mode Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-8 sm:h-8.5 w-8 sm:w-8.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/80 transition-all text-xs hidden sm:flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer"
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'وضع الشاشة الكاملة للكاشير'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* 4. Notifications Center */}
          <button
            type="button"
            onClick={() => setNotificationDrawerOpen(true)}
            className="relative h-8 sm:h-8.5 w-8 sm:w-8.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/80 transition-all text-xs flex items-center justify-center shadow-2xs active:scale-95 shrink-0 cursor-pointer"
            title="التنبيهات والإشعارات الرقابية"
          >
            <Bell className="w-3.5 h-3.5 text-teal-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </button>

          {/* 5. User Profile & Pharmacist Shift Manager */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs ${
                isUserMenuOpen
                  ? 'bg-teal-700 text-white border-teal-500'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700/80'
              }`}
              title="المستخدم الحالي والوردية"
            >
              <div className="w-5 h-5 rounded-md bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shadow-inner">
                {currentUser?.name ? currentUser.name.charAt(0) : 'ص'}
              </div>
              <div className="hidden lg:block text-right leading-tight min-w-0">
                <span className="block text-[11px] font-bold text-slate-200 truncate max-w-[80px]">
                  {currentUser?.name || 'د. صيدلي'}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isUserMenuOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* User Profile Popover */}
            {isUserMenuOpen && (
              <div className="absolute left-0 top-9.5 w-64 rounded-2xl bg-slate-900 text-slate-100 border border-slate-700/80 shadow-2xl z-50 p-3 text-xs animate-in fade-in zoom-in-95 space-y-3">
                {/* User Header Details */}
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-600/90 text-white font-bold text-sm flex items-center justify-center shadow-inner">
                      {currentUser?.name ? currentUser.name.charAt(0) : 'ص'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-xs sm:text-sm truncate">{currentUser?.name}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {currentUser?.role === 'admin'
                          ? 'المدير العام (صلاحيات كاملة)'
                          : currentUser?.role === 'pharmacist'
                          ? 'دكتور صيدلي'
                          : 'كاشير مبيعات'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>اسم المستخدم:</span>
                    <span className="text-slate-200 font-bold font-sans">@{currentUser?.username}</span>
                  </div>
                </div>

                {/* Secure Logout Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                      showToast('تم تسجيل الخروج بنجاح', 'info');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all duration-150 active:scale-98 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Settings & System Configuration Button */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs ${
              activeTab === 'settings'
                ? 'bg-teal-600 text-white shadow-md border border-teal-400'
                : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 hover:border-slate-600'
            }`}
            title="إعدادات وضبط الصيدلية"
          >
            <SettingsIcon className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-white animate-spin' : 'text-teal-300'}`} />
            <span className="hidden sm:inline text-xs">الضبط</span>
          </button>

        </div>
      </div>
    </header>
  );
};
