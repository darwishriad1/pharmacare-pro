import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Printer,
  Download,
  Share2,
  Calendar,
  Phone,
  Truck,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Supplier, PurchaseInvoice } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';

interface SupplierStatementModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onOpenPaymentModal?: (supplier: Supplier) => void;
}

export const SupplierStatementModal: React.FC<SupplierStatementModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onOpenPaymentModal,
}) => {
  const { settings, showToast } = useSettingsStore();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month' | '3months'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const allPurchases = useMemo(() => db.getPurchaseInvoices(), [isOpen]);
  const allSupplierPayments = useMemo(() => db.getSupplierPayments(), [isOpen]);

  // Compute transactions for this supplier
  const transactions = useMemo(() => {
    if (!supplier) return [];

    const txList: Array<{
      id: string;
      date: string;
      time?: string;
      rawTimestamp: number;
      type: 'invoice' | 'payment';
      typeLabel: string;
      ref: string;
      description: string;
      debit: number; // Invoices (Purchases from supplier = debt increases)
      credit: number; // Payments to supplier = debt decreases
      balance: number;
    }> = [];

    // 1. Purchase Invoices from this supplier
    const supplierInvoices = allPurchases.filter(
      (inv) => inv.supplierId === supplier.id || inv.supplierName === supplier.name
    );

    supplierInvoices.forEach((inv) => {
      const invTotal = inv.grandTotal || inv.totalAmount || 0;
      const invPaid = inv.paidAmount || 0;

      // Add invoice debit
      txList.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : '',
        rawTimestamp: inv.createdAt ? new Date(inv.createdAt).getTime() : new Date(inv.date).getTime(),
        type: 'invoice',
        typeLabel: 'فاتورة مشتريات',
        ref: `#${inv.invoiceNumber}`,
        description: `توريد أدوية (${inv.items.length} صنف)${inv.supplierInvoiceNumber ? ` - فاتورة مورد #${inv.supplierInvoiceNumber}` : ''}`,
        debit: invTotal,
        credit: 0,
        balance: 0,
      });

      // If immediate payment was made at invoice creation, add credit transaction
      if (invPaid > 0) {
        txList.push({
          id: `pay-inv-${inv.id}`,
          date: inv.date,
          time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : '',
          rawTimestamp: (inv.createdAt ? new Date(inv.createdAt).getTime() : new Date(inv.date).getTime()) + 1,
          type: 'payment',
          typeLabel: 'دفعة مع الفاتورة',
          ref: `#${inv.invoiceNumber}`,
          description: `سداد نقدي مباشر عند استلام الفاتورة #${inv.invoiceNumber}`,
          debit: 0,
          credit: invPaid,
          balance: 0,
        });
      }
    });

    // 2. Standalone Payments / Disbursements recorded for this supplier
    const paymentsForSupplier = allSupplierPayments.filter(
      (p) => p.supplierId === supplier.id || p.supplierName === supplier.name
    );

    paymentsForSupplier.forEach((pay) => {
      txList.push({
        id: pay.id,
        date: pay.date,
        time: pay.createdAt ? new Date(pay.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : '',
        rawTimestamp: pay.createdAt ? new Date(pay.createdAt).getTime() : new Date(pay.date).getTime(),
        type: 'payment',
        typeLabel: 'سند صرف مالي',
        ref: `#${pay.id.slice(-6).toUpperCase()}`,
        description: pay.notes || 'سداد دفعة مالية من الحساب',
        debit: 0,
        credit: pay.amount,
        balance: 0,
      });
    });

    // Sort chronologically ascending
    txList.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

    // Calculate running balance (Debit - Credit)
    let currentRunning = 0;
    const computedTx = txList.map((tx) => {
      currentRunning += tx.debit - tx.credit;
      return {
        ...tx,
        balance: currentRunning,
      };
    });

    return computedTx;
  }, [supplier, allPurchases, allSupplierPayments]);

  // Filter transactions based on date
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return transactions.filter((tx) => {
      if (dateFilter === 'today') {
        return tx.date === todayStr;
      }
      if (dateFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return tx.date >= monthStart;
      }
      if (dateFilter === '3months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
        return tx.date >= threeMonthsAgo;
      }
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });
  }, [transactions, dateFilter, startDate, endDate]);

  if (!isOpen || !supplier) return null;

  const totalDebit = filteredTransactions.reduce((acc, t) => acc + t.debit, 0);
  const totalCredit = filteredTransactions.reduce((acc, t) => acc + t.credit, 0);
  const currentBalance = supplier.currentBalance || 0;

  const handlePrint = () => {
    printerService.printSupplierAccountStatement(supplier, filteredTransactions, settings);
  };

  const handleExportCSV = () => {
    excelService.exportSupplierStatementToCSV(supplier, filteredTransactions);
    showToast('تم تصدير كشف حساب المورد بنجاح');
  };

  const handleWhatsAppShare = () => {
    if (!supplier.phone) {
      showToast('لا يوجد رقم هاتف مسجل للمورد', 'warning');
      return;
    }

    const cleanPhone = supplier.phone.replace(/[^0-9]/g, '');
    const message = `*كشف حساب مورد - ${settings.pharmacyName}*\n\n` +
      `السادة / ${supplier.name}\n` +
      `المندوب المسؤول: ${supplier.contactPerson || '-'}\n` +
      `تاريخ الاستخراج: ${new Date().toISOString().split('T')[0]}\n\n` +
      `*إجمالي التوريدات (فواتير):* ${totalDebit.toLocaleString('ar-YE')} ${settings.currencySymbol}\n` +
      `*إجمالي المدفوعات المسددة:* ${totalCredit.toLocaleString('ar-YE')} ${settings.currencySymbol}\n` +
      `*الرصيد المتبقي المستحق:* ${currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}\n\n` +
      `شكراً لتعاونكم معنا.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-teal-700/20 flex items-center justify-between bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 text-white shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">كشف حساب شركة التوريد / المورد</h2>
              <p className="text-[11px] text-teal-100/90 font-medium">
                {supplier.name} • {supplier.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPaymentModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPaymentModal(supplier);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">سند صرف وسداد</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="طباعة كشف الحساب A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طباعة A4</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="تصدير إكسيل CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إكسيل</span>
            </button>

            {supplier.phone && (
              <button
                onClick={handleWhatsAppShare}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="إرسال عبر الواتساب"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">واتساب</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Supplier Info & KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Debt Card */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50/40 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-800 block mb-1">الرصيد المستحق للمورد (الدين):</span>
                <span className="font-mono font-black text-lg sm:text-xl text-rose-700">
                  {currentBalance.toLocaleString('ar-YE')} {settings.currencySymbol}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {currentBalance > 0 ? 'مستحق السداد لشركة التوريد' : 'الحساب خالص ومسدد'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Total Invoices / Debit Card */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">إجمالي الفواتير والتوريدات:</span>
                <span className="font-mono font-black text-lg sm:text-xl text-slate-900">
                  {totalDebit.toLocaleString('ar-YE')} {settings.currencySymbol}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">حجم المشتريات المسجلة</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>

            {/* Total Payments / Credit Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 block mb-1">إجمالي المدفوعات المسددة:</span>
                <span className="font-mono font-black text-lg sm:text-xl text-emerald-700">
                  +{totalCredit.toLocaleString('ar-YE')} {settings.currencySymbol}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">سندات الصرف والدفعات</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-700">تصفية الفترة:</span>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  dateFilter === 'all' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  dateFilter === 'today' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('month')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  dateFilter === 'month' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الشهر الحالي
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('3months')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  dateFilter === '3months' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                آخر 3 أشهر
              </button>
            </div>
          </div>

          {/* Statement Ledger Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">رقم المرجع</th>
                    <th className="py-2.5 px-3">نوع الحركة</th>
                    <th className="py-2.5 px-4">البيان والتفاصيل</th>
                    <th className="py-2.5 px-3 text-left">وارد فواتير</th>
                    <th className="py-2.5 px-3 text-left">المسدد دفعات</th>
                    <th className="py-2.5 px-3 text-left">الرصيد المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        لا توجد حركات مسجلة للمورد في هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          <div>{tx.date}</div>
                          {tx.time && <div className="text-[10px] text-slate-400">{tx.time}</div>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-800">{tx.ref}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              tx.type === 'payment'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.typeLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">{tx.description}</td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                          {tx.debit > 0 ? tx.debit.toLocaleString('ar-YE') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {tx.credit > 0 ? '+' + tx.credit.toLocaleString('ar-YE') : '-'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-left font-mono font-black ${
                            tx.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                          } bg-slate-50`}
                        >
                          {tx.balance.toLocaleString('ar-YE')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            عدد الحركات: <span className="font-bold text-slate-800">{filteredTransactions.length}</span>
          </div>
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
