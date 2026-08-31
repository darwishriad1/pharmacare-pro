import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  DollarSign,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  Download,
  Printer,
  Receipt,
  Eye,
  CreditCard,
  Building,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  Filter,
  Share2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  User,
  ShoppingBag,
} from 'lucide-react';
import { Supplier, PurchaseInvoice } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { SupplierModal } from './SupplierModal';
import { PurchasePOSView } from './PurchasePOSView';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { PurchaseInvoiceDetailsModal } from './PurchaseInvoiceDetailsModal';
import { SupplierStatementModal } from './SupplierStatementModal';
import { excelService } from '../../services/excelService';
import { printerService } from '../../services/printerService';

export const PurchasesView: React.FC = () => {
  const { settings, formatCurrency, purchasesSubTab, setPurchasesSubTab, showToast } = useSettingsStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers' | 'debts'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);

  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const refreshData = () => {
    setSuppliers(db.getSuppliers());
    setPurchases(db.getPurchases());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, []);

  // Sync tab with store if changed
  useEffect(() => {
    if (purchasesSubTab === 'suppliers') {
      setActiveTab('suppliers');
    } else if (purchasesSubTab === 'invoices') {
      setActiveTab('invoices');
    }
  }, [purchasesSubTab]);

  // Aggregate stats
  const totalSupplierDebts = suppliers.reduce((acc, s) => acc + (s.currentBalance || 0), 0);
  const totalPurchasesVolume = purchases.reduce((acc, p) => acc + (p.grandTotal || p.totalAmount || 0), 0);
  const totalPaidVolume = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const indebtedSuppliersCount = suppliers.filter((s) => (s.currentBalance || 0) > 0).length;

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return purchases.filter((p) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && p.paymentStatus !== 'paid') return false;
        if (statusFilter === 'partial' && p.paymentStatus !== 'partial') return false;
        if (statusFilter === 'unpaid' && p.paymentStatus !== 'unpaid') return false;
      }

      // Date
      if (dateFilter === 'today' && p.date !== todayStr) return false;
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (p.date < weekAgo) return false;
      }
      if (dateFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        if (p.date < monthStart) return false;
      }

      return true;
    });
  }, [purchases, searchQuery, statusFilter, dateFilter]);

  // Filter Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (activeTab === 'debts' && (!s.currentBalance || s.currentBalance <= 0)) {
        return false;
      }

      return (
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.companyName && s.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [suppliers, searchQuery, activeTab]);

  // Export handlers
  const handleExportPurchases = () => {
    excelService.exportPurchasesToCSV(filteredInvoices);
    showToast('تم تصدير سجل فواتير المشتريات بنجاح');
  };

  const handleExportSuppliers = () => {
    excelService.exportSuppliersToCSV(filteredSuppliers);
    showToast('تم تصدير دليل الموردين بنجاح');
  };

  const handlePrintDebtsReport = () => {
    printerService.printSupplierDebtsReport(suppliers, settings);
  };

  const handleOpenPayment = (sup: Supplier) => {
    setPaymentSupplier(sup);
    setIsPaymentModalOpen(true);
  };

  const handleOpenStatement = (sup: Supplier) => {
    setStatementSupplier(sup);
    setIsStatementModalOpen(true);
  };

  const handleOpenInvoiceDetails = (inv: PurchaseInvoice) => {
    setSelectedInvoice(inv);
    setIsInvoiceDetailsOpen(true);
  };

  const handleDeleteSupplier = (sup: Supplier) => {
    if ((sup.currentBalance || 0) > 0) {
      alert(`لا يمكن حذف المورد (${sup.name}) لوجود رصيد مستحق بذمة الصيدلية له قدره ${formatCurrency(sup.currentBalance)}.`);
      return;
    }

    if (confirm(`هل أنت متأكد من حذف المورد (${sup.name}) نهائياً من النظام؟`)) {
      db.deleteSupplier(sup.id);
      showToast(`تم حذف المورد ${sup.name} بنجاح`);
      refreshData();
    }
  };

  // If user selected "create_invoice", render the dedicated Purchase POS view directly
  if (purchasesSubTab === 'create_invoice') {
    return <PurchasePOSView />;
  }

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-7xl mx-auto select-none">
      {/* Header Banner */}
      <div className="bg-white border border-teal-100/80 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-800 text-white flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
              المشتريات وإدارة الموردين
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              سجل بضائع التوريد، تتبع فواتير الشركات، ومطابقة كشوفات الحسابات والديون
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'invoices' && (
            <button
              onClick={handleExportPurchases}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير إكسيل</span>
            </button>
          )}

          {activeTab === 'suppliers' && (
            <>
              <button
                onClick={handleExportSuppliers}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير إكسيل</span>
              </button>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setIsSupplierModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-md shadow-teal-700/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة شركة / مورد</span>
              </button>
            </>
          )}

          {activeTab === 'debts' && (
            <button
              onClick={handlePrintDebtsReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير الديون A4</span>
            </button>
          )}

          <button
            onClick={() => setPurchasesSubTab('create_invoice')}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-700/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فاتورة توريد وشراء جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Purchases Volume */}
        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">إجمالي المشتريات والتوريد</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-xl font-mono font-black text-slate-900">
              {formatCurrency(totalPurchasesVolume)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-teal-700 font-bold mt-0.5">
              مسدد منها: {formatCurrency(totalPaidVolume)}
            </div>
          </div>
        </div>

        {/* Total Supplier Debts */}
        <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-200/80 p-3.5 sm:p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900">ديون ومستحقات الموردين</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-xl font-mono font-black text-amber-800">
              {formatCurrency(totalSupplierDebts)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-amber-800 font-bold mt-0.5">
              على {indebtedSuppliersCount} شركة ومورد
            </div>
          </div>
        </div>

        {/* Total Invoices Count */}
        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">عدد فواتير الشراء</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-xl font-mono font-black text-slate-900">
              {purchases.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
              فاتورة مسجلة بالنظام
            </div>
          </div>
        </div>

        {/* Total Suppliers Count */}
        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">الموردين والشركات</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-xl font-mono font-black text-slate-900">
              {suppliers.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
              شركة أدوية ومستودع
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Subtabs & Search & Filters */}
      <div className="bg-white border border-teal-100/80 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('invoices');
                setPurchasesSubTab('invoices');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📑 سجل فواتير الشراء ({purchases.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('suppliers');
                setPurchasesSubTab('suppliers');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'suppliers'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 دليل وسجل الموردين ({suppliers.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('debts');
                setPurchasesSubTab('suppliers');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'debts'
                  ? 'bg-white text-amber-800 shadow-xs border border-amber-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⏳ ديون ومستحقات الموردين ({indebtedSuppliersCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'invoices'
                  ? 'بحث برقم الفاتورة، اسم المورد، الصنف...'
                  : 'بحث باسم المورد، المندوب، الهاتف...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Secondary Filter Row (Only for Invoices) */}
        {activeTab === 'invoices' && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500">حالة السداد:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    statusFilter === 'paid' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  مدفوعة بالكامل
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('partial')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    statusFilter === 'partial' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  مدفوعة جزئياً
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unpaid')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    statusFilter === 'unpaid' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  آجل (غير مدفوعة)
                </button>
              </div>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">الفترة:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">جميع الفترات</option>
                <option value="today">اليوم فقط</option>
                <option value="week">آخر 7 أيام</option>
                <option value="month">الشهر الحالي</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'invoices' ? (
        /* ================= INVOICES SECTION ================= */
        <div className="space-y-3">
          {/* Mobile Invoices Cards View (Visible on < md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredInvoices.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                لا توجد فواتير مشتريات مطابقة للبحث
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const total = inv.grandTotal || inv.totalAmount || 0;
                const remaining = inv.remainingAmount || 0;
                return (
                  <div
                    key={inv.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-teal-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-teal-800 text-sm">
                          #{inv.invoiceNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.paymentStatus === 'paid'
                            ? 'مدفوعة'
                            : inv.paymentStatus === 'partial'
                            ? 'سداد جزئي'
                            : 'آجل'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{inv.date}</span>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{inv.supplierName}</span>
                        <span className="text-[11px] text-slate-400 block">{inv.items.length} صنف دوائي</span>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-black text-sm text-slate-900 block">
                          {formatCurrency(total)}
                        </span>
                        {remaining > 0 ? (
                          <span className="text-[10px] font-mono font-bold text-rose-600 block">
                            متبقي: {formatCurrency(remaining)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 block">خالصة</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenInvoiceDetails(inv)}
                        className="flex-1 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض التفاصيل</span>
                      </button>

                      <button
                        onClick={() => printerService.printPurchaseInvoice(inv, settings)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                        title="طباعة A4"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => printerService.printPurchaseThermalReceipt(inv, settings)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                        title="طباعة إيصال حراري"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Invoices Table View (Visible on md+) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">رقم الفاتورة</th>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">شركة التوريد / المورد</th>
                    <th className="py-3 px-3 text-center">الأصناف</th>
                    <th className="py-3 px-4 text-left">إجمالي القيمة</th>
                    <th className="py-3 px-4 text-left">المدفوع</th>
                    <th className="py-3 px-4 text-left">المتبقي (آجل)</th>
                    <th className="py-3 px-4 text-center">حالة السداد</th>
                    <th className="py-3 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        لا توجد فواتير مشتريات مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const total = inv.grandTotal || inv.totalAmount || 0;
                      const remaining = inv.remainingAmount || 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-teal-800 font-black">
                            #{inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{inv.date}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">{inv.supplierName}</div>
                            {inv.supplierInvoiceNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                سند مورد: #{inv.supplierInvoiceNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                            {inv.items.length} صنف
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-black text-slate-900 text-sm">
                            {formatCurrency(total)}
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold text-emerald-700">
                            {formatCurrency(inv.paidAmount)}
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold">
                            {remaining > 0 ? (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {formatCurrency(remaining)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                خالص
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                inv.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.paymentStatus === 'partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {inv.paymentStatus === 'paid'
                                ? 'مدفوعة بالكامل'
                                : inv.paymentStatus === 'partial'
                                ? 'مدفوعة جزئياً'
                                : 'آجل (غير مدفوعة)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenInvoiceDetails(inv)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                title="تفاصيل الفاتورة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>تفاصيل</span>
                              </button>

                              <button
                                onClick={() => printerService.printPurchaseInvoice(inv, settings)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                                title="طباعة A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => printerService.printPurchaseThermalReceipt(inv, settings)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                                title="طباعة إيصال حراري"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      ) : (
        /* ================= SUPPLIERS / DEBTS SECTION ================= */
        <div className="space-y-3">
          {/* Mobile Suppliers Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredSuppliers.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                لا يوجد موردين مطابقين للبحث
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const debt = sup.currentBalance || 0;
                return (
                  <div
                    key={sup.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-teal-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-xs">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900">{sup.name}</h3>
                          <span className="text-[10px] text-slate-400 font-medium">
                            المندوب: {sup.contactPerson || '-'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
                          debt > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {debt > 0 ? formatCurrency(debt) : 'خالص'}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">رقم الهاتف / الواتساب:</span>
                        <a
                          href={`tel:${sup.phone}`}
                          className="font-mono font-bold text-teal-800 text-[11px] hover:underline"
                        >
                          {sup.phone || '-'}
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">العنوان والموقع:</span>
                        <span className="text-slate-700 text-[11px] truncate block">{sup.address || '-'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleOpenStatement(sup)}
                        className="flex-1 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>كشف الحساب</span>
                      </button>

                      {debt > 0 && (
                        <button
                          onClick={() => handleOpenPayment(sup)}
                          className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>سداد دفعة</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingSupplier(sup);
                          setIsSupplierModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                        title="تعديل بيانات المورد"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Suppliers Table View */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم شركة التوريد / المورد</th>
                    <th className="py-3 px-4">المندوب المسؤول</th>
                    <th className="py-3 px-4">رقم الهاتف / الواتساب</th>
                    <th className="py-3 px-4">العنوان والمقر</th>
                    <th className="py-3 px-4 text-left">إجمالي المشتريات</th>
                    <th className="py-3 px-4 text-left">الرصيد المستحق (دين)</th>
                    <th className="py-3 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا يوجد موردين مطابقين للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => {
                      const debt = sup.currentBalance || 0;
                      return (
                        <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-black text-slate-900 text-xs">{sup.name}</div>
                            {sup.email && (
                              <div className="text-[10px] text-slate-400 font-mono">{sup.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{sup.contactPerson || '-'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-teal-800">{sup.phone || '-'}</td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[180px] truncate">
                            {sup.address || '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                            {formatCurrency(sup.totalPurchases || 0)}
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-black">
                            {debt > 0 ? (
                              <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                {formatCurrency(debt)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                خالص
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenStatement(sup)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                title="كشف حساب المورد"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>كشف حساب</span>
                              </button>

                              {debt > 0 && (
                                <button
                                  onClick={() => handleOpenPayment(sup)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="سند صرف مالي"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>سداد</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingSupplier(sup);
                                  setIsSupplierModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                                title="تعديل بيانات المورد"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteSupplier(sup)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all active:scale-95 cursor-pointer"
                                title="حذف المورد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* Modals */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        supplier={editingSupplier}
        onClose={() => setIsSupplierModalOpen(false)}
        onSaved={refreshData}
      />

      <SupplierPaymentModal
        isOpen={isPaymentModalOpen}
        supplier={paymentSupplier}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={refreshData}
      />

      <PurchaseInvoiceDetailsModal
        isOpen={isInvoiceDetailsOpen}
        invoice={selectedInvoice}
        onClose={() => setIsInvoiceDetailsOpen(false)}
        onInvoiceUpdated={refreshData}
      />

      <SupplierStatementModal
        isOpen={isStatementModalOpen}
        supplier={statementSupplier}
        onClose={() => setIsStatementModalOpen(false)}
        onOpenPaymentModal={handleOpenPayment}
      />
    </div>
  );
};

