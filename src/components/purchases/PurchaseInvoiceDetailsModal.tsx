import React, { useState } from 'react';
import {
  X,
  FileText,
  Printer,
  Calendar,
  Truck,
  User,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download,
  Share2,
} from 'lucide-react';
import { PurchaseInvoice, Supplier } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';

interface PurchaseInvoiceDetailsModalProps {
  isOpen: boolean;
  invoice: PurchaseInvoice | null;
  onClose: () => void;
  onInvoiceUpdated?: () => void;
}

export const PurchaseInvoiceDetailsModal: React.FC<PurchaseInvoiceDetailsModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onInvoiceUpdated,
}) => {
  const { settings, showToast } = useSettingsStore();
  const [payRemainingInput, setPayRemainingInput] = useState<string>('');
  const [isPayingRemaining, setIsPayingRemaining] = useState<boolean>(false);

  if (!isOpen || !invoice) return null;

  const grandTotal = invoice.grandTotal || invoice.totalAmount || 0;
  const paidAmount = invoice.paidAmount || 0;
  const remaining = invoice.remainingAmount || Math.max(0, grandTotal - paidAmount);

  // Calculate potential retail value and profit margin
  const totalRetailValue = invoice.items.reduce(
    (acc, item) => acc + (item.sellingPrice || item.costPrice) * item.quantity,
    0
  );
  const potentialProfit = Math.max(0, totalRetailValue - grandTotal);
  const profitMarginPercent = grandTotal > 0 ? ((potentialProfit / grandTotal) * 100).toFixed(1) : '0.0';

  const handlePrintA4 = () => {
    printerService.printPurchaseInvoice(invoice, settings);
  };

  const handlePrintThermal = () => {
    printerService.printPurchaseThermalReceipt(invoice, settings);
  };

  const handlePayRemaining = () => {
    const payVal = parseFloat(payRemainingInput) || 0;
    if (payVal <= 0) {
      showToast('يرجى إدخال مبلغ صحيح', 'warning');
      return;
    }

    if (payVal > remaining) {
      showToast('المبلغ المدفوع أكبر من المتبقي على الفاتورة', 'warning');
      return;
    }

    try {
      const newPaid = paidAmount + payVal;
      const newRemaining = Math.max(0, remaining - payVal);
      const newStatus = newRemaining === 0 ? 'paid' : 'partial';

      const updatedInvoice: PurchaseInvoice = {
        ...invoice,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus as any,
      };

      db.savePurchaseInvoice(updatedInvoice);

      // Also adjust supplier debt balance if supplier exists
      if (invoice.supplierId) {
        const suppliers = db.getSuppliers();
        const sup = suppliers.find((s) => s.id === invoice.supplierId);
        if (sup) {
          sup.currentBalance = Math.max(0, (sup.currentBalance || 0) - payVal);
          db.saveSupplier(sup);
        }
      }

      showToast(`تم سداد مبلغ ${payVal.toLocaleString()} ${settings.currencySymbol} وتحديث الفاتورة بنجاح`);
      setIsPayingRemaining(false);
      setPayRemainingInput('');
      if (onInvoiceUpdated) onInvoiceUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تحديث الفاتورة', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-teal-700/20 flex items-center justify-between bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 text-white shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white">تفاصيل فاتورة المشتريات</h2>
                <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-full text-white font-black">
                  #{invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-teal-100/90 font-medium">
                {invoice.supplierName} • {invoice.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintA4}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="طباعة فاتورة رسمية A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طباعة A4</span>
            </button>

            <button
              onClick={handlePrintThermal}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="طباعة إيصال حراري"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">حراري</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3 text-teal-600" /> شركة التوريد / المورد:
              </span>
              <span className="font-bold text-xs text-slate-900 truncate block">{invoice.supplierName}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-teal-600" /> تاريخ التوريد:
              </span>
              <span className="font-mono font-bold text-xs text-slate-900 block">{invoice.date}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-teal-600" /> المستلم / المسؤول:
              </span>
              <span className="font-bold text-xs text-slate-900 block truncate">{invoice.createdBy || 'مدير الصيدلية'}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-teal-600" /> حالة السداد:
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                  invoice.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : invoice.paymentStatus === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {invoice.paymentStatus === 'paid'
                  ? 'مدفوعة بالكامل'
                  : invoice.paymentStatus === 'partial'
                  ? 'مدفوعة جزئياً'
                  : 'آجل / غير مدفوعة'}
              </span>
            </div>
          </div>

          {invoice.supplierInvoiceNumber && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
              <span className="font-bold text-teal-900">رقم الفاتورة المرجعية للمورد:</span>
              <span className="font-mono font-black text-teal-950">{invoice.supplierInvoiceNumber}</span>
            </div>
          )}

          {/* Items Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Package className="w-4 h-4 text-teal-700" />
                <span>الأصناف والأدوية الواردة ({invoice.items.length} صنف)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">اسم الصنف الدوائي</th>
                    <th className="py-2 px-2 text-center">رقم التشغيلة (Batch)</th>
                    <th className="py-2 px-2 text-center">تاريخ الانتهاء</th>
                    <th className="py-2 px-2 text-center">الكمية</th>
                    <th className="py-2 px-3 text-left">سعر الشراء</th>
                    <th className="py-2 px-3 text-left">سعر البيع</th>
                    <th className="py-2 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 text-xs">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">باركود: {item.barcode}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.batchNumber || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] font-bold text-amber-800">
                        {item.expiryDate || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-xs text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-teal-800">
                        {item.costPrice.toLocaleString('ar-YE')}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-medium text-slate-600">
                        {item.sellingPrice.toLocaleString('ar-YE')}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900 bg-slate-50/50">
                        {item.total.toLocaleString('ar-YE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary & Margins */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Margins Card */}
            <div className="bg-teal-50/50 border border-teal-200/80 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <TrendingUpIcon className="w-4 h-4 text-teal-700" />
                <span>تحليل الربحية والقيمة السوقية للفاتورة</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-white border border-teal-100 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">إجمالي القيمة البيعية:</span>
                  <span className="font-mono font-black text-teal-900">
                    {totalRetailValue.toLocaleString('ar-YE')} {settings.currencySymbol}
                  </span>
                </div>
                <div className="bg-white border border-teal-100 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">الربح الإجمالي المتوقع:</span>
                  <span className="font-mono font-black text-emerald-700">
                    +{potentialProfit.toLocaleString('ar-YE')} ({profitMarginPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Invoiced Totals */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">إجمالي قيمة الفاتورة:</span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {grandTotal.toLocaleString('ar-YE')} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span className="font-medium">المبلغ المدفوع للمورد:</span>
                <span className="font-mono font-bold">
                  {paidAmount.toLocaleString('ar-YE')} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 text-rose-700">
                <span className="font-bold">المتبقي (دين على الصيدلية):</span>
                <span className="font-mono font-black text-sm">
                  {remaining.toLocaleString('ar-YE')} {settings.currencySymbol}
                </span>
              </div>
            </div>
          </div>

          {/* Settle Remaining Debt Section */}
          {remaining > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>سداد متبقي الفاتورة ({remaining.toLocaleString('ar-YE')} {settings.currencySymbol})</span>
                </div>
                {!isPayingRemaining && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayingRemaining(true);
                      setPayRemainingInput(remaining.toString());
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs active:scale-95 cursor-pointer"
                  >
                    سداد المتبقي الآن
                  </button>
                )}
              </div>

              {isPayingRemaining && (
                <div className="pt-2 border-t border-amber-200 flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[150px] relative">
                    <input
                      type="number"
                      min="1"
                      max={remaining}
                      value={payRemainingInput}
                      onChange={(e) => setPayRemainingInput(e.target.value)}
                      placeholder="المبلغ المدفوع..."
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePayRemaining}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 cursor-pointer"
                  >
                    تأكيد السداد
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPayingRemaining(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          )}

          {invoice.notes && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <span className="font-bold text-slate-700 block mb-1">ملاحظات الفاتورة:</span>
              <p className="text-slate-600 leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            تم تسجيل الفاتورة في النظام بتاريخ {invoice.date}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
