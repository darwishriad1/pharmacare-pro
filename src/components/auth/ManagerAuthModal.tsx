import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  X,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  Sparkles,
  Delete
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';

export const ManagerAuthModal: React.FC = () => {
  const { managerAuthRequest, closeManagerAuth, verifyManagerPin, currentUser } = useAuthStore();
  const { showToast } = useSettingsStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('any');

  const managers = db.getUsers().filter((u) => u.active && (u.role === 'admin' || u.role === 'pharmacist'));

  useEffect(() => {
    if (managerAuthRequest) {
      setPin('');
      setError(null);
      setSelectedManagerId('any');
    }
  }, [managerAuthRequest]);

  if (!managerAuthRequest) return null;

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    if (newPin.length >= 4) {
      attemptAuthorize(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const attemptAuthorize = (pinToTest: string) => {
    const result = verifyManagerPin(pinToTest, managerAuthRequest.requiredPermission);
    if (result.valid && result.manager) {
      db.logAudit(
        'تفويض مشرف',
        'auth',
        `تم تفويض الإجراء: (${managerAuthRequest.title}) للموظف (${currentUser?.name}) بواسطة المشرف (${result.manager.name})`,
        result.manager.id,
        result.manager.name
      );
      showToast(`تم التفويض بنجاح بواسطة: ${result.manager.name}`, 'success');
      managerAuthRequest.onAuthorized(result.manager);
      closeManagerAuth();
    } else {
      if (pinToTest.length >= 4) {
        setError(result.message || 'رمز PIN للمشرف غير مطابق أو لا يملك صلاحية التفويض');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptAuthorize(pin);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 text-white border border-white/20 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                تفويض المشرف / المدير مطلوب
              </h3>
              <p className="text-xs text-amber-100/90 mt-0.5">
                يتطلب هذا الإجراء صلاحية إدارية خاصة للمتابعة
              </p>
            </div>
          </div>

          <button
            onClick={closeManagerAuth}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إلغاء"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Action Details Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>الإجراء المطلوب تفويضه:</span>
            </div>
            <p className="font-semibold text-slate-800 pr-5">{managerAuthRequest.title}</p>
            {managerAuthRequest.description && (
              <p className="text-slate-600 text-[11px] pr-5">{managerAuthRequest.description}</p>
            )}
          </div>

          {/* Supervisor PIN Keypad & Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                أدخل رمز الـ PIN الخاص بالمدير أو الصيدلي المسؤول:
              </label>

              {/* PIN display dots */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      pin.length > idx
                        ? 'bg-amber-600 border-amber-600 scale-110'
                        : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                  {error}
                </div>
              )}
            </div>

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-900 active:bg-amber-200 border border-slate-200 font-mono text-lg font-bold text-slate-800 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setPin('');
                  setError(null);
                }}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border border-slate-200 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                مسح
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-11 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 font-mono text-lg font-bold text-slate-800 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 border border-slate-200 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-4 h-4 rotate-180" />
              </button>
            </div>

            {/* Authorized Managers List Preview */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>المشرفين المصرح لهم:</span>
              <div className="flex items-center gap-1 font-bold text-slate-700">
                {managers.map((m) => (
                  <span key={m.id} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {m.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeManagerAuth}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء الإجراء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>تأكيد التفويض</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
