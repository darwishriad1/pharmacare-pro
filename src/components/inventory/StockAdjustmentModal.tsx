import React, { useState } from 'react';
import { X, Check, Scale, AlertTriangle, ArrowRightLeft, Package } from 'lucide-react';
import { Batch } from '../../types';
import { db } from '../../database/db';
import { useAuthStore } from '../../stores/useAuthStore';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  batch: Batch | null;
  onClose: () => void;
  onSaved: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  batch,
  onClose,
  onSaved,
}) => {
  const { currentUser } = useAuthStore();
  const [actualQuantity, setActualQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('تسوية جرد دوري');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !batch) return null;

  const product = db.getProductById(batch.productId);
  const currentQty = batch.quantity;
  const actualNum = parseInt(actualQuantity, 10);
  const diff = isNaN(actualNum) ? 0 : actualNum - currentQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(actualNum) || actualNum < 0) return;

    const fullReason = notes ? `${reason} (${notes})` : reason;
    db.adjustBatchQuantity(
      batch.id,
      actualNum,
      fullReason,
      currentUser?.id || 'usr-1',
      currentUser?.name || 'مدير النظام'
    );
    onSaved();
    onClose();
  };

  return (
    <div
      id="stock-adjustment-modal"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none"
    >
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-teal-800 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20 shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-white truncate">تسوية جردية للمخزون</h2>
              <p className="text-[11px] text-teal-100 font-medium truncate">
                {product?.name || batch.productName || 'الصنف'} • تشغيلة #{batch.batchNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 text-xs">
          {/* Current Batch Info Card */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">الرصيد الدفتري الحالي:</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {currentQty} عبوة
              </div>
            </div>

            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-medium block">تاريخ الانتهاء:</span>
              <div className="text-xs font-mono font-bold text-teal-800 mt-0.5">
                {batch.expiryDate}
              </div>
            </div>
          </div>

          {/* Actual Qty Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الكمية الفعلية بعد الجرد (عبوة) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder={`الرصيد الدفتري المسجل: ${currentQty}`}
              value={actualQuantity}
              onChange={(e) => setActualQuantity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-black text-teal-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
              autoFocus
            />
          </div>

          {/* Difference Indicator */}
          {actualQuantity !== '' && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                diff > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : diff < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1 font-bold">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>نتيجة الجرد:</span>
              </div>
              <span className="font-bold font-mono text-xs">
                {diff > 0
                  ? `+${diff} زيادة (فائض مخزون)`
                  : diff < 0
                  ? `${diff} عجز (نقص مخزون)`
                  : 'مطابق تماماً للدفتر'}
              </span>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سبب التسوية والجرد</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-600 focus:bg-white cursor-pointer"
            >
              <option value="تسوية جرد دوري">تسوية جرد دوري</option>
              <option value="تلف أو كسر أثناء المناولة">تلف أو كسر أثناء المناولة</option>
              <option value="خطأ إدخال سابق">خطأ إدخال سابق</option>
              <option value="صرف عينات طبية">صرف عينات طبية</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وبيان إضافي</label>
            <input
              type="text"
              placeholder="اكتب ملاحظات توضيحية لتوثيقها في سجل الرقابة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>اعتماد وتعديل الرصيد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
