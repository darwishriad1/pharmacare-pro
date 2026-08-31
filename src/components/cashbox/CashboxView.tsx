import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  FileText,
  Tag,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Layers,
  ArrowRightLeft,
  ChevronRight,
  RefreshCw,
  Wallet,
  Landmark,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  Expense,
  CustomerPayment,
  SupplierPayment,
  CashboxTransaction,
  ShiftReconciliation,
  SaleInvoice,
  SaleReturn
} from '../../types';
import { ExpenseModal } from '../expenses/ExpenseModal';
import { CashDepositWithdrawModal } from './CashDepositWithdrawModal';
import { ShiftReconciliationModal } from './ShiftReconciliationModal';
import { PrintCashboxReportModal } from './PrintCashboxReportModal';
import { excelService } from '../../services/excelService';

export type CashboxSubTab = 'overview' | 'ledger' | 'expenses' | 'receipts' | 'reconciliations';

export interface UnifiedLedgerItem {
  id: string;
  sourceType: 'sale' | 'expense' | 'customer_payment' | 'supplier_payment' | 'deposit' | 'withdrawal' | 'refund';
  sourceId: string;
  referenceNumber: string;
  title: string;
  category?: string;
  partyName?: string; // customer, supplier, vendor, cashier
  amount: number; // always positive for calculation, direction defined by direction
  direction: 'inflow' | 'outflow'; // inflow (+), outflow (-)
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit';
  date: string;
  timestamp: string;
  recordedBy: string;
  notes?: string;
}

