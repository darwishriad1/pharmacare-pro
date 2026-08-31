import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  Coins,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { db } from '../../database/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ShiftReconciliation } from '../../types';

interface ShiftReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedCashAmount: number;
  onSuccess?: () => void;
}

const COMMON_DENOMINATIONS = [
  { value: 1000, label: '1000' },
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
  { value: 5, label: '5' },
];

export const ShiftReconciliationModal: React.FC<ShiftReconciliationModalProps> = ({
  isOpen,
  onClose,
  expectedCashAmount,
  onSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const { formatCurrency, showToast, settings } = useSettingsStore();

  const [useDenominations, setUseDenominations] = useState(true);
  const [counts, setCounts] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
  });

  const [manualCountedCash, setManualCountedCash] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  // Calculate counted total
  const countedTotalFromDenominations = COMMON_DENOMINATIONS.reduce((sum, denom) => {
    const qty = counts[denom.value] || 0;
    return sum + denom.value * qty;
  }, 0);

  const totalCounted = useDenominations
    ? countedTotalFromDenominations
    : parseFloat(manualCountedCash) || 0;

  const difference = totalCounted - expectedCashAmount;
  const status: ShiftReconciliation['status'] =
    Math.abs(difference) < 0.01 ? 'balanced' : difference > 0 ? 'surplus' : 'deficit';

  const handleDenomChange = (val: number, qtyStr: string) => {
    const qty = parseInt(qtyStr) || 0;
    setCounts((prev) => ({ ...prev, [val]: Math.max(0, qty) }));
  };

  const handleResetCounts = () => {
    setCounts({
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
    });
    setManualCountedCash('');
  };

  const handleSave = (andPrint = false) => {
    if (totalCounted < 0) {
      showToast('يرجى التحقق من المبلغ المحسوب', 'warning');
      return;
    }

    const savedRec = db.saveShiftReconciliation({
      shiftDate,
      cashierName: currentUser?.name || 'المستخدم الحالي',
      openingBalance: parseFloat(openingBalance) || 0,
      expectedCash: expectedCashAmount,
      countedCash: totalCounted,
      difference,
      status,
      denominations: useDenominations ? (counts as any) : undefined,
      notes: notes.trim() || undefined,
    });

    showToast(`تم حفظ تقفيل وتسوية الصندوق (${savedRec.reconciliationNumber}) بنجاح`, 'success');

    if (andPrint) {
      window.print();
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs select-none overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                <span>جرد ومطابقة الصندوق (إغلاق الوردية)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-normal">
                  تسوية نقدية فورية
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                مطابقة المبلغ الفعلي في الدرج مع الرصيد المسجل آلياً في النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Summary Header Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          
          {/* Expected in System */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-bold block">المتوقع بالنظام (Expected)</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-800 mt-0.5 block">
              {formatCurrency(expectedCashAmount)}
            </span>
            <span className="text-[10px] text-slate-400">بحسب فواتير وسندات النظام</span>
          </div>

          {/* Actual Counted */}
          <div className="bg-white p-3 rounded-2xl border border-teal-200 shadow-2xs bg-teal-50/30">
            <span className="text-[11px] text-teal-700 font-bold block">العد الفعلي للدرج (Counted)</span>
            <span className="text-base sm:text-lg font-black font-mono text-teal-700 mt-0.5 block">
              {formatCurrency(totalCounted)}
            </span>
            <span className="text-[10px] text-teal-600">المبلغ الموجود باليد</span>
          </div>

          {/* Variance / Result */}
          <div className={`p-3 rounded-2xl border shadow-2xs ${
            status === 'balanced'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : status === 'surplus'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            <span className="text-[11px] font-bold block flex items-center justify-center gap-1">
              {status === 'balanced' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
              {status === 'surplus' ? <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> : null}
              {status === 'deficit' ? <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> : null}
              <span>
                {status === 'balanced' ? 'الرصيد مطابق تماماً' : status === 'surplus' ? 'يوجد فائض في الصندوق' : 'يوجد عجز في الصندوق'}
              </span>
            </span>
            <span className="text-base sm:text-lg font-black font-mono mt-0.5 block">
              {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
            </span>
            <span className="text-[10px] opacity-80">
              {status === 'balanced' ? 'لا يوجد أي فارق' : status === 'surplus' ? 'مبلغ إضافي بالدرج' : 'مبلغ ناقص عن النظام'}
            </span>
          </div>

        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Mode Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseDenominations(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  useDenominations
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🔢 حاسبة فئات النقدية (الورقية والمعدنية)
              </button>
              <button
                type="button"
                onClick={() => setUseDenominations(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !useDenominations
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ✍️ إدخال المبلغ الإجمالي يدوياً
              </button>
            </div>

            {useDenominations && (
              <button
                type="button"
                onClick={handleResetCounts}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>تصفير العداد</span>
              </button>
            )}
          </div>

          {/* Denominations Table */}
          {useDenominations ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {COMMON_DENOMINATIONS.map((denom) => {
                  const qty = counts[denom.value] || 0;
                  const subTotal = denom.value * qty;

                  return (
                    <div
                      key={denom.value}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between focus-within:border-teal-500 focus-within:bg-white transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                        <span className="font-mono text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-lg border border-teal-200">
                          {denom.label} {settings.currencySymbol}
                        </span>
                        <span className="text-[10px] text-slate-400">فئة</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? '' : qty}
                          onChange={(e) => handleDenomChange(denom.value, e.target.value)}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-center font-mono font-bold text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                        />
                        <span className="text-[10px] text-slate-500 font-bold shrink-0">ورقة</span>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono font-bold text-slate-600">
                        <span className="text-[9px] text-slate-400 font-sans">المجموع:</span>
                        <span className="text-teal-700">{subTotal.toLocaleString()} {settings.currencySymbol}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                إجمالي المبلغ المحسوب باليد في الدرج ({settings.currencySymbol}):
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={manualCountedCash}
                onChange={(e) => setManualCountedCash(e.target.value)}
                placeholder="أدخل المبلغ بعد العد اليدوي..."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono font-black text-slate-800 focus:outline-none focus:border-teal-500 text-left"
              />
            </div>
          )}

          {/* Shift Details & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الوردية / التسوية
              </label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الصيدلي / الكاشير المستلم
              </label>
              <input
                type="text"
                disabled
                value={currentUser?.name || 'المستخدم الحالي'}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو توضيح أسباب الفارق (إن وجد):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم تسليم النقدية كاملة للدكتور المناوب للوردية الليلية..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            إلغاء التقفيل
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-teal-600" />
              <span>حفظ وطباعة السند</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>اعتماد وحفظ التسوية</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
