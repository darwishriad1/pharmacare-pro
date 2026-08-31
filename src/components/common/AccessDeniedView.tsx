import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  ArrowRight,
  UserCheck,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';

interface AccessDeniedViewProps {
  requiredRoleName?: string;
  requiredPermissionName?: string;
  tabName?: string;
  onAuthorized?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  requiredRoleName = 'المدير العام أو المحاسب',
  requiredPermissionName,
  tabName = 'هذا القسم',
  onAuthorized,
}) => {
  const { currentUser, verifyManagerPin, switchUser } = useAuthStore();
  const { setActiveTab, showToast } = useSettingsStore();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleAuthorizeWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('يرجى إدخال رمز PIN للمدير');
      return;
    }

    setIsAuthorizing(true);
    const res = verifyManagerPin(pinInput);
    if (res.valid && res.manager) {
      showToast(`تم التحقق بنجاح بصلاحية المدير: ${res.manager.name} 🛡️`, 'success');
      switchUser(res.manager.id);
      setPinInput('');
      setPinError('');
      if (onAuthorized) {
        onAuthorized();
      }
    } else {
      setPinError(res.message || 'رمز PIN غير صحيح أو ليس لحساب إداري');
    }
    setIsAuthorizing(false);
  };

  return (
    <div className="w-full h-full min-h-[480px] flex items-center justify-center p-4 select-none font-sans text-right">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            صلاحية وصول مقيدة
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            عذراً، يتطلب الوصول إلى <span className="font-bold text-slate-900">({tabName})</span> الحصول على صلاحية <span className="font-bold text-rose-600">[{requiredRoleName}]</span>.
          </p>
          {requiredPermissionName && (
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 inline-block">
              الصلاحية المطلوبة: {requiredPermissionName}
            </p>
          )}
        </div>

        {/* Current User Info */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">المستخدم الحالي:</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span>{currentUser?.name || 'غير مسجل'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {currentUser?.role === 'admin'
                ? 'مدير'
                : currentUser?.role === 'pharmacist'
                ? 'صيدلي'
                : currentUser?.role === 'accountant'
                ? 'محاسب'
                : 'كاشير'}
            </span>
          </div>
        </div>

        {/* Manager PIN Unlock Form */}
        <form onSubmit={handleAuthorizeWithPin} className="space-y-3 pt-2 border-t border-slate-100 text-right">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-teal-600" />
              <span>إذن المشرف / رمز PIN للمدير</span>
            </label>
            <span className="text-[10px] text-slate-400">للمتابعة كمدير</span>
          </div>

          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                if (pinError) setPinError('');
              }}
              placeholder="أدخل رمز PIN للمدير..."
              className="w-full text-center tracking-widest text-lg font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-400"
            />
          </div>

          {pinError && (
            <p className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{pinError}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isAuthorizing || !pinInput.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>تأكيد الصلاحية وفتح القسم</span>
          </button>
        </form>

        {/* Back to POS Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة إلى شاشة المبيعات والكاشير</span>
          </button>
        </div>
      </div>
    </div>
  );
};
