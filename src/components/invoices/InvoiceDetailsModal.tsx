import React from 'react';
import { X, Printer, RotateCcw, FileText, User, Calendar, CreditCard, CheckCircle2 } from 'lucide-react';
import { SaleInvoice } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  invoice: SaleInvoice | null;
  onClose: () => void;
  onOpenReturn: (invoice: SaleInvoice) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onOpenReturn,
}) => {
  const { settings, formatCurrency } = useSettingsStore();

  if (!isOpen || !invoice) return null;

  const handlePrintReceipt = () => {
    printerService.printThermalReceipt(invoice, settings);
  };

  const handlePrintA4 = () => {
    printerService.printA4Invoice(invoice, settings);
  };

  const isReturned = invoice.status === 'returned';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-teal-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">تفاصيل فاتورة مبيعات</h2>
                <span className="font-mono text-teal-100 bg-white/15 px-2 py-0.5 rounded-md font-bold text-sm">#{invoice.invoiceNumber}</span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {invoice.date} - {invoice.time} | الكاشير: {invoice.cashierName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/50">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">العميل:</span>
              <span className="font-bold text-xs text-slate-900 truncate block mt-0.5">
                {invoice.customerName || 'عميل نقدي عام'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">طريقة الدفع:</span>
              <span className="font-bold text-xs text-teal-700 block mt-0.5">
                {invoice.paymentMethod === 'cash'
                  ? 'نقداً'
                  : invoice.paymentMethod === 'card'
                  ? 'شبكة/بطاقة'
                  : invoice.paymentMethod === 'credit'
                  ? 'آجل (ذمة)'
                  : 'دفع مختلط'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">عدد الأصناف:</span>
              <span className="font-bold text-xs text-slate-900 block mt-0.5 font-mono">
                {invoice.items.length} أصناف
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">حالة الفاتورة:</span>
              <span
                className={`font-bold text-xs block mt-0.5 ${
                  isReturned ? 'text-rose-600' : 'text-teal-700'
                }`}
              >
                {isReturned ? 'مرتجعة' : 'مكتملة ومدفوعة'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-teal-50/70 text-teal-950 border-b border-teal-100 font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">اسم الدواء / الصنف</th>
                  <th className="p-3">الوحدة</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">السعر الفردي</th>
                  <th className="p-3">الخصم</th>
                  <th className="p-3 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-teal-50/30">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.product?.name || item.productName || 'دواء'}</div>
                      {item.batchNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          دفعة: {item.batchNumber} (EXP: {item.expiryDate})
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.unitType === 'package' ? 'عبوة' : item.unitType === 'strip' ? 'شريط' : 'حبة'}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{item.quantity}</td>
                    <td className="p-3 font-mono text-slate-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 font-mono text-amber-700">
                      {(item.discountAmount || item.discount || 0) > 0 ? formatCurrency(item.discountAmount || item.discount || 0) : '-'}
                    </td>
                    <td className="p-3 text-left font-mono font-black text-teal-700">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="bg-white p-4 rounded-xl border border-teal-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-700 space-y-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div className="flex items-center gap-3 bg-teal-50/70 p-2 rounded-lg border border-teal-100">
                <div>
                  <span className="text-slate-600 font-bold ml-1">المدفوع:</span>
                  <span className="font-mono font-bold text-teal-800">{formatCurrency(invoice.paidAmount ?? invoice.grandTotal)}</span>
                </div>
                <div className="border-r border-teal-200 pr-3">
                  <span className="text-slate-600 font-bold ml-1">المتبقي:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(invoice.changeAmount ?? Math.max(0, (invoice.paidAmount ?? invoice.grandTotal) - invoice.grandTotal))}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center sm:text-left bg-teal-50 px-5 py-2.5 rounded-xl border border-teal-200 w-full sm:w-auto">
              <span className="text-[11px] text-teal-800 block font-medium">المبلغ الصافي النهائي</span>
              <span className="text-xl font-black font-mono text-teal-800 tracking-tight">
                {formatCurrency(invoice.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
          {/* Print Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReceipt}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors shadow-2xs active:scale-95"
            >
              <Printer className="w-4 h-4 text-teal-600" />
              طباعة إيصال حراري (80mm)
            </button>

            <button
              onClick={handlePrintA4}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors active:scale-95"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              طباعة فاتورة رسمية (A4)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isReturned && (
              <button
                onClick={() => onOpenReturn(invoice)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                إرجاع الفاتورة / استرداد
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
