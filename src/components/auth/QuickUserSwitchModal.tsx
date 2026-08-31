import React, { useState } from 'react';
import {
  X,
  UserCheck,
  User as UserIcon,
  Shield,
  KeyRound,
  LogIn,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';
import { User } from '../../types';

export const QuickUserSwitchModal: React.FC = () => {
  const { isQuickSwitchModalOpen, setQuickSwitchModalOpen, currentUser, switchUser } = useAuthStore();
  const { showToast } = useSettingsStore();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeUsers = db.getUsers().filter((u) => u.active);

  if (!isQuickSwitchModalOpen) return null;

  const handleSelectUser = (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('أنت مسجل الدخول بهذا الحساب حالياً', 'info');
      setQuickSwitchModalOpen(false);
      return;
    }

    // If user has no PIN or is switching without requirement, or prompt for PIN
    setSelectedUser(user);
    setPin('');
    setError(null);
  };

  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.pin && selectedUser.pin !== pin.trim()) {
      setError('رمز الـ PIN غير مطابق لهذا المستخدم');
      return;
    }

    const res = switchUser(selectedUser.id);
    if (res.success) {
      showToast(`تم تبديل المستخدم إلى: ${selectedUser.name}`, 'success');
      setQuickSwitchModalOpen(false);
      setSelectedUser(null);
    } else {
      setError(res.message || 'فشل تبديل الحساب');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-purple-800 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-purple-200 border border-white/10 shadow-inner">
              <UserCheck className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h3 className="font-black text-base text-white leading-tight">
                تبديل المستخدم السريع (Fast Switch)
              </h3>
              <p className="text-xs text-purple-200/80 mt-0.5">
                اختر الحساب المطلوب للمتابعة على نفس نقطة البيع دون تسجيل خروج كامل
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setQuickSwitchModalOpen(false);
              setSelectedUser(null);
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!selectedUser ? (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-3">
                الموظفون المتاحون في الصيدلية حالياً:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
                {activeUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/40'
                          : 'bg-slate-50 hover:bg-purple-50/50 hover:border-purple-200 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shrink-0 ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : user.role === 'pharmacist'
                              ? 'bg-teal-100 text-teal-900 border-teal-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {user.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-700 text-white font-bold">
                                الحالي
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            @{user.username}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-900 border-purple-200'
                              : user.role === 'pharmacist'
                              ? 'bg-teal-100 text-teal-900 border-teal-200'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {user.role === 'admin'
                            ? 'مدير'
                            : user.role === 'pharmacist'
                            ? 'صيدلي'
                            : user.role === 'accountant'
                            ? 'محاسب'
                            : 'كاشير'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmSwitch} className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-900 font-black flex items-center justify-center text-sm border border-purple-300">
                    {selectedUser.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-purple-950">{selectedUser.name}</div>
                    <div className="text-[11px] text-purple-700 font-mono">@{selectedUser.username}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  تغيير المستخدم
                </button>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  أدخل رمز الـ PIN للمتابعة (أو اضغط تأكيد إذا لم يكن مطلوباً):
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-slate-50 border border-purple-300 rounded-xl px-4 py-2.5 text-center font-mono font-black text-lg tracking-widest text-purple-950 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول بالحساب</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
