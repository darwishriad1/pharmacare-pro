import React, { useState, useEffect } from 'react';
import {
  Bell,
  Keyboard,
  Moon,
  Sun,
  User as UserIcon,
  LogOut,
  Sparkles,
  Search,
  ShoppingCart,
  Menu,
  ShieldCheck,
  Building2,
  Clock,
  Lock,
  UserCheck,
  Users,
  Shield,
  Percent
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { usePOSStore } from '../../stores/usePOSStore';
import { db } from '../../database/db';

export const Topbar: React.FC = () => {
  const { currentUser, logout, switchUser, lockScreen, setQuickSwitchModalOpen, hasPermission, hasRole } = useAuthStore();
  const { settings, toggleSidebar, setShortcutsModalOpen, setNotificationDrawerOpen, setActiveTab, setUserManagementModalOpen } =
    useSettingsStore();
  const { unreadCount } = useNotificationStore();
  const { cart } = usePOSStore();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  const allUsers = db.getUsers().filter((u) => u.active);
  const canManageUsers = hasPermission('users_manage') || hasRole(['admin']);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(
        now.toLocaleDateString('ar-YE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between shadow-md select-none">
      {/* Left / Start: Branding & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          title="تبديل القائمة الجانبية"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <span className="text-xl font-black text-white">⚕</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white leading-none">
                {settings.pharmacyName}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500 inline" />
              {settings.branchName || 'الفرع الرئيسي'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Live Clock & Quick POS Status */}
      <div className="hidden md:flex items-center gap-4 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-sm tracking-wider">
          <Clock className="w-4 h-4 text-emerald-500" />
          <span>{currentTime}</span>
        </div>
        <span className="text-slate-700">|</span>
        <span className="text-slate-400">{currentDate}</span>
      </div>

      {/* Right / End: Action buttons, Shortcuts, Notifications & User profile */}
      <div className="flex items-center gap-2">
        {/* Quick POS button */}
        <button
          onClick={() => setActiveTab('pos')}
          className="relative flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-medium text-xs shadow-md shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">نقطة البيع (POS)</span>
          {cart.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center justify-center -mr-1">
              {cart.length}
            </span>
          )}
        </button>

        {/* Lock Screen Button */}
        <button
          onClick={lockScreen}
          className="p-2 rounded-lg bg-slate-800 hover:bg-purple-950 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
          title="قفل الشاشة مؤقتاً لحماية العمليات (PIN Lock)"
        >
          <Lock className="w-4 h-4 text-purple-400" />
        </button>

        {/* Shortcuts Modal trigger */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:flex items-center gap-1 text-xs cursor-pointer"
          title="اختصارات لوحة المفاتيح (F1)"
        >
          <Keyboard className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] text-slate-400">F1</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          title="التنبيهات والإشعارات"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
              {unreadCount > 9 ? '+9' : unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 transition-all text-xs text-right cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-inner">
              {currentUser?.name?.charAt(0) || 'م'}
            </div>
            <div className="hidden lg:block">
              <div className="font-semibold text-slate-200 text-xs leading-none">
                {currentUser?.name || 'مستخدم'}
              </div>
              <span className="text-[10px] text-purple-300 capitalize font-bold">
                {currentUser?.role === 'admin'
                  ? 'مدير النظام'
                  : currentUser?.role === 'pharmacist'
                  ? 'صيدلي مسؤول'
                  : currentUser?.role === 'accountant'
                  ? 'محاسب مالي'
                  : 'كاشير مبيعات'}
              </span>
            </div>
          </button>

          {/* User dropdown popover */}
          {isUserMenuOpen && (
            <div
              className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-2 text-xs"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white text-sm">{currentUser?.name}</p>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {currentUser?.role === 'admin' ? 'Super Admin' : currentUser?.role}
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-mono mt-0.5">@{currentUser?.username}</p>
                {currentUser?.maxDiscountPercentage !== undefined && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    <span>حد الخصم الشخصي: {currentUser.maxDiscountPercentage}%</span>
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="p-1.5 space-y-1 border-b border-slate-800">
                <button
                  type="button"
                  onClick={lockScreen}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>قفل الشاشة بالـ PIN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickSwitchModalOpen(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span>تبديل الموظف السريع</span>
                </button>

                {canManageUsers && (
                  <button
                    type="button"
                    onClick={() => setUserManagementModalOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>إدارة الموظفين والصلاحيات</span>
                  </button>
                )}
              </div>

              {/* Quick Switch List */}
              <div className="py-1.5 px-2">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  الموظفون المتاحون:
                </div>
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => switchUser(user.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentUser?.id === user.id
                        ? 'bg-purple-600/20 text-purple-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{user.name}</span>
                    <span className="text-[10px] opacity-70">
                      {user.role === 'admin' ? 'مدير' : user.role === 'pharmacist' ? 'صيدلي' : 'كاشير'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800 mt-1 pt-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

