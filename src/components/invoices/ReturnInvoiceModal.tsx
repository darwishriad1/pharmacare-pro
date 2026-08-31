import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { SaleInvoice, CartItem, SaleReturnItem } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../database/db';

interface ReturnInvoiceModalProps {
  isOpen: boolean;
  invoice: SaleInvoice | null;
  onClose: () => void;
  onReturnCompleted: () => void;
}

export const ReturnInvoiceModal: React.FC<ReturnInvoiceModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onReturnCompleted,
}) => {
  const { formatCurrency } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const [returnReason, setReturnReason] = useState('خطأ في الصنف / رغبة العميل');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit_reversal' | 'card'>('cash');
  const [returnItemsQty, setReturnItemsQty] = useState<{ [itemId: string]: number }>({});

  if (!isOpen || !invoice) return null;

  // Initialize return quantities with original invoice quantities
  const getSelectedQty = (item: CartItem) => {
    return returnItemsQty[item.id] !== undefined ? returnItemsQty[item.id] : item.quantity;
  };

  const handleQtyChange = (itemId: string, maxQty: number, value: number) => {
    const valid = Math.max(0, Math.min(maxQty, value));
    setReturnItemsQty((prev) => ({ ...prev, [itemId]: valid }));
  };

  // Calculate total refund
  const totalRefund = invoice.items.reduce((acc, item) => {
    const qty = getSelectedQty(item);
    return acc + item.unitPrice * qty;
  }, 0);

  const handleExecuteReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRefund <= 0) {
      alert('يرجى تحديد كمية صالحة لإرجاعها');
      return;
    }

    if (confirm(`هل أنت متأكد من تنفيذ عملية الإرجاع واسترداد مبلغ (${formatCurrency(totalRefund)})؟`)) {
      const returnItems: SaleReturnItem[] = invoice.items
        .filter((item) => getSelectedQty(item) > 0)
        .map((item) => ({
          cartItemId: item.id,
          productId: item.product.id,
          productName: item.product.name,
          batchId: item.batchId,
          unitType: item.unitType,
          unitName: item.unitName,
          returnedQuantity: getSelectedQty(item),
          unitPrice: item.unitPrice,
          refundAmount: item.unitPrice * getSelectedQty(item),
        }));

      db.createSaleReturn({
        originalInvoiceId: invoice.id,
        originalInvoiceNumber: invoice.invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        items: returnItems,
        totalRefund,
        refundMethod,
        reason: returnReason,
        cashierId: currentUser?.id || 'usr-1',
        cashierName: currentUser?.name || 'الكاشير',
      });

      alert('تمت عملية الإرجاع بنجاح وتحديث أرصدة المخزون وحسابات العميل');
      onReturnCompleted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-700 to-rose-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">إرجاع فاتورة واسترداد مالي</h2>
              <p className="text-xs text-rose-100/90">فاتورة #{invoice.invoiceNumber} - {invoice.customerName || 'عميل عام'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleExecuteReturn} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/50">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              سيتم إعادة الكميات المحددة فوراً إلى رصيد المخزون الدوائي، وخصم المبلغ من صافي المبيعات اليومية.
            </span>
          </div>

          {/* Items selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">حدد الكميات المراد إرجاعها من الأصناف:</label>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              {invoice.items.map((item) => {
                const currentVal = getSelectedQty(item);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 truncate block">{item.product.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        السعر: {formatCurrency(item.unitPrice)} | المباع: {item.quantity} {item.unitName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 text-xs font-medium">كمية المرتجع:</span>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={currentVal}
                        onChange={(e) => handleQtyChange(item.id, item.quantity, parseInt(e.target.value, 10) || 0)}
                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-black text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Reason & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإرجاع</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="خطأ في الصنف / رغبة العميل">خطأ في الصنف / رغبة العميل</option>
                <option value="تلف في العبوة">تلف في العبوة</option>
                <option value="دواء غير مناسب / استبدال">دواء غير مناسب / استبدال</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة رد المبلغ</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as 'cash' | 'credit_reversal' | 'card')}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="cash">نقداً (استرداد من الخزينة)</option>
                <option value="credit_reversal">خصم من رصيد دين العميل</option>
                <option value="card">إلغاء عملية الشبكة / البطاقة</option>
              </select>
            </div>
          </div>

          {/* Refund total bar */}
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 flex items-center justify-between shadow-2xs">
            <span className="text-xs text-rose-900 font-bold">إجمالي المبلغ المسترد للعميل:</span>
            <span className="text-xl font-black font-mono text-rose-700">
              {formatCurrency(totalRefund)}
            </span>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors active:scale-95"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={totalRefund <= 0}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-rose-700/20 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              تأكيد عملية الإرجاع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
