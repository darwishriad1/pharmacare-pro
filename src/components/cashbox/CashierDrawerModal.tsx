import React, { useState, useEffect, useMemo } from 'react';
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
  Coins,
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  User,
  CreditCard,
  Receipt,
  Minus,
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  History,
  Check,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../../database/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { SaleInvoice, SaleReturn, Expense, CustomerPayment, ShiftReconciliation } from '../../types';
import { ExpenseModal } from '../expenses/ExpenseModal';

interface CashierDrawerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isViewMode?: boolean;
}

const COMMON_DENOMINATIONS = [
  { value: 1000, label: '1,000' },
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
  { value: 5, label: '5' },
  { value: 1, label: '1' },
];

export const CashierDrawerModal: React.FC<CashierDrawerModalProps> = ({
  isOpen = true,
  onClose,
  isViewMode = false,
}) => {
  const { currentUser } = useAuthStore();
  const { formatCurrency, showToast, settings, setActiveTab } = useSettingsStore();

  const [activeSubTab, setActiveSubTab] = useState<'reconciliation' | 'history' | 'movements'>('reconciliation');
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [pastReconciliations, setPastReconciliations] = useState<ShiftReconciliation[]>([]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [useDenominations, setUseDenominations] = useState(true);
  const [openingFloat, setOpeningFloat] = useState<string>('0');
  const [manualCountedCash, setManualCountedCash] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);

  const [counts, setCounts] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  const loadData = () => {
    setSales(db.getSales());
    setReturns(db.getReturns());
    setExpenses(db.getExpenses());
    setCustomerPayments(db.getCustomerPayments());
    setPastReconciliations(db.getShiftReconciliations());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Real-time calculations for selected shift date
  const metrics = useMemo(() => {
    const targetDate = shiftDate;

    // Filter sales today
    const salesToday = sales.filter((s) => s.date === targetDate && s.status !== 'cancelled');

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let creditSales = 0;
    let transferSales = 0;

    salesToday.forEach((s) => {
      totalSales += s.grandTotal;
      if (s.paymentMethod === 'cash') {
        cashSales += s.paidAmount || s.grandTotal;
      } else if (s.paymentMethod === 'card') {
        cardSales += s.paidAmount || s.grandTotal;
      } else if (s.paymentMethod === 'credit') {
        creditSales += s.grandTotal;
      } else if (s.paymentMethod === 'mixed') {
        cashSales += s.cashAmount || 0;
        cardSales += s.cardAmount || 0;
      } else {
        cashSales += s.cashAmount || 0;
        cardSales += s.cardAmount || 0;
      }
    });

    // Returns on target date
    const returnsToday = returns.filter(
      (r) => r.date === targetDate || r.createdAt?.startsWith(targetDate)
    );
    const cashRefunds = returnsToday.reduce((sum, r) => {
      return r.refundMethod === 'cash' ? sum + r.totalRefund : sum;
    }, 0);

    // Expenses on target date
    const expensesToday = expenses.filter((e) => e.date === targetDate);
    const cashExpenses = expensesToday.reduce((sum, e) => {
      return e.paymentMethod === 'cash' ? sum + e.amount : sum;
    }, 0);

    // Customer payments received on target date
    const customerPaymentsToday = customerPayments.filter((cp) => cp.date === targetDate);
    const cashDebtReceipts = customerPaymentsToday.reduce((sum, cp) => {
      return cp.paymentMethod === 'cash' ? sum + cp.amount : sum;
    }, 0);

    const openingFloatNum = parseFloat(openingFloat) || 0;

    // Net expected cash in drawer right now
    const expectedCashInDrawer =
      openingFloatNum + cashSales + cashDebtReceipts - cashExpenses - cashRefunds;

    return {
      salesCount: salesToday.length,
      totalSales,
      cashSales,
      cardSales,
      creditSales,
      transferSales,
      cashRefunds,
      cashExpenses,
      cashDebtReceipts,
      openingFloat: openingFloatNum,
      expectedCashInDrawer: Math.max(0, expectedCashInDrawer),
      expensesToday,
      returnsToday,
      customerPaymentsToday,
      salesToday,
    };
  }, [sales, returns, expenses, customerPayments, shiftDate, openingFloat]);

  // Denominations Total
  const countedFromDenominations = COMMON_DENOMINATIONS.reduce((sum, denom) => {
    const qty = counts[denom.value] || 0;
    return sum + denom.value * qty;
  }, 0);

  const totalCounted = useDenominations
    ? countedFromDenominations
    : parseFloat(manualCountedCash) || 0;

  const difference = totalCounted - metrics.expectedCashInDrawer;
  const status: ShiftReconciliation['status'] =
    Math.abs(difference) < 0.01 ? 'balanced' : difference > 0 ? 'surplus' : 'deficit';

  if (!isOpen && !isViewMode) return null;

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
      1: 0,
    });
    setManualCountedCash('');
  };

  const handleSaveShift = (andPrint = false) => {
    if (totalCounted < 0) {
      showToast('يرجى التحقق من المبلغ المحسوب', 'warning');
      return;
    }

    const savedRec = db.saveShiftReconciliation({
      shiftDate,
      cashierName: currentUser?.name || 'الكاشير',
      openingBalance: metrics.openingFloat,
      expectedCash: metrics.expectedCashInDrawer,
      countedCash: totalCounted,
      difference,
      status,
      denominations: useDenominations ? (counts as any) : undefined,
      notes: notes.trim() || undefined,
    });

    db.logAudit(
      'جرد وتقفيل درج الكاشير',
      'pos',
      `تم جرد درج الكاشير (${currentUser?.name}) لمبيعات اليوم: المتوقع ${metrics.expectedCashInDrawer}، الفعلي ${totalCounted}، الحالة: ${status}`,
      currentUser?.id,
      currentUser?.name
    );

    showToast(`تم حفظ تقفيل ومطابقة الدرج (${savedRec.reconciliationNumber}) بنجاح`, 'success');

    if (andPrint) {
      setTimeout(() => {
        window.print();
      }, 200);
    }

    if (onClose) {
      onClose();
    } else {
      setActiveSubTab('history');
    }
  };

  const handlePrintDrawerReport = () => {
    window.print();
  };

  // Content of the Drawer
  const renderContent = () => (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-100/90 text-slate-800 pb-12">
      
      {/* ======================================================== */}
      {/* 1. Header Toolbar & Quick Actions                        */}
      {/* ======================================================== */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
              <Wallet className="w-7 h-7 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  درج الكاشير والمطابقة اليومية
                </h1>
                <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>الكاشير: {currentUser?.name || 'المستخدم الحالي'}</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {settings.branchName || 'الفرع الرئيسي'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                مطابقة مبيعات اليوم الفعلية، احتساب النقدية في الدرج، كشف العجز أو الفائض، وإصدار سندات المصروفات
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Expense Trigger */}
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md border border-rose-500"
              title="تسجيل سند صرف لمصروف جديد من الدرج (كهرباء، نثريات، مستلزمات)"
            >
              <Plus className="w-4 h-4" />
              <span>+ سند مصروفات</span>
            </button>

            {/* Print Drawer Report */}
            <button
              type="button"
              onClick={handlePrintDrawerReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              title="طباعة تقرير جرد الدرج والوردية"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>طباعة الجرد</span>
            </button>

            {/* Return to POS */}
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                else setActiveTab('pos');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-md"
              title="العودة لشاشة البيع والفواتير"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>شاشة البيع (POS)</span>
            </button>

            {onClose && !isViewMode && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

        </div>

        {/* Navigation Sub-Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('reconciliation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'reconciliation'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>مطابقة وجرد وردية اليوم</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('movements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'movements'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>كشف حركات نقدية اليوم ({metrics.salesToday.length + metrics.expensesToday.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل تسويات وجرد الورديات السابقة ({pastReconciliations.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Main Tab Body Content                                 */}
      {/* ======================================================== */}
      <div className="max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        
        {/* SUBTAB 1: RECONCILIATION */}
        {activeSubTab === 'reconciliation' && (
          <>
            {/* Shift Setup Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>تاريخ الوردية / المبيعات:</span>
                </label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>العهدة الافتتاحية لبداية الوردية ({settings.currencySymbol}):</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>الكاشير المسؤول:</span>
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 truncate">
                  👤 {currentUser?.name || 'الكاشير الحالي'} ({currentUser?.role === 'admin' ? 'مدير' : 'كاشير'})
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* Section A: Today's Sales & Cash Breakdown Cards          */}
            {/* ======================================================== */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-teal-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    ملخص مبيعات اليوم ({metrics.salesCount} فاتورة مبيعات)
                  </h2>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  إجمالي مبيعات اليوم:{' '}
                  <span className="font-mono font-black text-teal-800 text-base">
                    {formatCurrency(metrics.totalSales)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* 1. Cash Sales */}
                <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200">
                  <span className="text-[11px] text-emerald-900 font-bold block">💵 مبيعات نقدية (كاش)</span>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-700 mt-1 block">
                    {formatCurrency(metrics.cashSales)}
                  </span>
                  <span className="text-[10px] text-emerald-600">نقدية دخلت الدرج</span>
                </div>

                {/* 2. POS Card Sales */}
                <div className="p-3.5 rounded-xl bg-sky-50/90 border border-sky-200">
                  <span className="text-[11px] text-sky-900 font-bold block">💳 شبكة وبطاقات (POS)</span>
                  <span className="text-base sm:text-lg font-black font-mono text-sky-700 mt-1 block">
                    {formatCurrency(metrics.cardSales)}
                  </span>
                  <span className="text-[10px] text-sky-600">مدفوعات إلكترونية</span>
                </div>

                {/* 3. Credit Sales */}
                <div className="p-3.5 rounded-xl bg-purple-50/90 border border-purple-200">
                  <span className="text-[11px] text-purple-900 font-bold block">📝 مبيعات ديون (آجل)</span>
                  <span className="text-base sm:text-lg font-black font-mono text-purple-700 mt-1 block">
                    {formatCurrency(metrics.creditSales)}
                  </span>
                  <span className="text-[10px] text-purple-600">على حساب العملاء</span>
                </div>

                {/* 4. Cash Expenses & Refunds Deducted */}
                <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-rose-900 font-bold">➖ مصروفات ومرتجعات</span>
                  </div>
                  <span className="text-base sm:text-lg font-black font-mono text-rose-700 mt-1 block">
                    {formatCurrency(metrics.cashExpenses + metrics.cashRefunds)}
                  </span>
                  <span className="text-[10px] text-rose-600">خصمت من نقدية الدرج</span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* Section B: Expected in Drawer vs Actual & Variance Match */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* 1. Expected in Drawer */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white p-5 rounded-2xl border border-teal-800/40 shadow-md flex flex-col justify-between">
                <div>
                  <span className="text-xs text-teal-300 font-bold block flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-teal-400" />
                    <span>المبلغ المطلوب بالدرج (Expected Cash)</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-2 block">
                    {formatCurrency(metrics.expectedCashInDrawer)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-3 pt-3 border-t border-slate-800 leading-relaxed font-mono">
                  العهدة ({formatCurrency(metrics.openingFloat)}) + الكاش ({formatCurrency(metrics.cashSales)}) + المقبوضات ({formatCurrency(metrics.cashDebtReceipts)}) - المصروفات ({formatCurrency(metrics.cashExpenses)}) - المرتجع ({formatCurrency(metrics.cashRefunds)})
                </div>
              </div>

              {/* 2. Counted Cash by Cashier */}
              <div className="bg-white border-2 border-teal-300 p-5 rounded-2xl shadow-md flex flex-col justify-between">
                <div>
                  <span className="text-xs text-teal-900 font-bold block flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-teal-600" />
                    <span>العد الفعلي للدرج (Counted Cash)</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-teal-900 mt-2 block">
                    {formatCurrency(totalCounted)}
                  </span>
                </div>
                <div className="text-[11px] text-teal-800 mt-3 pt-3 border-t border-teal-100 font-bold">
                  المبلغ الإجمالي المحسوب باليد في الدرج الآن
                </div>
              </div>

              {/* 3. Instant Match Status Indicator */}
              <div
                className={`p-5 rounded-2xl border-2 shadow-md flex flex-col justify-between transition-all ${
                  status === 'balanced'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : status === 'surplus'
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-rose-50 border-rose-400 text-rose-950'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                    {status === 'balanced' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                    {status === 'surplus' && <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />}
                    {status === 'deficit' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                    <span>
                      {status === 'balanced'
                        ? 'المبلغ مطابق تماماً للمبيعات 🟢'
                        : status === 'surplus'
                        ? 'يوجد فائض في الدرج 🟡'
                        : 'يوجد عجز في الدرج 🔴'}
                    </span>
                  </div>

                  <span className="text-2xl sm:text-3xl font-black font-mono mt-2 block">
                    {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
                  </span>
                </div>

                <div className="text-[11px] mt-3 pt-3 border-t border-current/20 font-bold">
                  {status === 'balanced'
                    ? 'الدرج متوازن بنسبة 100% (لا يوجد أي فارق)'
                    : status === 'surplus'
                    ? 'مبلغ إضافي بالدرج زائد عن مبيعات النظام'
                    : 'مبلغ ناقص بالدرج عن مبيعات النظام المطلوب تسليمها'}
                </div>
              </div>

            </div>

            {/* ======================================================== */}
            {/* Section C: Cash Counting Calculator (Denominations)      */}
            {/* ======================================================== */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseDenominations(true)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                    className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير العداد</span>
                  </button>
                )}
              </div>

              {useDenominations ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {COMMON_DENOMINATIONS.map((denom) => {
                    const qty = counts[denom.value] || 0;
                    const subTotal = denom.value * qty;

                    return (
                      <div
                        key={denom.value}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between focus-within:border-teal-500 focus-within:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span className="font-mono text-teal-900 bg-teal-100/80 px-2.5 py-0.5 rounded-lg border border-teal-200 font-bold">
                            {denom.label} {settings.currencySymbol}
                          </span>
                          <span className="text-[10px] text-slate-400">فئة</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={qty === 0 ? '' : qty}
                            onChange={(e) => handleDenomChange(denom.value, e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-center font-mono font-bold text-sm text-slate-800 focus:outline-none focus:border-teal-500"
                          />
                          <span className="text-[11px] text-slate-500 font-bold shrink-0">ورقة</span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono font-bold text-slate-600">
                          <span className="text-[10px] text-slate-400 font-sans">المجموع:</span>
                          <span className="text-teal-700 font-black">
                            {subTotal.toLocaleString()} {settings.currencySymbol}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    أدخل إجمالي المبلغ النقدي الموجود في الدرج باليد ({settings.currencySymbol}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={manualCountedCash}
                    onChange={(e) => setManualCountedCash(e.target.value)}
                    placeholder="مثال: 15400"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xl font-mono font-black text-slate-800 focus:outline-none focus:border-teal-500 text-left"
                  />
                </div>
              )}

            </div>

            {/* ======================================================== */}
            {/* Section D: Today's Expense Vouchers Registered by Shift  */}
            {/* ======================================================== */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                    سندات المصروفات المسجلة اليوم بالصيدلية ({metrics.expensesToday.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ سند صرف مصروفات جديد</span>
                </button>
              </div>

              {metrics.expensesToday.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  لم يتم تسجيل أي سندات صرف مصروفات خلال وردية اليوم حتى الآن
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {metrics.expensesToday.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">{exp.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {exp.date} • بواسطة: {exp.paidBy || 'الكاشير'} {exp.notes ? `• ${exp.notes}` : ''}
                        </span>
                      </div>
                      <span className="font-mono font-black text-rose-600 text-xs">
                        -{formatCurrency(exp.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Submission Bar */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ملاحظات وتوضيح الوردية أو أسباب الفارق (إن وجد):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تم تسليم نقدية الدرج كاملة ومطابقة للكاشير المناوب للوردية المسائية..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  سيتم حفظ واعتماد تقرير الوردية برقم تسوية جديد في السجل وتوثيق العملية في سجل التدقيق.
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSaveShift(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-teal-700" />
                    <span>حفظ وطباعة السند</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveShift(false)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>اعتماد ومطابقة الدرج</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SUBTAB 2: MOVEMENTS LEDGER */}
        {activeSubTab === 'movements' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  كشف حركات النقدية والمبيعات لوردية اليوم ({shiftDate})
                </h3>
                <p className="text-xs text-slate-400">
                  سجل تفصيلي لكافة المبيعات، المصروفات، المقبوضات، والمرتجعات
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadData}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث</span>
                </button>
              </div>
            </div>

            {/* Combined Chronological Stream */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="py-3 px-3">النوع</th>
                    <th className="py-3 px-3">المرجع / الرقم</th>
                    <th className="py-3 px-3">البيان / العميل / الطرف</th>
                    <th className="py-3 px-3">طريقة الدفع</th>
                    <th className="py-3 px-3">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Sales */}
                  {metrics.salesToday.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          فاتورة مبيعات
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{s.invoiceNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{s.customerName || 'عميل نقدي'}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-600">
                          {s.paymentMethod === 'cash' ? '💵 نقداً' : s.paymentMethod === 'card' ? '💳 بطاقة/شبكة' : '📝 آجل'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-emerald-700">
                        +{formatCurrency(s.grandTotal)}
                      </td>
                    </tr>
                  ))}

                  {/* Expenses */}
                  {metrics.expensesToday.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                          سند صرف مصروف
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">EXP-{e.id.slice(-4)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{e.title} ({e.paidBy || 'الكاشير'})</td>
                      <td className="py-2.5 px-3 font-bold text-slate-600">💵 نقداً من الدرج</td>
                      <td className="py-2.5 px-3 font-mono font-black text-rose-600">
                        -{formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: RECONCILIATION HISTORY */}
        {activeSubTab === 'history' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  سجل تسويات وجرد الورديات السابقة
                </h3>
                <p className="text-xs text-slate-400">
                  أرشيف كامل لكافة جولات جرد ومطابقة الدرج وتقفيل الورديات
                </p>
              </div>
            </div>

            {pastReconciliations.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                لا توجد تسويات مسجلة حتى الآن
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                      <th className="py-3 px-3">رقم التسوية</th>
                      <th className="py-3 px-3">تاريخ الوردية</th>
                      <th className="py-3 px-3">الكاشير</th>
                      <th className="py-3 px-3">المتوقع بالدرج</th>
                      <th className="py-3 px-3">المعدود الفعلي</th>
                      <th className="py-3 px-3">الفارق</th>
                      <th className="py-3 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastReconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-teal-800">{rec.reconciliationNumber}</td>
                        <td className="py-3 px-3 font-bold text-slate-700">{rec.shiftDate}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">👤 {rec.cashierName}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{formatCurrency(rec.expectedCash)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{formatCurrency(rec.countedCash)}</td>
                        <td className="py-3 px-3 font-mono font-black">
                          {rec.difference === 0 ? (
                            <span className="text-emerald-600">0.00 (متطابق)</span>
                          ) : rec.difference > 0 ? (
                            <span className="text-amber-600">+{formatCurrency(rec.difference)}</span>
                          ) : (
                            <span className="text-rose-600">{formatCurrency(rec.difference)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              rec.status === 'balanced'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'surplus'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status === 'balanced'
                              ? 'متطابق'
                              : rec.status === 'surplus'
                              ? 'فائض بالدرج'
                              : 'عجز بالدرج'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Embedded Expense Modal for Quick Expense Entry */}
      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSaved={() => {
            loadData();
            showToast('تم تسجيل سند المصروف بنجاح وخصمه من نقدية الدرج', 'success');
          }}
        />
      )}
    </div>
  );

  // If rendered as a standalone modal popup (e.g. from hotkeys or popup call)
  if (!isViewMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex flex-col select-none overflow-hidden animate-in fade-in duration-150">
        {renderContent()}
      </div>
    );
  }

  // Rendered as a full screen native section in App.tsx
  return renderContent();
};
