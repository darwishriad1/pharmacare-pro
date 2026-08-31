import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, CheckCircle2, Printer, AlertCircle } from 'lucide-react';
import { Supplier, Expense } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onPaymentSuccess,
}) => {
  const { settings, showToast } = useSettingsStore();
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recordedBy, setRecordedBy] = useState<string>('مدير الصيدلية');
  const [autoPrint, setAutoPrint] = useState<boolean>(true);

  if (!isOpen || !supplier) return null;

  const currentDebt = supplier.currentBalance || 0;
  const numAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = Math.max(0, currentDebt - numAmount);

  const handlePayFull = () => {
    setAmount(currentDebt > 0 ? currentDebt.toString() : '0');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      showToast('يرجى إدخال مبلغ دفع صحيح أكبر من الصفر', 'warning');
      return;
    }

    try {
      // 1. Record Supplier Payment in DB (this also automatically deducts the supplier balance)
      db.addSupplierPayment({
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: numAmount,
        date: paymentDate,
        paymentMethod: paymentMethod as any,
        notes: notes,
        recordedBy: recordedBy,
      });

      // 2. Also record expense entry for treasury accounting
      db.addExpense({
        title: `سداد دفعة للمورد: ${supplier.name}`,
        category: 'supplies',
        amount: numAmount,
        date: paymentDate,
        paymentMethod: paymentMethod as any,
        paidBy: recordedBy,
        notes: notes ? `${notes} (المورد: ${supplier.name})` : `سداد دفعة للمورد: ${supplier.name}`,
      });

      const paymentId = `PAY-SUP-${Date.now()}`;
      const updatedSupplier: Supplier = {
        ...supplier,
        currentBalance: Math.max(0, currentDebt - numAmount),
      };

      // 3. Option to print official disbursement voucher
      if (autoPrint) {
        printerService.printSupplierPaymentReceipt(
          {
            id: paymentId,
            amount: numAmount,
            date: paymentDate,
            paymentMethod,
            notes,
            recordedBy,
          },
          updatedSupplier,
          settings
        );
      }

      showToast(`تم تسجيل سند الصرف وسداد مبلغ ${numAmount.toLocaleString()} ${settings.currencySymbol} للمورد بنجاح`);
      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ سند الصرف', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-amber-700/20 flex items-center justify-between bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 text-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">سند صرف مالي وسداد للمورد</h2>
              <p className="text-[11px] text-amber-100/90 font-medium">{supplier.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Debt Banner */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 border-b border-amber-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-amber-900 block">إجمالي الرصيد المستحق للمورد (الدين):</span>
            <span className="font-mono font-black text-lg sm:text-xl text-amber-900">
              {currentDebt.toLocaleString('ar-YE')} {settings.currencySymbol}
            </span>
          </div>
          {currentDebt > 0 && (
            <button
              type="button"
              onClick={handlePayFull}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              سداد كامل الدين
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المبلغ المراد صرفه وتسديده <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="أدخل المبلغ المسدد..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-14 py-2.5 text-sm sm:text-base font-mono font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
                autoFocus
              />
              <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              <span className="text-xs font-bold text-slate-400 absolute left-3 top-3.5 pointer-events-none">
                {settings.currencySymbol}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الصرف والسداد</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer"
              >
                <option value="cash">نقداً من الخزينة (كاش)</option>
                <option value="transfer">حوالة بنكية / مصرفية</option>
                <option value="card">شبكة / بطاقة مصرفية</option>
                <option value="check">شيك مصرفي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ السند والصرف</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المحاسب المسؤول عن الصرف</label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
              />
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold block">الرصيد المتبقي بعد السداد:</span>
              <span className="font-mono font-black text-xs sm:text-sm text-slate-800">
                {remainingAfterPayment.toLocaleString('ar-YE')} {settings.currencySymbol}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وبيان السند</label>
            <input
              type="text"
              placeholder="مثال: دفعة تحت الحساب لفواتير توريد شهر مايو..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
            />
          </div>

          {/* Auto Print Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>طباعة سند الصرف المالي آلياً فور الحفظ</span>
            </div>
          </label>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-black shadow-md shadow-amber-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد سند الصرف وتحديث الحساب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
