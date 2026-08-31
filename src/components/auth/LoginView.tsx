import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  Building2,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  Pill,
  Users,
  Delete,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';
import { User, UserRole } from '../../types';

export const LoginView: React.FC = () => {
  const { login } = useAuthStore();
  const { settings, showToast } = useSettingsStore();

  const [mode, setMode] = useState<'cards' | 'classic'>('cards');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeUsers = db.getUsers().filter((u) => u.active);

  const handleSelectUserCard = (user: User) => {
    setSelectedUser(user);
    setPin('');
    setError(null);
  };

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    if (selectedUser && newPin.length >= 4) {
      if (selectedUser.pin === newPin) {
        attemptLogin(selectedUser.username, newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const attemptLogin = (userToLogin: string, secretToLogin?: string) => {
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const result = login(userToLogin, secretToLogin);
      setIsLoading(false);

      if (result.success) {
        showToast('تم تسجيل الدخول بنجاح، مرحباً بك في النظام', 'success');
      } else {
        setError(result.message || 'بيانات الدخول غير صحيحة. يرجى التحقق وإعادة المحاولة.');
        setPin('');
      }
    }, 150);
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('يرجى اختيار الموظف أولاً');
      return;
    }
    attemptLogin(selectedUser.username, pin);
  };

  const handleClassicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('يرجى إدخال اسم المستخدم أو رقم الحساب');
      return;
    }

    if (!cleanPass) {
      setError('يرجى إدخال كلمة المرور / رمز الدخول (PIN)');
      return;
    }

    attemptLogin(cleanUser, cleanPass);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none" dir="rtl">
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
          
          {/* Pharmacy & App Brand Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-500 text-white shadow-lg shadow-purple-500/20 ring-4 ring-slate-800">
              <Pill className="w-7 h-7 rotate-45" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {settings.pharmacyName || 'نظام إدارة الصيدلية المتكامل'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                منصة إدارة المبيعات، المخزون، والصلاحيات الأمنية
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700/80 text-purple-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>بوابة الدخول الآمن المشفر</span>
              </div>

              {/* Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'cards' ? 'classic' : 'cards');
                  setError(null);
                  setSelectedUser(null);
                }}
                className="px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {mode === 'cards' ? 'تسجيل دخول باسم المستخدم ➔' : 'دخول سريع للموظفين ➔'}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* MODE 1: USER CARDS & PIN KEYPAD (TOUCH OPTIMIZED) */}
          {mode === 'cards' && (
            <div className="space-y-4">
              {!selectedUser ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2.5">
                    اختر حساب الموظف للمتابعة:
                  </label>

                  <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-0.5">
                    {activeUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUserCard(user)}
                        className="p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-right transition-all flex items-center gap-3 active:scale-98 cursor-pointer group"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shrink-0 ${
                            user.role === 'admin'
                              ? 'bg-purple-900/60 text-purple-200 border-purple-700'
                              : user.role === 'pharmacist'
                              ? 'bg-teal-900/60 text-teal-200 border-teal-700'
                              : 'bg-indigo-900/60 text-indigo-200 border-indigo-700'
                          }`}
                        >
                          {user.name.slice(0, 2)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-white truncate group-hover:text-purple-300">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {user.role === 'admin'
                              ? 'مدير النظام'
                              : user.role === 'pharmacist'
                              ? 'صيدلي مسؤول'
                              : user.role === 'accountant'
                              ? 'محاسب مالي'
                              : 'كاشير مبيعات'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCardSubmit} className="space-y-4">
                  {/* Active Selected Card Pill */}
                  <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                        {selectedUser.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{selectedUser.name}</div>
                        <div className="text-xs text-purple-300 font-mono">@{selectedUser.username}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setPin('');
                        setError(null);
                      }}
                      className="text-xs text-purple-300 hover:text-white font-bold underline cursor-pointer"
                    >
                      تغيير الموظف
                    </button>
                  </div>

                  {/* PIN Dots */}
                  <div className="text-center space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      أدخل رمز الدخول السريع (PIN):
                    </label>

                    <div className="flex items-center justify-center gap-2.5">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className={`w-4 h-4 rounded-full border-2 transition-all ${
                            pin.length > idx
                              ? 'bg-purple-500 border-purple-400 scale-110 shadow-md shadow-purple-500/50'
                              : 'bg-slate-950 border-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigitPress(digit)}
                        className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-purple-900/60 border border-slate-700 text-white font-mono text-lg font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
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
                      className="h-11 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 text-xs font-bold border border-slate-700 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      مسح
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDigitPress('0')}
                      className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-purple-900/60 border border-slate-700 text-white font-mono text-lg font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-11 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      <Delete className="w-4 h-4 rotate-180" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? 'جاري التحقق...' : 'دخول إلى نقطة البيع'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* MODE 2: CLASSIC USERNAME & PASSWORD FORM */}
          {mode === 'classic' && (
            <form onSubmit={handleClassicSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">اسم المستخدم</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">رمز الدخول السري / كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل رمز الـ PIN أو كلمة المرور"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pr-9 pl-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}
              </button>
            </form>
          )}

          {/* System Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              الدخول مقصور على الكادر الصيدلاني والإداري المصرح لهم. يتم توثيق كافة العمليات في سجل الرقابة.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-3 text-center text-[11px] text-slate-500">
          <div>{settings.pharmacyNameEn || 'PharmaCare Pro Management System'} • الإصدار 2.4</div>
        </div>
      </div>
    </div>
  );
};