export const CashboxView: React.FC = () => {
  const { formatCurrency, showToast, settings, setActiveTab } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<CashboxSubTab>('overview');
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDepositWithdrawModalOpen, setIsDepositWithdrawModalOpen] = useState(false);
  const [depositWithdrawType, setDepositWithdrawType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState(false);

  // Raw Database Data
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashboxTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<ShiftReconciliation[]>([]);

  const loadData = () => {
    setSales(db.getSales());
    setReturns(db.getReturns());
    setExpenses(db.getExpenses());
    setCustomerPayments(db.getCustomerPayments());
    setSupplierPayments(db.getSupplierPayments());
    setCashTransactions(db.getCashTransactions());
    setReconciliations(db.getShiftReconciliations());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Today ISO string
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper date checker
  const isDateInRange = (dateStr: string) => {
    if (dateRangeFilter === 'all') return true;
    const itemDate = new Date(dateStr);
    const now = new Date();

    if (dateRangeFilter === 'today') {
      return dateStr === todayStr;
    } else if (dateRangeFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return itemDate >= oneWeekAgo;
    } else if (dateRangeFilter === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= firstDay;
    }
    return true;
  };

  // Build Unified Ledger Items
  const allLedgerItems = useMemo<UnifiedLedgerItem[]>(() => {
    const list: UnifiedLedgerItem[] = [];

    // 1. Sales
    sales.forEach((s) => {
      if (s.status === 'cancelled') return;
      const isCash = s.paymentMethod === 'cash';
      const isCard = s.paymentMethod === 'card';
      const isPaid = isCash || isCard || (s.paidAmount && s.paidAmount > 0);

      if (isPaid) {
        const method: 'cash' | 'card' | 'bank_transfer' | 'credit' =
          s.paymentMethod === 'card' ? 'card' : s.paymentMethod === 'credit' ? 'credit' : 'cash';

        list.push({
          id: `sale-${s.id}`,
          sourceType: 'sale',
          sourceId: s.id,
          referenceNumber: s.invoiceNumber,
          title: `فاتورة مبيعات (${s.items?.length || 1} صنف)`,
          partyName: s.customerName || 'عميل نقدي',
          amount: s.paidAmount || s.grandTotal,
          direction: 'inflow',
          paymentMethod: method,
          date: s.date,
          timestamp: s.createdAt || s.date,
          recordedBy: s.cashierName || 'الكاشير',
          notes: s.notes,
        });
      }
    });

    // 2. Sales Returns
    returns.forEach((r) => {
      list.push({
        id: `ret-${r.id}`,
        sourceType: 'refund',
        sourceId: r.id,
        referenceNumber: r.returnNumber,
        title: `مرتجع مبيعات لفاتورة ${r.originalInvoiceNumber}`,
        partyName: r.customerName || 'عميل نقدي',
        amount: r.totalRefund,
        direction: 'outflow',
        paymentMethod: r.refundMethod === 'credit_reversal' ? 'credit' : (r.refundMethod as any) || 'cash',
        date: r.date || r.createdAt?.split('T')[0] || todayStr,
        timestamp: r.createdAt || todayStr,
        recordedBy: r.cashierName || 'الكاشير',
        notes: r.reason,
      });
    });

    // 3. Customer Debt Payments (سندات قبض ديون)
    customerPayments.forEach((cp) => {
      list.push({
        id: `cpay-${cp.id}`,
        sourceType: 'customer_payment',
        sourceId: cp.id,
        referenceNumber: `REC-C-${cp.id.slice(-4)}`,
        title: `سند قبض دفعة دين من عميل`,
        partyName: cp.customerName,
        amount: cp.amount,
        direction: 'inflow',
        paymentMethod: cp.paymentMethod,
        date: cp.date,
        timestamp: cp.createdAt || cp.date,
        recordedBy: cp.recordedBy || 'المسؤول',
        notes: cp.notes,
      });
    });

    // 4. Expenses (سندات صرف مصروفات)
    expenses.forEach((e) => {
      const categoryLabels: Record<string, string> = {
        rent: 'إيجار',
        electricity: 'كهرباء وطاقة',
        salaries: 'رواتب ومكافآت',
        supplies: 'مستلزمات ونثريات',
        maintenance: 'صيانة وتشغيل',
        taxes: 'ضرائب ورسوم',
        other: 'مصروفات أخرى',
      };
      list.push({
        id: `exp-${e.id}`,
        sourceType: 'expense',
        sourceId: e.id,
        referenceNumber: `VOU-EXP-${e.id.slice(-4)}`,
        title: `سند صرف مصروف: ${e.title}`,
        category: categoryLabels[e.category] || e.category,
        partyName: e.paidBy || 'الصيدلية',
        amount: e.amount,
        direction: 'outflow',
        paymentMethod: e.paymentMethod,
        date: e.date,
        timestamp: e.createdAt || e.date,
        recordedBy: e.paidBy || 'المسؤول',
        notes: e.notes,
      });
    });

    // 5. Supplier Payments (مدفوعات لموردين)
    supplierPayments.forEach((sp) => {
      list.push({
        id: `spay-${sp.id}`,
        sourceType: 'supplier_payment',
        sourceId: sp.id,
        referenceNumber: `VOU-SUP-${sp.id.slice(-4)}`,
        title: `سند سداد دفعة لمورد`,
        partyName: sp.supplierName,
        amount: sp.amount,
        direction: 'outflow',
        paymentMethod: sp.paymentMethod,
        date: sp.date,
        timestamp: sp.createdAt || sp.date,
        recordedBy: sp.recordedBy || 'المسؤول',
        notes: sp.notes,
      });
    });

    // 6. Cash Deposits & Withdrawals (إيداعات وسحوبات الصندوق)
    cashTransactions.forEach((ctx) => {
      list.push({
        id: `ctx-${ctx.id}`,
        sourceType: ctx.type === 'deposit' ? 'deposit' : 'withdrawal',
        sourceId: ctx.id,
        referenceNumber: `CTX-${ctx.type.toUpperCase().slice(0, 3)}-${ctx.id.slice(-4)}`,
        title: ctx.title,
        category: ctx.category,
        partyName: ctx.recordedBy,
        amount: ctx.amount,
        direction: ctx.type === 'deposit' ? 'inflow' : 'outflow',
        paymentMethod: ctx.paymentMethod || 'cash',
        date: ctx.date,
        timestamp: ctx.createdAt || ctx.date,
        recordedBy: ctx.recordedBy,
        notes: ctx.notes,
      });
    });

    // Sort by timestamp descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, returns, customerPayments, expenses, supplierPayments, cashTransactions]);

  // Overall Financial Calculations (All time / current drawer state)
  const cashInDrawer = useMemo(() => {
    let balance = 0;
    allLedgerItems.forEach((item) => {
      if (item.paymentMethod === 'cash') {
        if (item.direction === 'inflow') balance += item.amount;
        if (item.direction === 'outflow') balance -= item.amount;
      }
    });
    return Math.max(0, balance);
  }, [allLedgerItems]);

  // Filtered Ledger Items based on Active Filters
  const filteredLedgerItems = useMemo(() => {
    return allLedgerItems.filter((item) => {
      const matchDate = isDateInRange(item.date);
      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'inflow' && item.direction === 'inflow') ||
        (typeFilter === 'outflow' && item.direction === 'outflow') ||
        item.sourceType === typeFilter;

      const matchMethod =
        paymentMethodFilter === 'all' || item.paymentMethod === paymentMethodFilter;

      const matchSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.partyName && item.partyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchDate && matchType && matchMethod && matchSearch;
    });
  }, [allLedgerItems, dateRangeFilter, typeFilter, paymentMethodFilter, searchQuery]);

  // Metrics for Current Selected Range
  const rangeMetrics = useMemo(() => {
    let totalInflows = 0;
    let totalOutflows = 0;
    let salesCash = 0;
    let customerDebtCash = 0;
    let cashDeposits = 0;
    let expensesCash = 0;
    let supplierPaymentsCash = 0;
    let cashWithdrawals = 0;
    let refundsCash = 0;

    let posCardTotal = 0;
    let bankTransferTotal = 0;

    allLedgerItems.forEach((item) => {
      if (!isDateInRange(item.date)) return;

      if (item.direction === 'inflow') {
        totalInflows += item.amount;
        if (item.paymentMethod === 'cash') {
          if (item.sourceType === 'sale') salesCash += item.amount;
          if (item.sourceType === 'customer_payment') customerDebtCash += item.amount;
          if (item.sourceType === 'deposit') cashDeposits += item.amount;
        }
      } else {
        totalOutflows += item.amount;
        if (item.paymentMethod === 'cash') {
          if (item.sourceType === 'expense') expensesCash += item.amount;
          if (item.sourceType === 'supplier_payment') supplierPaymentsCash += item.amount;
          if (item.sourceType === 'withdrawal') cashWithdrawals += item.amount;
          if (item.sourceType === 'refund') refundsCash += item.amount;
        }
      }

      if (item.paymentMethod === 'card') posCardTotal += item.amount;
      if (item.paymentMethod === 'bank_transfer') bankTransferTotal += item.amount;
    });

    const netCashFlow = totalInflows - totalOutflows;

    return {
      totalInflows,
      totalOutflows,
      netCashFlow,
      salesCash,
      customerDebtCash,
      cashDeposits,
      expensesCash,
      supplierPaymentsCash,
      cashWithdrawals,
      refundsCash,
      posCardTotal,
      bankTransferTotal,
      transactionsCount: allLedgerItems.filter((i) => isDateInRange(i.date)).length,
    };
  }, [allLedgerItems, dateRangeFilter]);

  // Export Ledger to CSV
  const handleExportCSV = () => {
    const rows = filteredLedgerItems.map((i) => ({
      'رقم السند': i.referenceNumber,
      'البيان': i.title,
      'الجهة / المسؤول': i.partyName || i.recordedBy,
      'النوع': i.direction === 'inflow' ? 'وارد (قبض)' : 'صادر (صرف)',
      'المبلغ': i.amount,
      'طريقة الدفع': i.paymentMethod === 'cash' ? 'نقدي' : i.paymentMethod === 'card' ? 'شبكة' : 'تحويل بنكي',
      'التاريخ': i.date,
      'المسؤول': i.recordedBy,
      'ملاحظات': i.notes || '',
    }));

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [Object.keys(rows[0] || {}).join(','), ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashbox_ledger_${dateRangeFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير كشف الحركات المالية بنجاح', 'success');
  };

  const handleDeleteExpense = (id: string, title: string) => {
    if (confirm(`هل أنت متأكد من حذف سند المصروف (${title})؟`)) {
      db.deleteExpense(id);
      showToast('تم حذف سند المصروف بنجاح', 'info');
    }
  };

  const handleDeleteCashTransaction = (id: string, title: string) => {
    if (confirm(`هل أنت متأكد من إلغاء وحذف حركة الصندوق (${title})؟`)) {
      db.deleteCashTransaction(id);
      showToast('تم حذف حركة الصندوق بنجاح', 'info');
    }
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-7xl mx-auto select-none">

      {/* ======================================================== */}
      {/* 1. Main Header & Fast Launcher                          */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Title & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-700/20 shrink-0">
            <Coins className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                الصندوق والخزينة والإدارة المالية
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                درج الصندوق متصل
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              إدارة حركة السيولة النقدية، المصروفات التشغيلية، سندات القبض والصرف، وجرد الورديات
            </p>
          </div>
        </div>

        {/* Quick Action Operations */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Expense */}
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="تسجيل سند صرف لمصروف جديد"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سند صرف مصروف</span>
          </button>

          {/* Quick Deposit */}
          <button
            type="button"
            onClick={() => {
              setDepositWithdrawType('deposit');
              setIsDepositWithdrawModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="إيداع نقدي وتغذية الصندوق"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>إيداع نقدي (تغذية)</span>
          </button>

          {/* Quick Withdrawal */}
          <button
            type="button"
            onClick={() => {
              setDepositWithdrawType('withdrawal');
              setIsDepositWithdrawModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="سحب نقدي من الصندوق أو توريد للبنك"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سحب نقدي / توريد</span>
          </button>

          {/* Shift Drawer Reconciliation (جرد الصندوق) */}
          <button
            type="button"
            onClick={() => setIsReconciliationModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer border border-slate-700"
            title="جرد ومطابقة الدرج وتقفيل الوردية"
          >
            <Scale className="w-4 h-4 text-teal-400" />
            <span>جرد وتقفيل الوردية</span>
          </button>

          {/* Print Cash Report */}
          <button
            type="button"
            onClick={() => setIsPrintReportModalOpen(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            title="طباعة كشف حركة الصندوق"
          >
            <Printer className="w-4 h-4 text-teal-700" />
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. Realtime Liquidity & Financial KPI Cards             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Card 1: Actual Cash in Drawer */}
        <div className="col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 text-white p-4 rounded-3xl shadow-md border border-teal-800/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-teal-300">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-teal-400" />
                <span>الرصيد النقدي في الدرج (Cash)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/30">
                السيولة الحالية
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-2 tracking-tight">
              {formatCurrency(cashInDrawer)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>المبلغ المتواجد بالدرج الآن</span>
            <button
              onClick={() => setIsReconciliationModalOpen(true)}
              className="text-teal-300 hover:text-white font-bold text-[10px] flex items-center gap-0.5 underline cursor-pointer"
            >
              مطابقة وجرد
            </button>
          </div>
        </div>

        {/* Card 2: Today Inflows (التدفقات الداخلة) */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>المقبوضات الداخلة</span>
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-mono font-black text-emerald-600 mt-1">
            {formatCurrency(rangeMetrics.totalInflows)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            مبيعات + ديون + إيداعات
          </div>
        </div>

        {/* Card 3: Today Outflows (المصروفات والمدفوعات) */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>المدفوعات الخارجة</span>
            <div className="p-1 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-mono font-black text-rose-600 mt-1">
            {formatCurrency(rangeMetrics.totalOutflows)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            مصاريف + موردين + سحوبات
          </div>
        </div>

        {/* Card 4: POS Card & Electronic */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>الشبكة والبطاقات</span>
            <div className="p-1 rounded-lg bg-sky-50 text-sky-600">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-mono font-black text-sky-700 mt-1">
            {formatCurrency(rangeMetrics.posCardTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            نقاط البيع مدى / فيزا
          </div>
        </div>

        {/* Card 5: Bank Transfers */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>تحويلات بنكية</span>
            <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-mono font-black text-indigo-700 mt-1">
            {formatCurrency(rangeMetrics.bankTransferTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            إيداعات بنكية مباشرة
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. Sub-Navigation Tabs & Period Filter Bar              */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 p-2 sm:p-2.5 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🌟 لوحة الخزينة والملخص
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>سجل الحركات الموحد ({filteredLedgerItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('expenses')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'expenses'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>سندات الصرف والمصروفات ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('receipts')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'receipts'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>سندات القبض والتحصيل ({customerPayments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reconciliations')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'reconciliations'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            <span>جرد وتسويات الورديات ({reconciliations.length})</span>
          </button>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setDateRangeFilter('today')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              dateRangeFilter === 'today' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            اليوم
          </button>
          <button
            type="button"
            onClick={() => setDateRangeFilter('week')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              dateRangeFilter === 'week' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            آخر 7 أيام
          </button>
          <button
            type="button"
            onClick={() => setDateRangeFilter('month')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              dateRangeFilter === 'month' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            هذا الشهر
          </button>
          <button
            type="button"
            onClick={() => setDateRangeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              dateRangeFilter === 'all' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. Sub-Tab 1: OVERVIEW & CASH FLOW BREAKDOWN             */}
      {/* ======================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Detailed Inflows vs Outflows Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Inflows Breakdown Box */}
            <div className="bg-white border border-emerald-100 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  <span>تفاصيل التدفقات النقدية الداخلة (Inflows)</span>
                </div>
                <span className="font-mono font-black text-emerald-700 text-base">
                  +{formatCurrency(rangeMetrics.totalInflows)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-700">مبيعات نقدية (كاش الدرج)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(rangeMetrics.salesCash)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="font-bold text-slate-700">مقبوضات سداد ديون العملاء</span>
                  </div>
                  <span className="font-mono font-bold text-teal-700">{formatCurrency(rangeMetrics.customerDebtCash)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span className="font-bold text-slate-700">إيداعات وتغذية نقدية للصندوق</span>
                  </div>
                  <span className="font-mono font-bold text-sky-700">{formatCurrency(rangeMetrics.cashDeposits)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>مبيعات إلكترونية (شبكة + بنكي)</span>
                  </div>
                  <span className="font-mono font-bold">{formatCurrency(rangeMetrics.posCardTotal + rangeMetrics.bankTransferTotal)}</span>
                </div>
              </div>
            </div>

            {/* Outflows Breakdown Box */}
            <div className="bg-white border border-rose-100 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                  <span>تفاصيل التدفقات النقدية الخارجة (Outflows)</span>
                </div>
                <span className="font-mono font-black text-rose-700 text-base">
                  -{formatCurrency(rangeMetrics.totalOutflows)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-slate-700">سندات صرف المصروفات والنثريات</span>
                  </div>
                  <span className="font-mono font-bold text-rose-700">{formatCurrency(rangeMetrics.expensesCash)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-slate-700">مدفوعات نقدية للموردين</span>
                  </div>
                  <span className="font-mono font-bold text-amber-700">{formatCurrency(rangeMetrics.supplierPaymentsCash)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="font-bold text-slate-700">سحب نقدي من الصندوق / توريد بنك</span>
                  </div>
                  <span className="font-mono font-bold text-orange-700">{formatCurrency(rangeMetrics.cashWithdrawals)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-bold text-slate-700">مرتجعات مبيعات نقدية للعملاء</span>
                  </div>
                  <span className="font-mono font-bold text-purple-700">{formatCurrency(rangeMetrics.refundsCash)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Recent Activity Feed in Cashbox */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">آخر الحركات المالية المسجلة بالصندوق</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('ledger')}
                className="text-xs text-teal-600 hover:text-teal-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>عرض السجل الشامل</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {allLedgerItems.slice(0, 8).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      item.direction === 'inflow' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {item.direction === 'inflow' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">{item.referenceNumber}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="text-teal-700 font-semibold">{item.partyName || item.recordedBy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className={`font-mono font-bold text-sm block ${
                      item.direction === 'inflow' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {item.direction === 'inflow' ? '+' : '-'}{formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {item.paymentMethod === 'cash' ? 'نقدي 💵' : item.paymentMethod === 'card' ? 'شبكة 💳' : 'بنكي 🏦'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. Sub-Tab 2: UNIFIED FINANCIAL LEDGER TABLE             */}
      {/* ======================================================== */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في السندات، البيان، الاسم..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white cursor-pointer"
              >
                <option value="all">كل أنواع الحركات المالية</option>
                <option value="inflow">جميع المقبوضات والوارد ➕</option>
                <option value="outflow">جميع المدفوعات والصادر ➖</option>
                <option value="sale">فواتير مبيعات فقط</option>
                <option value="expense">سندات صرف مصروفات</option>
                <option value="customer_payment">مقبوضات ديون عملاء</option>
                <option value="supplier_payment">سداد موردين</option>
                <option value="deposit">إيداعات الصندوق</option>
                <option value="withdrawal">مسحوبات الصندوق</option>
                <option value="refund">مرتجعات مبيعات</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white cursor-pointer"
              >
                <option value="all">جميع طرق الدفع</option>
                <option value="cash">نقداً (كاش الدرج) 💵</option>
                <option value="card">شبكة مدى / بطاقات 💳</option>
                <option value="bank_transfer">تحويل بنكي مباشر 🏦</option>
              </select>
            </div>

            {/* Export & Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>تصدير CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintReportModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-teal-700" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم السند / الفاتورة</th>
                  <th className="p-3">النوع والاتجاه</th>
                  <th className="p-3">البيان والتفاصيل</th>
                  <th className="p-3">الجهة / المسؤول</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedgerItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد حركات مالية مطابقة للفلاتر المحددة
                    </td>
                  </tr>
                ) : (
                  filteredLedgerItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {item.referenceNumber}
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.direction === 'inflow'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {item.direction === 'inflow' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{item.direction === 'inflow' ? 'وارد (قبض)' : 'صادر (صرف)'}</span>
                        </span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <p className="font-bold text-slate-800 truncate">{item.title}</p>
                        {item.category && (
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100 font-medium">
                            {item.category}
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-medium text-slate-700">
                        {item.partyName || item.recordedBy}
                      </td>

                      <td className="p-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {item.paymentMethod === 'cash'
                            ? '💵 نقدي'
                            : item.paymentMethod === 'card'
                            ? '💳 شبكة'
                            : '🏦 تحويل بنكي'}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-slate-500">
                        {item.date}
                      </td>

                      <td className="p-3 font-mono font-black text-sm">
                        <span className={item.direction === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}>
                          {item.direction === 'inflow' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {item.sourceType === 'expense' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(item.sourceId, item.title)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف سند المصروف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(item.sourceType === 'deposit' || item.sourceType === 'withdrawal') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCashTransaction(item.sourceId, item.title)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="إلغاء وحذف حركة الصندوق"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 6. Sub-Tab 3: EXPENSES & VOUCHERS                        */}
      {/* ======================================================== */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">سندات صرف المصروفات اليومية والتشغيلية</h3>
              <p className="text-xs text-slate-500">
                تسجيل ومتابعة مصاريف الإيجار، الكهرباء، المرتبات، والصيانة
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل مصروف جديد</span>
            </button>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">بيان المصروف</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">المسؤول / الصيدلي</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لم يتم تسجيل أي سندات مصروفات حتى الآن
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-800">
                        {exp.title}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-100 font-medium text-[11px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-600 text-sm">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {exp.paymentMethod === 'cash' ? 'نقدي (الدرج)' : exp.paymentMethod === 'card' ? 'شبكة' : 'تحويل بنكي'}
                      </td>
                      <td className="p-3 text-slate-700">
                        {exp.paidBy || 'المسؤول'}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {exp.date}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 7. Sub-Tab 4: RECEIPTS & DEBT COLLECTIONS                */}
      {/* ======================================================== */}
      {activeSubTab === 'receipts' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">سندات قبض وتحصيل ديون العملاء</h3>
              <p className="text-xs text-slate-500">
                استعراض المقبوضات النقدية والبنكية التي تم تحصيلها لحسابات الآجل
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إدارة العملاء والديون</span>
            </button>
          </div>

          {/* Receipts Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">اسم العميل</th>
                  <th className="p-3">المبلغ المقبوض</th>
                  <th className="p-3">طريقة القبض</th>
                  <th className="p-3">المسؤول / الصيدلي</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لم يتم تسجيل أي سندات قبض ديون حتى الآن
                    </td>
                  </tr>
                ) : (
                  customerPayments.map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-800">
                        {cp.customerName}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 text-sm">
                        +{formatCurrency(cp.amount)}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {cp.paymentMethod === 'cash' ? '💵 نقدي' : cp.paymentMethod === 'card' ? '💳 شبكة' : '🏦 تحويل بنكي'}
                      </td>
                      <td className="p-3 text-slate-700">
                        {cp.recordedBy || 'المسؤول'}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {cp.date}
                      </td>
                      <td className="p-3 text-slate-500">
                        {cp.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 8. Sub-Tab 5: DRAWER RECONCILIATIONS & AUDITS            */}
      {/* ======================================================== */}
      {activeSubTab === 'reconciliations' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">سجل جرد وتسويات الصندوق وإغلاق الورديات</h3>
              <p className="text-xs text-slate-500">
                أرشيف مطابقة النقدية الفعلية مع رصيد النظام وتوثيق الفوارق والعجز أو الفائض
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsReconciliationModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Scale className="w-4 h-4 text-teal-400" />
              <span>إجراء جرد وتقفيل جديد</span>
            </button>
          </div>

          {/* Reconciliations Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم التسوية</th>
                  <th className="p-3">تاريخ الوردية</th>
                  <th className="p-3">المسؤول / الكاشير</th>
                  <th className="p-3">المتوقع بالنظام</th>
                  <th className="p-3">المعدود فعلياً</th>
                  <th className="p-3">الفارق</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">ملاحظات</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لم يتم تسجيل أي عمليات جرد أو تقفيل وردية حتى الآن
                    </td>
                  </tr>
                ) : (
                  reconciliations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {rec.reconciliationNumber || rec.id}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {rec.shiftDate}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {rec.cashierName}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {formatCurrency(rec.expectedCash)}
                      </td>
                      <td className="p-3 font-mono font-bold text-teal-700">
                        {formatCurrency(rec.countedCash)}
                      </td>
                      <td className={`p-3 font-mono font-bold ${
                        rec.difference === 0 ? 'text-emerald-600' : rec.difference > 0 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {rec.difference > 0 ? `+${formatCurrency(rec.difference)}` : formatCurrency(rec.difference)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'balanced'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : rec.status === 'surplus'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {rec.status === 'balanced' ? 'مطابق تماماً 🟢' : rec.status === 'surplus' ? 'فائض بالدرج 🟡' : 'عجز بالدرج 🔴'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">
                        {rec.notes || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف سجل التسوية؟')) {
                              db.deleteShiftReconciliation(rec.id);
                              showToast('تم حذف سجل التسوية بنجاح', 'info');
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* 1. Add Expense Modal */}
      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSaved={loadData}
        />
      )}

      {/* 2. Cash Deposit / Withdrawal Modal */}
      {isDepositWithdrawModalOpen && (
        <CashDepositWithdrawModal
          isOpen={isDepositWithdrawModalOpen}
          onClose={() => setIsDepositWithdrawModalOpen(false)}
          defaultType={depositWithdrawType}
          onSuccess={loadData}
        />
      )}

      {/* 3. Shift Drawer Reconciliation Modal */}
      {isReconciliationModalOpen && (
        <ShiftReconciliationModal
          isOpen={isReconciliationModalOpen}
          onClose={() => setIsReconciliationModalOpen(false)}
          expectedCashAmount={cashInDrawer}
          onSuccess={loadData}
        />
      )}

      {/* 4. Printable Cashbox Report Modal */}
      {isPrintReportModalOpen && (
        <PrintCashboxReportModal
          isOpen={isPrintReportModalOpen}
          onClose={() => setIsPrintReportModalOpen(false)}
          reportData={{
            title: 'تقرير حركة الصندوق والخزينة',
            date: dateRangeFilter === 'today' ? todayStr : `${dateRangeFilter} - ${todayStr}`,
            cashInDrawer,
            posCardTotal: rangeMetrics.posCardTotal,
            bankTransferTotal: rangeMetrics.bankTransferTotal,
            totalInflows: rangeMetrics.totalInflows,
            totalOutflows: rangeMetrics.totalOutflows,
            netCashFlow: rangeMetrics.netCashFlow,
            salesCash: rangeMetrics.salesCash,
            customerDebtCash: rangeMetrics.customerDebtCash,
            cashDeposits: rangeMetrics.cashDeposits,
            expensesCash: rangeMetrics.expensesCash,
            supplierPaymentsCash: rangeMetrics.supplierPaymentsCash,
            cashWithdrawals: rangeMetrics.cashWithdrawals,
            refundsCash: rangeMetrics.refundsCash,
            transactionsCount: rangeMetrics.transactionsCount,
          }}
        />
      )}

    </div>
  );
};
