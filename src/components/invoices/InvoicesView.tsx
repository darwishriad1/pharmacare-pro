import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Printer,
  FileText,
  RotateCcw,
  Eye,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  Users
} from 'lucide-react';
import { SaleInvoice } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { ReturnInvoiceModal } from './ReturnInvoiceModal';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';

export const InvoicesView: React.FC = () => {
  const { formatCurrency, settings } = useSettingsStore();
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Selected modals
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<SaleInvoice | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const refreshSales = () => {
    setSales(db.getSales());
  };

  useEffect(() => {
    refreshSales();
    const unsub = db.subscribe(refreshSales);
    return unsub;
  }, []);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cashierName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesDate = !dateFilter || s.date === dateFilter;

    return matchesSearch && matchesPayment && matchesStatus && matchesDate;
  });

  // Calculate metrics
  const totalSalesRevenue = filteredSales
    .filter((s) => s.status !== 'returned')
    .reduce((acc, s) => acc + s.grandTotal, 0);

  const totalInvoicesCount = filteredSales.length;
  const returnedCount = filteredSales.filter((s) => s.status === 'returned').length;
  const avgTicket = totalInvoicesCount > 0 ? Math.round(totalSalesRevenue / (totalInvoicesCount - returnedCount || 1)) : 0;

  const handleExportCSV = () => {
    excelService.exportSalesToCSV(filteredSales);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="bg-white border border-teal-100 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">سجل فواتير المبيعات والمرتجع</h1>
            <p className="text-xs text-slate-500">
              أرشيف شامل لجميع الفواتير، طباعة الإيصالات، وإدارة عمليات الإرجاع والاستبدال
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors shadow-2xs active:scale-95"
        >
          <Download className="w-4 h-4 text-teal-600" />
          تصدير سجل المبيعات (CSV)
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-teal-100 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">إجمالي المبيعات المحصلة</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg font-mono font-black text-teal-700 mt-1">
            {formatCurrency(totalSalesRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{totalInvoicesCount} فاتورة مسجلة</div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">متوسط قيمة الفاتورة</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-lg font-mono font-black text-slate-900 mt-1">
            {formatCurrency(avgTicket)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">لكل معاملة بيع</div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">الفواتير المرتجعة</span>
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-mono font-black text-rose-600 mt-1">
            {returnedCount} فاتورة
          </div>
          <div className="text-[11px] text-rose-500/80 mt-0.5">تم استرداد مبالغها وإعادة المخزون</div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">فواتير البيع الآجل (ذمم)</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-mono font-black text-amber-700 mt-1">
            {filteredSales.filter((s) => s.paymentMethod === 'credit').length} فاتورة
          </div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">مسجلة بحسابات العملاء</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-teal-100 p-3.5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
          <input
            type="text"
            placeholder="رقم الفاتورة، اسم العميل، الكاشير..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
            title="تصفية حسب التاريخ"
          />
        </div>

        <div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-medium"
          >
            <option value="all">كافة طرق الدفع</option>
            <option value="cash">نقداً فقط</option>
            <option value="card">شبكة / بطاقة</option>
            <option value="credit">آجل (ذمة)</option>
            <option value="mixed">دفع مختلط</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-medium"
          >
            <option value="all">كافة الحالات</option>
            <option value="completed">مكتملة</option>
            <option value="returned">مرتجعة</option>
          </select>
        </div>
      </div>

      {/* Mobile Invoices Cards List (Visible on mobile < md) */}
      <div className="md:hidden space-y-2.5">
        {filteredSales.length === 0 ? (
          <div className="p-8 text-center bg-white border border-teal-100 rounded-2xl text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600 text-sm">لا توجد فواتير مطابقة للبحث</p>
          </div>
        ) : (
          filteredSales.map((inv) => {
            const isRet = inv.status === 'returned';

            return (
              <div
                key={inv.id}
                className="bg-white border border-teal-100 rounded-2xl p-3.5 shadow-sm space-y-2.5"
              >
                {/* Top: Invoice No & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-teal-700 font-bold text-sm">#{inv.invoiceNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isRet
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {isRet ? 'مرتجعة' : 'مكتملة'}
                    </span>
                  </div>

                  <span className="font-mono font-black text-sm text-teal-800">
                    {formatCurrency(inv.grandTotal)}
                  </span>
                </div>

                {/* Customer & Payment */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-900 truncate max-w-[150px]">
                    {inv.customerName || 'عميل نقدي عام'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {inv.paymentMethod === 'cash'
                        ? 'نقداً'
                        : inv.paymentMethod === 'card'
                        ? 'شبكة'
                        : inv.paymentMethod === 'credit'
                        ? 'آجل'
                        : 'مختلط'}
                    </span>
                    <span className="text-[10px] text-slate-400">{inv.items.length} صنف</span>
                  </div>
                </div>

                {/* Date & Time & Cashier */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{inv.date} - {inv.time}</span>
                  <span>كاشير: {inv.cashierName}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => printerService.printThermalReceipt(inv, settings)}
                      className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 active:scale-95 transition-transform"
                      title="طباعة إيصال"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {!isRet && (
                      <button
                        onClick={() => {
                          setReturnInvoice(inv);
                          setIsReturnModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-transform"
                        title="إرجاع"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setIsDetailsModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold active:scale-95 transition-transform shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض التفاصيل</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sales Invoices Table (Visible on md and larger) */}
      <div className="hidden md:block bg-white border border-teal-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-teal-50/80 text-teal-950 border-b border-teal-100 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">الكاشير</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">عدد الأصناف</th>
                <th className="p-3.5">المبلغ الإجمالي</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">لا توجد فواتير مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((inv) => {
                  const isRet = inv.status === 'returned';

                  return (
                    <tr key={inv.id} className="hover:bg-teal-50/40 transition-colors">
                      {/* Invoice Number */}
                      <td className="p-3.5 font-mono text-teal-700 font-bold text-sm">
                        #{inv.invoiceNumber}
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5">
                        <div className="font-mono text-slate-900 font-bold text-xs">{inv.date}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.time}</div>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5 font-bold text-slate-900">
                        {inv.customerName || 'عميل نقدي عام'}
                      </td>

                      {/* Cashier */}
                      <td className="p-3.5 text-slate-600 text-xs font-medium">
                        {inv.cashierName}
                      </td>

                      {/* Payment Method Badge */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                          {inv.paymentMethod === 'cash'
                            ? 'نقداً'
                            : inv.paymentMethod === 'card'
                            ? 'شبكة'
                            : inv.paymentMethod === 'credit'
                            ? 'آجل'
                            : 'مختلط'}
                        </span>
                      </td>

                      {/* Items count */}
                      <td className="p-3.5 font-mono text-slate-600 font-medium">
                        {inv.items.length} صنف
                      </td>

                      {/* Grand total */}
                      <td className="p-3.5 font-mono font-black text-teal-700 text-sm">
                        {formatCurrency(inv.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRet
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                        >
                          {isRet ? 'مرتجعة' : 'مكتملة'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 transition-colors"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print thermal */}
                          <button
                            onClick={() => printerService.printThermalReceipt(inv, settings)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                            title="طباعة إيصال حراري"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Return button */}
                          {!isRet && (
                            <button
                              onClick={() => {
                                setReturnInvoice(inv);
                                setIsReturnModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                              title="إرجاع واسترداد"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <InvoiceDetailsModal
        isOpen={isDetailsModalOpen}
        invoice={selectedInvoice}
        onClose={() => setIsDetailsModalOpen(false)}
        onOpenReturn={(inv) => {
          setIsDetailsModalOpen(false);
          setReturnInvoice(inv);
          setIsReturnModalOpen(true);
        }}
      />

      {/* Return Modal */}
      <ReturnInvoiceModal
        isOpen={isReturnModalOpen}
        invoice={returnInvoice}
        onClose={() => setIsReturnModalOpen(false)}
        onReturnCompleted={refreshSales}
      />
    </div>
  );
};
