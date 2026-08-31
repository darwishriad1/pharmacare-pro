import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  AlertCircle,
  Sparkles,
  Delete,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';

export const QuickLockModal: React.FC = () => {
  const { currentUser, isScreenLocked, unlockScreen, logout, setQuickSwitchModalOpen } = useAuthStore();
  const { settings, showToast } = useSettingsStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isScreenLocked) {
      setPin('');
      setError(null);
    }
  }, [isScreenLocked]);

  // Handle global numeric keyboard entry when locked
  useEffect(() => {
    if (!isScreenLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      } else if (e.key === 'Escape') {
        setPin('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScreenLocked, pin]);

  if (!isScreenLocked || !currentUser) return null;

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Auto-attempt unlock when 4 digits entered if matching
    if (newPin.length >= 4) {
      const res = unlockScreen(newPin);
      if (res.success) {
        showToast(`مرحباً مجدداً دكتور ${currentUser.name}`, 'success');
      } else if (newPin.length === 6 || (currentUser.pin && newPin.length === currentUser.pin.length)) {
        triggerError(res.message || 'رمز PIN غير صحيح');
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPin('');
  };

  const handleUnlock = () => {
    if (!pin) {
      setError('يرجى إدخال رمز PIN');
      return;
    }
    const res = unlockScreen(pin);
    if (res.success) {
      showToast(`تم فتح قفل الشاشة بنجاح`, 'success');
    } else {
      triggerError(res.message || 'رمز PIN غير صحيح');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Lock Icon & Badge */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-teal-500 p-0.5 shadow-2xl shadow-purple-900/50 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
              <Lock className="w-9 h-9 text-purple-400 animate-pulse" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-md">
            🔒
          </span>
        </div>

        {/* User Card Info */}
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-xl font-black text-white">{currentUser.name}</h2>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
              {currentUser.role === 'admin'
                ? 'مدير النظام'
                : currentUser.role === 'pharmacist'
                ? 'صيدلي مسؤول'
                : currentUser.role === 'accountant'
                ? 'محاسب مالي'
                : 'كاشير مبيعات'}
            </span>
            <span>•</span>
            <span className="font-mono text-slate-300">@{currentUser.username}</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            الشاشة مقفلة لحماية العمليات المالية والبيانات. أدخل رمز الـ PIN لإلغاء القفل
          </p>
        </div>

        {/* PIN Indicators */}
        <div className={`flex items-center justify-center gap-3 mb-6 ${isShaking ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                pin.length > index
                  ? 'bg-purple-500 border-purple-400 scale-110 shadow-lg shadow-purple-500/50'
                  : 'bg-slate-900 border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad for Touch & Mouse */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-purple-900/40 border border-slate-800 hover:border-purple-500/50 text-white font-mono text-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            مسح
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-purple-900/40 border border-slate-800 hover:border-purple-500/50 text-white font-mono text-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="حذف آخر رقم"
          >
            <Delete className="w-5 h-5 rotate-180" />
          </button>
        </div>

        {/* Footer Actions (Switch user / Logout) */}
        <div className="flex items-center justify-between w-full max-w-[280px] pt-4 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              unlockScreen(currentUser.pin || '');
              setQuickSwitchModalOpen(true);
            }}
            className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>تبديل الموظف</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
