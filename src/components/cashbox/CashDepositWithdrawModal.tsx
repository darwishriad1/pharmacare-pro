import React, { useState } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Calendar,
  User,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '../../database/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface CashDepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'deposit' | 'withdrawal';
  onSuccess?: () => void;
}

export const CashDepositWithdrawModal: React.FC<CashDepositWithdrawModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'deposit',
  onSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const { formatCurrency, showToast, settings } = useSettingsStore();

  const [type, setType] = useState<'deposit' | 'withdrawal'>(defaultType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [reasonCategory, setReasonCategory] = useState('opening_float');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'warning');
      return;
    }

    if (!title.trim()) {
      showToast('يرجى كتابة بيان أو سبب العملية', 'warning');
      return;
    }

    db.addCashTransaction({
      type,
      title: title.trim(),
      amount: parsedAmount,
      date,
      paymentMethod,
      category: reasonCategory,
      recordedBy: currentUser?.name || 'المستخدم الحالي',
      notes: notes.trim() || undefined,
    });

    showToast(
      type === 'deposit'
        ? `تم تسجيل سند الإيداع في الصندوق بمبلغ (${formatCurrency(parsedAmount)}) بنجاح`
        : `تم تسجيل سند السحب من الصندوق بمبلغ (${formatCurrency(parsedAmount)}) بنجاح`,
      'success'
    );

    // Reset & close
    setTitle('');
    setAmount('');
    setNotes('');
    if (onSuccess) onSuccess();
    onClose();
  };

  const quickPresetsDeposit = [
    { title: 'تغذية رصيد افتتاحي للدرج (عهدة البداية)', category: 'opening_float' },
    { title: 'إيداع نقدي من الإدارة / المالك', category: 'owner_deposit' },
    { title: 'صرف فكة نقدية للدرج', category: 'petty_cash' },
    { title: 'إيراد نقدي خارجي / تسوية إضافية', category: 'misc_inflow' },
  ];

  const quickPresetsWithdrawal = [
    { title: 'توريد وإيداع نقدية في الحساب البنكي للصيدلية', category: 'bank_deposit' },
    { title: 'سحب نقدي لأرباح المالك / الإدارة', category: 'owner_withdrawal' },
    { title: 'تحويل عهدة لفرع آخر', category: 'branch_transfer' },
    { title: 'مسحوبات نقدية طارئة', category: 'emergency_draw' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className={`p-4 text-white flex items-center justify-between ${
          type === 'deposit' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-amber-600 to-rose-600'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              {type === 'deposit' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {type === 'deposit' ? 'سند إيداع نقدي في الصندوق (تغذية الخزينة)' : 'سند سحب نقدي من الصندوق (توريد / مسحوبات)'}
              </h2>
              <p className="text-xs text-white/80">
                {type === 'deposit' ? 'إدخال سيولة نقدية مباشرة إلى درج الكاشير أو الخزينة' : 'إخراج نقدية من الدرج وتوريدها للبنك أو المالك'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setType('deposit')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              type === 'deposit'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>إيداع نقدي في الصندوق (وارد ➕)</span>
          </button>

          <button
            type="button"
            onClick={() => setType('withdrawal')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              type === 'withdrawal'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سحب نقدي من الصندوق (صادر ➖)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نماذج وأسباب شائعة جاهزة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(type === 'deposit' ? quickPresetsDeposit : quickPresetsWithdrawal).map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setTitle(p.title);
                    setReasonCategory(p.category);
                  }}
                  className="text-right text-[11px] p-2 rounded-lg bg-slate-100/80 hover:bg-teal-50 hover:text-teal-800 border border-slate-200/80 transition-colors text-slate-700 font-medium truncate cursor-pointer"
                >
                  • {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              بيان العملية (الوصف) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'deposit' ? 'مثال: تغذية الصندوق رصيد بداية وردية' : 'مثال: توريد النقدية إلى حساب البنك'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ ({settings.currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                طريقة المعاملة
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white cursor-pointer"
              >
                <option value="cash">نقداً من/إلى الدرج (Cash)</option>
                <option value="bank_transfer">تحويل بنكي / إيداع مباشر</option>
                <option value="card">شبكة / بطاقة مدى</option>
              </select>
            </div>
          </div>

          {/* Date & Cashier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ السند
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المسؤول / الصيدلي
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  disabled
                  value={currentUser?.name || 'المستخدم الحالي'}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل أو مرجع إيصال بنكي..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{type === 'deposit' ? 'حفظ سند الإيداع' : 'حفظ سند السحب'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
