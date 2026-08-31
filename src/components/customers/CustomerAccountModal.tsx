import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  Check,
  Calendar,
  Phone,
  Printer,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Receipt,
  Clock,
  Trash2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Pill,
  Wallet,
  Copy,
  CheckCheck,
  MessageCircle,
  Share2,
  Percent,
  TrendingUp,
  CreditCard,
  Building,
  Sparkles,
  ExternalLink,
  Info,
  CalendarDays
} from 'lucide-react';
import { Customer, CustomerPayment, SaleInvoice, SaleReturn } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';
import { getCustomerColor } from '../../utils/customerColors';

interface CustomerAccountModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export interface StatementItem {
  id: string;
  date: string;
  time?: string;
  timestamp: number;
  type: 'payment' | 'invoice' | 'return';
  typeLabel: string;
  ref: string;
  description: string;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  debit: number;
  credit: number;
  balance: number;
  rawItem: CustomerPayment | SaleInvoice | SaleReturn;
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSaved,
}) => {
  const { settings, formatCurrency } = useSettingsStore();
  const { currentUser } = useAuthStore();

  // Active Customer state
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(customer);

  // Active Tool Drawer Tab: 'none' | 'pay' | 'discount' | 'whatsapp'
  const [activeTool, setActiveTool] = useState<'none' | 'pay' | 'discount' | 'whatsapp'>('none');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('سداد دفعة من الحساب الآجل');
  const [printAfterPay, setPrintAfterPay] = useState(true);

  // Settlement Discount State
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('خصم تسوية حساب معتمد');

  // WhatsApp reminder message preview state
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'payments' | 'invoices' | 'returns'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Expanded Rows State for inline accordion item breakdown
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (customer) {
      const refreshed = db.getCustomers().find((c) => c.id === customer.id);
      setCurrentCustomer(refreshed || customer);
    }
  }, [customer, isOpen]);

  const refreshCustomer = () => {
    if (customer) {
      const refreshed = db.getCustomers().find((c) => c.id === customer.id);
      setCurrentCustomer(refreshed || null);
    }
  };

  // Date Preset handlers
  const applyDatePreset = (preset: 'all' | 'today' | 'week' | 'month' | 'quarter') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      setStartDate(monthAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'quarter') {
      const quarterAgo = new Date();
      quarterAgo.setDate(now.getDate() - 90);
      setStartDate(quarterAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Toggle Row Expansion
  const toggleRowExpansion = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Expand All / Collapse All
  const toggleAllRows = (expand: boolean) => {
    if (!expand) {
      setExpandedRows({});
      return;
    }
    const newMap: Record<string, boolean> = {};
    statementItems.forEach((item) => {
      newMap[`${item.type}-${item.id}`] = true;
    });
    setExpandedRows(newMap);
  };

  // Copy phone number
  const copyPhoneNumber = () => {
    if (currentCustomer?.phone) {
      navigator.clipboard.writeText(currentCustomer.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Build Full Account Statement Ledger
  const statementItems = useMemo(() => {
    if (!currentCustomer) return [];

    const normName = currentCustomer.name.trim().toLowerCase();
    const sales = db.getSales().filter(
      (s) => s.customerId === currentCustomer.id || (s.customerName && s.customerName.trim().toLowerCase() === normName)
    );
    const payments = db.getCustomerPayments().filter(
      (p) => p.customerId === currentCustomer.id || (p.customerName && p.customerName.trim().toLowerCase() === normName)
    );
    const returns = db.getReturns().filter(
      (r) => r.customerId === currentCustomer.id || (r.customerName && r.customerName.trim().toLowerCase() === normName)
    );

    const rawList: Array<{
      id: string;
      date: string;
      time?: string;
      timestamp: number;
      type: 'payment' | 'invoice' | 'return';
      typeLabel: string;
      ref: string;
      description: string;
      paymentMethod?: string;
      paymentMethodLabel?: string;
      debit: number;
      credit: number;
      rawItem: CustomerPayment | SaleInvoice | SaleReturn;
    }> = [];

    // 1. Sales Invoices
    sales.forEach((s) => {
      const isCredit = s.paymentMethod === 'credit';
      const isPartialCash = s.paymentMethod === 'cash' && typeof s.paidAmount === 'number' && s.paidAmount < s.grandTotal;
      const timeStr = s.time || '12:00';
      const ts = new Date(`${s.date}T${timeStr}`).getTime() || new Date(s.date).getTime();

      let debit = s.grandTotal;
      let credit = 0;

      if (isCredit) {
        credit = Math.max(0, s.paidAmount || 0);
      } else if (isPartialCash) {
        credit = Math.max(0, s.paidAmount || 0);
      } else {
        credit = s.grandTotal;
      }

      const hasDownPayment = isCredit && (s.paidAmount || 0) > 0;
      const remainingDebt = isCredit ? s.grandTotal - (s.paidAmount || 0) : isPartialCash ? s.grandTotal - (s.paidAmount || 0) : 0;

      rawList.push({
        id: s.id,
        date: s.date,
        time: s.time,
        timestamp: ts,
        type: 'invoice',
        typeLabel: isCredit
          ? hasDownPayment
            ? 'فاتورة بيع آجل (مع دفعة مقدمة)'
            : 'فاتورة مبيعات آجلة'
          : isPartialCash
          ? 'فاتورة مبيعات (باقي آجل)'
          : 'فاتورة مبيعات نقدية',
        ref: `#${s.invoiceNumber}`,
        description: `شراء ${s.items.length} أصناف دوائية (${s.items.map((i) => i.product.name).slice(0, 2).join('، ')}${s.items.length > 2 ? '...' : ''})${
          hasDownPayment
            ? ` - مدفوع مقدماً: ${(s.paidAmount || 0).toLocaleString('ar-YE')} ر.ي (المسجل كدين: ${remainingDebt.toLocaleString('ar-YE')} ر.ي)`
            : isCredit
            ? ` - آجل بالكامل (${s.grandTotal.toLocaleString('ar-YE')} ر.ي)`
            : ''
        }`,
        paymentMethod: s.paymentMethod,
        paymentMethodLabel: isCredit ? (hasDownPayment ? 'آجل جزئي' : 'آجل بالكامل') : s.paymentMethod === 'card' ? 'شبكة' : 'نقداً',
        debit,
        credit,
        rawItem: s,
      });
    });

    // 2. Customer Payments Received (سندات القبض وسداد الديون والتسويات)
    payments.forEach((p) => {
      const ts = new Date(p.createdAt || p.date).getTime() || new Date(p.date).getTime();
      const isSettlement = p.notes?.includes('خصم تسوية') || p.notes?.includes('إعفاء');
      const methodLabel = isSettlement
        ? 'خصم تسوية معتمد'
        : p.paymentMethod === 'card'
        ? 'شبكة / بطاقة'
        : p.paymentMethod === 'bank_transfer'
        ? 'تحويل بنكي'
        : 'نقداً (الخزينة)';

      rawList.push({
        id: p.id,
        date: p.date,
        time: new Date(p.createdAt || p.date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        timestamp: ts,
        type: 'payment',
        typeLabel: isSettlement ? 'خصم تسوية حساب' : 'سند قبض وسداد دين',
        ref: `#REC-${p.id.slice(-5).toUpperCase()}`,
        description: p.notes || 'سداد دفعة من الحساب الآجل',
        paymentMethod: p.paymentMethod,
        paymentMethodLabel: methodLabel,
        debit: 0,
        credit: p.amount,
        rawItem: p,
      });
    });

    // 3. Sales Returns (مرتجعات المبيعات)
    returns.forEach((r) => {
      const ts = new Date(r.createdAt || r.date).getTime() || new Date(r.date).getTime();
      const isCreditReversal = r.refundMethod === 'credit_reversal';

      rawList.push({
        id: r.id,
        date: r.date,
        time: r.time,
        timestamp: ts,
        type: 'return',
        typeLabel: 'سند مرتجع مبيعات',
        ref: `#${r.returnNumber}`,
        description: `إرجاع أصناف لفاتورة (${r.originalInvoiceNumber}) - ${r.reason}`,
        paymentMethod: r.refundMethod,
        paymentMethodLabel: isCreditReversal ? 'خصم من الدين' : 'استرداد نقدي',
        debit: 0,
        credit: isCreditReversal ? r.totalRefund : 0,
        rawItem: r,
      });
    });

    // Sort chronologically ascending to calculate running balance accurately
    rawList.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    const computed: StatementItem[] = rawList.map((item) => {
      runningBalance = runningBalance + item.debit - item.credit;
      return {
        ...item,
        balance: Math.max(0, runningBalance),
      };
    });

    return computed;
  }, [currentCustomer, isOpen]);

  // Filtered & Sorted items for display
  const filteredItems = useMemo(() => {
    return statementItems
      .filter((item) => {
        // Type filter
        if (filterType === 'payments' && item.type !== 'payment') return false;
        if (filterType === 'invoices' && item.type !== 'invoice') return false;
        if (filterType === 'returns' && item.type !== 'return') return false;

        // Date range filter
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchRef = item.ref.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchType = item.typeLabel.toLowerCase().includes(q);
          const matchMethod = (item.paymentMethodLabel || '').toLowerCase().includes(q);
          if (!matchRef && !matchDesc && !matchType && !matchMethod) return false;
        }

        return true;
      })
      .sort((a, b) => (sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp));
  }, [statementItems, filterType, startDate, endDate, searchQuery, sortOrder]);

  // Aggregate totals
  const totalDebit = useMemo(() => statementItems.reduce((acc, item) => acc + item.debit, 0), [statementItems]);
  const totalCredit = useMemo(() => statementItems.reduce((acc, item) => acc + item.credit, 0), [statementItems]);
  const totalPaymentsReceived = useMemo(
    () => statementItems.filter((i) => i.type === 'payment').reduce((acc, item) => acc + item.credit, 0),
    [statementItems]
  );
  const paymentCount = useMemo(() => statementItems.filter((i) => i.type === 'payment').length, [statementItems]);
  const invoiceCount = useMemo(() => statementItems.filter((i) => i.type === 'invoice').length, [statementItems]);

  // Credit Limit Calculations
  const creditLimit = currentCustomer?.maxCreditLimit || 0;
  const currentDebt = currentCustomer?.currentBalance || 0;
  const creditUsedPercent = creditLimit > 0 ? Math.min(100, Math.round((currentDebt / creditLimit) * 100)) : 0;
  const isCreditOverLimit = creditLimit > 0 && currentDebt > creditLimit;
  const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - currentDebt) : 0;

  // Collection Compliance Rate (%)
  const collectionRate = totalDebit > 0 ? Math.min(100, Math.round((totalCredit / totalDebit) * 100)) : 100;

  // Debt Aging Analysis (0-30 days, 31-60 days, >60 days)
  const debtAging = useMemo(() => {
    if (!currentCustomer || currentDebt <= 0) return { current: 0, medium: 0, overdue: 0 };
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;

    let aging = { current: 0, medium: 0, overdue: 0 };
    const creditSales = db.getSales().filter((s) => s.customerId === currentCustomer.id && s.paymentMethod === 'credit');

    let remainingDebtToAllocate = currentDebt;

    // Process from newest to oldest
    creditSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const s of creditSales) {
      if (remainingDebtToAllocate <= 0) break;
      const invoiceDate = new Date(s.date).getTime();
      const diffDays = Math.floor((now - invoiceDate) / dayMs);
      const invoiceUnpaid = Math.min(remainingDebtToAllocate, s.grandTotal - (s.paidAmount || 0));

      if (diffDays <= 30) {
        aging.current += invoiceUnpaid;
      } else if (diffDays <= 60) {
        aging.medium += invoiceUnpaid;
      } else {
        aging.overdue += invoiceUnpaid;
      }

      remainingDebtToAllocate -= invoiceUnpaid;
    }

    if (remainingDebtToAllocate > 0) {
      aging.overdue += remainingDebtToAllocate;
    }

    return aging;
  }, [currentCustomer, currentDebt]);

  // WhatsApp Message Generator
  const whatsappMessage = useMemo(() => {
    if (!currentCustomer) return '';
    const pharmacyName = settings.pharmacyName || 'الصيدلية';
    const debtStr = formatCurrency(currentDebt);
    return `السلام عليكم ورحمة الله وبركاته،\nالأخ الكريم / ${currentCustomer.name} المحترم،\n\nتحية طيبة من ${pharmacyName}،\nنود إحاطتكم علماً بأن رصيد حسابكم المستحق طرفنا هو: *${debtStr}*.\nشاكرين ومقدرين حسن تعاملكم الدائم معنا.\n\n${settings.phone ? `للاستفسار: ${settings.phone}` : ''}`;
  }, [currentCustomer, currentDebt, settings, formatCurrency]);

  const handleOpenWhatsApp = () => {
    if (!currentCustomer?.phone) return;
    const cleanPhone = currentCustomer.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 2000);
  };

  if (!isOpen || !currentCustomer) return null;

  // Handle Recording New Debt Payment
  const handlePayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('يرجى إدخال مبلغ سداد صحيح أكبر من الصفر');
      return;
    }

    if (amount > currentCustomer.currentBalance) {
      if (!confirm(`المبلغ المدخل (${formatCurrency(amount)}) أكبر من إجمالي الدين الحالي (${formatCurrency(currentCustomer.currentBalance)}). هل تريد المتابعة؟`)) {
        return;
      }
    }

    const recordedPayment = db.addCustomerPayment({
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      date: paymentDate,
      amount,
      paymentMethod,
      notes: paymentNote.trim() || 'سداد دفعة من الحساب الآجل',
      recordedBy: currentUser?.name || 'الكاشير',
    });

    if (printAfterPay) {
      printerService.printCustomerPaymentReceipt(
        recordedPayment,
        {
          ...currentCustomer,
          currentBalance: Math.max(0, currentCustomer.currentBalance - amount),
        },
        settings
      );
    }

    setPaymentAmount('');
    setActiveTool('none');
    refreshCustomer();
    onSaved();
  };

  // Handle Settlement Discount / Debt Waiver
  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('يرجى إدخال مبلغ خصم تسوية صحيح');
      return;
    }

    if (amount > currentCustomer.currentBalance) {
      alert(`مبلغ الخصم (${formatCurrency(amount)}) لا يمكن أن يتجاوز إجمالي الدين (${formatCurrency(currentCustomer.currentBalance)})`);
      return;
    }

    if (!confirm(`هل أنت متأكد من تسجيل خصم تسوية وإعفاء بمبلغ (${formatCurrency(amount)}) من حساب العميل (${currentCustomer.name})؟`)) {
      return;
    }

    db.addCustomerPayment({
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      date: new Date().toISOString().split('T')[0],
      amount,
      paymentMethod: 'bank_transfer',
      notes: `خصم تسوية حساب معتمد: ${discountReason.trim() || 'تسوية حساب'}`,
      recordedBy: currentUser?.name || 'المدير',
    });

    setDiscountAmount('');
    setActiveTool('none');
    refreshCustomer();
    onSaved();
  };

  // Handle Deleting a Payment Voucher
  const handleDeletePayment = (paymentId: string, amount: number) => {
    if (
      confirm(
        `هل أنت متأكد من إلغاء وحذف سند القبض بمبلغ (${formatCurrency(amount)})؟ سيتم إعادة المبلغ إلى مديونية العميل.`
      )
    ) {
      db.deleteCustomerPayment(paymentId);
      refreshCustomer();
      onSaved();
    }
  };

  // Print Account Statement A4
  const handlePrintStatement = () => {
    printerService.printCustomerAccountStatement(currentCustomer, statementItems, settings);
  };

  // Print Thermal Statement Slip
  const handlePrintThermalSlip = () => {
    printerService.printCustomerStatementThermal(currentCustomer, statementItems, settings);
  };

  // Export Statement to CSV
  const handleExportStatement = () => {
    excelService.exportCustomerStatementToCSV(currentCustomer, statementItems);
  };

  return (
    <div id="customer-account-modal" className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-1 sm:p-3 overflow-y-auto">
      <div className="bg-white border border-teal-100 w-full max-w-[96vw] xl:max-w-7xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto h-[95vh] max-h-[95vh] flex flex-col">
        
        {/* Top Header: Customer Profile & Action Hub */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-700 to-teal-600 px-5 py-3.5 border-b border-teal-800 text-white shrink-0 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            
            {/* Left: Customer Info & Status Pill */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border border-white/20 shadow-xs ${getCustomerColor(currentCustomer).avatarBg}`}
                >
                  {currentCustomer.name.trim().charAt(0) || 'ع'}
                </div>
                {currentDebt > 0 ? (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full ring-2 ring-teal-800" title="يوجد رصيد مدين مستحق" />
                ) : (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full ring-2 ring-teal-800" title="الحساب خالص ومسدد" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base sm:text-lg text-white leading-tight">
                    {currentCustomer.name}
                  </h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shadow-xs ${getCustomerColor(currentCustomer).badge}`}>
                    {getCustomerColor(currentCustomer).nameAr}
                  </span>
                  
                  {/* Status Badge */}
                  {currentDebt === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-100 border border-emerald-300/40">
                      <CheckCircle2 className="w-3 h-3" />
                      خالص (0 ر.ي)
                    </span>
                  ) : isCreditOverLimit ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/30 text-rose-100 border border-rose-300/50 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      تجاوز سقف الائتمان!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/25 text-amber-100 border border-amber-300/40">
                      <Clock className="w-3 h-3" />
                      رصيد آجل مستحق
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-teal-100 mt-0.5">
                  <button
                    onClick={copyPhoneNumber}
                    className="flex items-center gap-1 hover:text-white font-mono transition-colors cursor-pointer"
                    title="نسخ رقم الهاتف"
                  >
                    <Phone className="w-3 h-3 text-teal-200" />
                    <span>{currentCustomer.phone}</span>
                    {copiedPhone ? <CheckCheck className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-70" />}
                  </button>

                  {currentCustomer.address && (
                    <span className="flex items-center gap-1 text-teal-100/90 hidden sm:inline-flex">
                      <Building className="w-3 h-3 text-teal-200" />
                      {currentCustomer.address}
                    </span>
                  )}

                  {creditLimit > 0 && (
                    <span className="text-teal-100 font-mono font-medium">
                      سقف الائتمان: {formatCurrency(creditLimit)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              
              {/* Payment Drawer Toggle */}
              <button
                id="btn-toggle-pay-drawer"
                onClick={() => setActiveTool(activeTool === 'pay' ? 'none' : 'pay')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                  activeTool === 'pay'
                    ? 'bg-white text-teal-900 ring-2 ring-white/60'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>سداد دفعة</span>
              </button>

              {/* Settlement Discount Toggle */}
              {currentDebt > 0 && (
                <button
                  id="btn-toggle-discount-drawer"
                  onClick={() => setActiveTool(activeTool === 'discount' ? 'none' : 'discount')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTool === 'discount'
                      ? 'bg-amber-500 text-white ring-2 ring-amber-300/60'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  }`}
                  title="تسجيل خصم تسوية أو إعفاء من جزء من الدين"
                >
                  <Percent className="w-3.5 h-3.5 text-amber-200" />
                  <span className="hidden sm:inline">خصم تسوية</span>
                </button>
              )}

              {/* WhatsApp Reminder Toggle */}
              <button
                id="btn-toggle-whatsapp-drawer"
                onClick={() => setActiveTool(activeTool === 'whatsapp' ? 'none' : 'whatsapp')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTool === 'whatsapp'
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300/60'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                }`}
                title="إرسال كشف الحساب / تذكير بالرصيد عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden md:inline">واتساب</span>
              </button>

              {/* Print A4 */}
              <button
                id="btn-print-statement-a4"
                onClick={handlePrintStatement}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold transition-all cursor-pointer"
                title="طباعة كشف حساب رسمي A4"
              >
                <Printer className="w-3.5 h-3.5 text-teal-100" />
                <span className="hidden sm:inline">A4</span>
              </button>

              {/* Print Thermal Slip */}
              <button
                id="btn-print-statement-thermal"
                onClick={handlePrintThermalSlip}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold transition-all cursor-pointer"
                title="طباعة إيصال حراري مختصر (POS)"
              >
                <Receipt className="w-3.5 h-3.5 text-teal-100" />
                <span className="hidden sm:inline">إيصال</span>
              </button>

              {/* Export CSV */}
              <button
                id="btn-export-statement-csv"
                onClick={handleExportStatement}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs transition-all cursor-pointer"
                title="تصدير ملف Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>

              {/* Close Modal */}
              <button
                id="btn-close-statement-modal"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mr-1"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>

        {/* High-Density KPI Metrics Strip */}
        <div className="bg-slate-50/70 px-4 py-2.5 border-b border-teal-100 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            
            {/* 1. Net Outstanding Balance (الدين الحالي) */}
            <div className={`p-2.5 rounded-xl border shadow-2xs flex flex-col justify-between ${
              currentDebt > 0 
                ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>صافي الدين المستحق</span>
                <Wallet className="w-3.5 h-3.5 opacity-70" />
              </div>
              <div className={`text-base font-black font-mono mt-0.5 ${currentDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(currentDebt)}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {currentDebt > 0 ? 'مستحق على العميل' : 'حساب خالص ومسدد'}
              </div>
            </div>

            {/* 2. Total Collected Payments */}
            <div className="p-2.5 rounded-xl bg-white border border-teal-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>إجمالي المقبوضات</span>
                <ArrowDownLeft className="w-3.5 h-3.5 text-teal-600 opacity-80" />
              </div>
              <div className="text-base font-black font-mono text-teal-700 mt-0.5">
                {formatCurrency(totalPaymentsReceived)}
              </div>
              <div className="text-[10px] text-slate-500">
                {paymentCount} سندات قبض
              </div>
            </div>

            {/* 3. Total Invoiced Purchases */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>إجمالي المشتريات</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-teal-600 opacity-80" />
              </div>
              <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                {formatCurrency(currentCustomer.totalPurchases || totalDebit)}
              </div>
              <div className="text-[10px] text-slate-500">
                {invoiceCount} فاتورة مبيعات
              </div>
            </div>

            {/* 4. Collection Compliance Rate */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>نسبة التحصيل والالتزام</span>
                <TrendingUp className="w-3.5 h-3.5 text-teal-600 opacity-80" />
              </div>
              <div className="text-base font-black font-mono text-teal-800 mt-0.5">
                {collectionRate}%
              </div>
              <div className="text-[10px] text-slate-500">
                من إجمالي المسحوبات
              </div>
            </div>

            {/* 5. Credit Line Available */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>الائتمان المتاح</span>
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 opacity-80" />
              </div>
              <div className="text-base font-black font-mono text-slate-800 mt-0.5">
                {creditLimit > 0 ? formatCurrency(availableCredit) : 'مفتوح'}
              </div>
              <div className="text-[10px] text-slate-500">
                {creditLimit > 0 ? `مستهلك ${creditUsedPercent}%` : 'بدون سقف ائتماني'}
              </div>
            </div>

            {/* 6. Debt Aging Quick Analysis */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>أعمار الديون</span>
                <Clock className="w-3.5 h-3.5 text-amber-600 opacity-80" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono mt-1">
                <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" title="أقل من 30 يوم">
                  {formatCurrency(debtAging.current)}
                </span>
                {debtAging.overdue > 0 && (
                  <span className="px-1 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-bold" title="متأخر أكثر من 60 يوم">
                    ! {formatCurrency(debtAging.overdue)}
                  </span>
                )}
              </div>
              <div className="text-[9px] text-slate-500 truncate">
                {debtAging.overdue > 0 ? 'تنبيه: توجد ديون متأخرة' : 'جميع الديون حديثة'}
              </div>
            </div>

          </div>
        </div>

        {/* Expandable Utility Tool Panels (Payment / Settlement Discount / WhatsApp) */}
        {activeTool !== 'none' && (
          <div className="bg-slate-50 border-b border-teal-100 px-5 py-3.5 shrink-0 animate-in fade-in slide-in-from-top-2 duration-150">
            
            {/* Tool 1: Fast Debt Payment Voucher Form */}
            {activeTool === 'pay' && (
              <form onSubmit={handlePayDebt} className="space-y-3 bg-white p-4 rounded-xl border border-teal-200 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">تسجيل سند قبض وسداد دفعة من العميل</span>
                  </div>

                  {/* Quick percentage buttons */}
                  {currentDebt > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">سداد سريع:</span>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(currentDebt.toString())}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        كامل الدين ({formatCurrency(currentDebt)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(currentDebt / 2).toString())}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(currentDebt / 4).toString())}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        25%
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-bold">المبلغ المسدد *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="1"
                        required
                        autoFocus
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">
                        {settings.currencySymbol}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-bold">تاريخ القبض</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-bold">طريقة التحصيل</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'bank_transfer')}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-medium"
                    >
                      <option value="cash">💵 نقداً (الخزينة)</option>
                      <option value="card">💳 شبكة / مدى</option>
                      <option value="bank_transfer">🏦 تحويل بنكي / محفظة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-bold">البيان والملاحظات</label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="سداد دفعة..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs text-teal-800 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printAfterPay}
                      onChange={(e) => setPrintAfterPay(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span>طباعة سند قبض مالي رسمي فور الحفظ</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTool('none')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      تأكيد وحفظ سند القبض
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Tool 2: Settlement Discount / Debt Waiver Form */}
            {activeTool === 'discount' && (
              <form onSubmit={handleApplyDiscount} className="space-y-3 bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">تسجيل خصم تسوية / إعفاء من الدين</span>
                      <p className="text-[11px] text-slate-500">سيتم تخفيض رصيد العميل وتسجيل حركة محاسبية كخصم تسوية معتمد</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-bold">مبلغ الخصم أو الإعفاء *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="1"
                        max={currentDebt}
                        required
                        autoFocus
                        placeholder="0.00"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-amber-700 font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                      <span className="absolute left-3 top-2 text-xs text-amber-600 font-bold">
                        {settings.currencySymbol}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-bold">سبب وتفاصيل التسوية</label>
                    <input
                      type="text"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="مثال: خصم تسوية المتأخرات، إعفاء كسور الحساب..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTool('none')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    تطبيق وتثبيت الخصم
                  </button>
                </div>
              </form>
            )}

            {/* Tool 3: WhatsApp Notification Generator */}
            {activeTool === 'whatsapp' && (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">إرسال كشف الحساب وتذكير السداد عبر واتساب</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed">
                  {whatsappMessage}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-600">
                    رقم الهاتف المستهدف: <strong className="text-slate-900 font-mono font-bold">{currentCustomer.phone}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppText}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {whatsappCopied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{whatsappCopied ? 'تم النسخ' : 'نسخ النص'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح محادثة واتساب المباشرة</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Compact Filters Toolbar */}
        <div className="bg-white px-4 py-2.5 border-b border-slate-200 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Movement Type Filter Chips */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({statementItems.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('payments')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  filterType === 'payments'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-teal-600" />
                المقبوضات ({paymentCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('invoices')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  filterType === 'invoices'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-teal-600" />
                الفواتير ({invoiceCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('returns')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  filterType === 'returns'
                    ? 'bg-white text-rose-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                المرتجعات ({statementItems.filter((i) => i.type === 'return').length})
              </button>
            </div>

            {/* Date Presets & Search */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Date Presets */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['all', 'today', 'week', 'month', 'quarter'] as const).map((p) => {
                  const labels: Record<string, string> = {
                    all: 'كامل السجل',
                    today: 'اليوم',
                    week: '7 أيام',
                    month: 'هذا الشهر',
                    quarter: '3 أشهر',
                  };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyDatePreset(p)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        datePreset === p
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-40 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                <input
                  type="text"
                  placeholder="بحث برقم أو بيان..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-6 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="تغيير اتجاه الترتيب"
              >
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{sortOrder === 'desc' ? 'الأحدث' : 'الأقدم'}</span>
              </button>

              {/* Accordion Expand All */}
              <button
                type="button"
                onClick={() => toggleAllRows(Object.keys(expandedRows).length === 0)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                title="توسيع / طي كل التفاصيل"
              >
                {Object.keys(expandedRows).length > 0 ? 'طي التفاصيل' : 'توسيع التفاصيل'}
              </button>

            </div>

          </div>
        </div>

        {/* Ledger Statement Table Area (Scrollable with Sticky Header & Footer) */}
        <div className="flex-1 overflow-y-auto bg-white">
          <table className="w-full text-right text-xs">
            <thead className="bg-teal-50/80 text-teal-950 sticky top-0 z-10 border-b border-teal-100 text-[11px] font-bold select-none shadow-xs">
              <tr>
                <th className="p-3 text-center w-8"></th>
                <th className="p-3 text-center w-24">التاريخ والوقت</th>
                <th className="p-3 text-center w-24">المرجع</th>
                <th className="p-3 w-32">نوع الحركة</th>
                <th className="p-3">البيان والتفاصيل</th>
                <th className="p-3 text-left w-28">مدين (سحب)</th>
                <th className="p-3 text-left w-32 bg-teal-100/50 text-teal-950 border-x border-teal-200">
                  دائن (مسدد)
                </th>
                <th className="p-3 text-left w-28 bg-slate-100/70 text-slate-900">الرصيد التراكمي</th>
                <th className="p-3 text-center w-20">إجراءات</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-1.5 opacity-70" />
                    <p className="text-xs font-bold text-slate-500">لا توجد حركات مسجلة مطابقة للفلاتر الحالية</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isPayment = item.type === 'payment';
                  const isInvoice = item.type === 'invoice';
                  const isReturn = item.type === 'return';
                  const rowKey = `${item.type}-${item.id}`;
                  const isExpanded = !!expandedRows[rowKey];

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        onClick={() => toggleRowExpansion(rowKey)}
                        className={`cursor-pointer transition-colors group ${
                          isPayment
                            ? 'bg-teal-50/20 hover:bg-teal-50/50'
                            : isReturn
                            ? 'bg-rose-50/20 hover:bg-rose-50/50'
                            : isExpanded
                            ? 'bg-slate-50'
                            : 'hover:bg-teal-50/30'
                        }`}
                      >
                        {/* Accordion Chevron */}
                        <td className="p-3 text-center text-slate-400 group-hover:text-teal-700">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 mx-auto" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 mx-auto" />
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="p-3 text-center font-mono text-[11px] text-slate-700">
                          <div className="font-bold">{item.date}</div>
                          {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                        </td>

                        {/* Reference */}
                        <td className="p-3 text-center font-mono font-bold text-xs text-teal-800">
                          {item.ref}
                        </td>

                        {/* Movement Type Badge */}
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              isPayment
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : isInvoice
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {isPayment && <ArrowDownLeft className="w-3 h-3 text-teal-700" />}
                            {isInvoice && <ArrowUpRight className="w-3 h-3 text-blue-700" />}
                            {isReturn && <RotateCcw className="w-3 h-3 text-rose-700" />}
                            {item.typeLabel}
                          </span>
                        </td>

                        {/* Description & Method */}
                        <td className="p-3 text-slate-800">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {item.description}
                          </div>
                          {item.paymentMethodLabel && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              طريقة الدفع: <span className="text-slate-800 font-bold">{item.paymentMethodLabel}</span>
                            </div>
                          )}
                        </td>

                        {/* Debit Amount */}
                        <td className="p-3 text-left font-mono font-bold text-xs">
                          {item.debit > 0 ? (
                            <span className="text-slate-900">{formatCurrency(item.debit)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Credit Amount */}
                        <td className="p-3 text-left font-mono font-bold text-xs bg-teal-50/40 border-x border-teal-100">
                          {item.credit > 0 ? (
                            <span className="text-teal-700 font-black">
                              +{formatCurrency(item.credit)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Running Balance */}
                        <td className="p-3 text-left font-mono font-bold text-xs bg-slate-50">
                          <span className={item.balance > 0 ? 'text-amber-700 font-black' : 'text-emerald-700 font-black'}>
                            {formatCurrency(item.balance)}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {isPayment && (
                              <>
                                <button
                                  onClick={() =>
                                    printerService.printCustomerPaymentReceipt(
                                      item.rawItem as CustomerPayment,
                                      currentCustomer,
                                      settings
                                    )
                                  }
                                  className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
                                  title="طباعة سند القبض"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeletePayment(item.id, item.credit)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                                  title="إلغاء سند القبض"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {isInvoice && (
                              <button
                                onClick={() => printerService.printA4Invoice(item.rawItem as SaleInvoice, settings)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                                title="طباعة الفاتورة A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Accordion Content */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={9} className="p-3">
                            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs">
                              
                              {/* Invoice Details Inline */}
                              {isInvoice && (() => {
                                const inv = item.rawItem as SaleInvoice;
                                return (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-teal-800">أصناف الفاتورة #{inv.invoiceNumber}</span>
                                        <span className="text-slate-500">({inv.items.length} أصناف)</span>
                                        <span className="text-slate-400 font-mono">| الكاشير: {inv.cashierName || 'المسؤول'}</span>
                                      </div>
                                      <button
                                        onClick={() => printerService.printA4Invoice(inv, settings)}
                                        className="text-teal-700 hover:text-teal-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Printer className="w-3 h-3" />
                                        طباعة الفاتورة
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {inv.items.map((it, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Pill className="w-4 h-4 text-teal-600 shrink-0" />
                                            <div>
                                              <div className="font-bold text-slate-900 line-clamp-1">{it.product.name}</div>
                                              <div className="text-[10px] text-slate-500 font-mono">
                                                {it.quantity} × {formatCurrency(it.unitPrice)}
                                                {it.discountPercentage > 0 && ` (خصم ${it.discountPercentage}%)`}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="font-mono font-bold text-slate-800">
                                            {formatCurrency(it.total)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {inv.notes && (
                                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        ملاحظات: <span className="text-slate-800 font-medium">{inv.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Payment Voucher Details Inline */}
                              {isPayment && (() => {
                                const pay = item.rawItem as CustomerPayment;
                                return (
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-teal-800 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                        تفاصيل سند القبض والسداد #{pay.id.slice(-6).toUpperCase()}
                                      </div>
                                      <div className="text-slate-500 text-[11px]">
                                        المستلم: <span className="text-slate-800 font-bold">{pay.recordedBy}</span> | 
                                        طريقة التحصيل: <span className="text-slate-800 font-bold">{item.paymentMethodLabel}</span> | 
                                        التاريخ: <span className="text-slate-800 font-mono font-bold">{pay.date}</span>
                                      </div>
                                      {pay.notes && (
                                        <div className="text-slate-500 text-[11px]">
                                          البيان: <span className="text-slate-800 font-medium">{pay.notes}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => printerService.printCustomerPaymentReceipt(pay, currentCustomer, settings)}
                                        className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-teal-600" />
                                        طباعة السند
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Return Details Inline */}
                              {isReturn && (() => {
                                const ret = item.rawItem as SaleReturn;
                                return (
                                  <div className="text-xs space-y-1">
                                    <div className="font-bold text-rose-800">
                                      مرتجع مبيعات #{ret.returnNumber} للفاتورة ({ret.originalInvoiceNumber})
                                    </div>
                                    <div className="text-slate-500 text-[11px]">
                                      السبب: <span className="text-slate-800 font-bold">{ret.reason}</span> | 
                                      طريقة المعالجة: <span className="text-slate-800 font-bold">{item.paymentMethodLabel}</span>
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Fixed Sticky Reconciliation Bottom Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>
              الحركات المعروضة: <strong className="text-slate-900 font-mono font-bold">{filteredItems.length}</strong>
            </span>
            <span>
              إجمالي المدين (سحب): <strong className="text-slate-900 font-mono font-bold">{formatCurrency(filteredItems.reduce((acc, i) => acc + i.debit, 0))}</strong>
            </span>
            <span>
              إجمالي الدائن (مسدد): <strong className="text-teal-700 font-mono font-bold">+{formatCurrency(filteredItems.reduce((acc, i) => acc + i.credit, 0))}</strong>
            </span>
            <span>
              الرصيد المتبقي: <strong className={currentDebt > 0 ? "text-amber-700 font-mono font-black" : "text-emerald-700 font-mono font-black"}>{formatCurrency(currentDebt)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintStatement}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب A4</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer active:scale-95"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
