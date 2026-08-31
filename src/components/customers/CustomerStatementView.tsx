import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  DollarSign,
  Phone,
  Printer,
  FileSpreadsheet,
  MessageCircle,
  Percent,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Receipt,
  Clock,
  ShieldCheck,
  UserCheck,
  Building,
  Sparkles,
  ArrowDownLeft,
  X,
  CreditCard,
  Pill,
  ExternalLink,
  Plus,
  ArrowRight,
  Send,
  Eye,
  Check,
  Package
} from 'lucide-react';
import { Customer, CustomerPayment, SaleInvoice, SaleReturn } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';

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

export const CustomerStatementView: React.FC = () => {
  const {
    settings,
    formatCurrency,
    setCustomersSubTab,
    selectedCustomerIdForStatement,
    setSelectedCustomerIdForStatement,
  } = useSettingsStore();
  const { currentUser } = useAuthStore();

  // All customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Customer dropdown & search
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Action Panel: 'none' | 'pay' | 'discount'
  const [activeActionPanel, setActiveActionPanel] = useState<'none' | 'pay' | 'discount'>('none');

  // Quick Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('سداد دفعة من الحساب الآجل');
  const [printAfterPay, setPrintAfterPay] = useState(true);

  // Settlement Discount form
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('خصم تسوية حساب معتمد');

  // Ledger Filter states
  const [filterType, setFilterType] = useState<'all' | 'invoices' | 'payments' | 'returns'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Expandable invoice items
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = () => {
    const custs = db.getCustomers();
    setCustomers(custs);

    if (selectedCustomerIdForStatement) {
      const found = custs.find((c) => c.id === selectedCustomerIdForStatement);
      if (found) {
        setSelectedCustomer(found);
        return;
      }
    }

    if (selectedCustomer) {
      const refreshed = custs.find((c) => c.id === selectedCustomer.id);
      if (refreshed) {
        setSelectedCustomer(refreshed);
        return;
      }
    }

    // Default to first customer with debt, or first customer
    const firstDebtor = custs.find((c) => c.currentBalance > 0);
    if (firstDebtor) {
      setSelectedCustomer(firstDebtor);
    } else if (custs.length > 0) {
      setSelectedCustomer(custs[0]);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, [selectedCustomerIdForStatement]);

  // Handle outside click for customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filtered customer list for the dropdown
  const dropdownFilteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearchQuery]);

  // Date Presets Handler
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

  // Build Comprehensive Account Statement Ledger
  const statementItems = useMemo(() => {
    if (!selectedCustomer) return [];

    const normName = selectedCustomer.name.trim().toLowerCase();
    const sales = db.getSales().filter(
      (s) => s.customerId === selectedCustomer.id || (s.customerName && s.customerName.trim().toLowerCase() === normName)
    );
    const payments = db.getCustomerPayments().filter(
      (p) => p.customerId === selectedCustomer.id || (p.customerName && p.customerName.trim().toLowerCase() === normName)
    );
    const returns = db.getReturns().filter(
      (r) => r.customerId === selectedCustomer.id || (r.customerName && r.customerName.trim().toLowerCase() === normName)
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

    // 2. Customer Payments Received
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

    // 3. Sales Returns
    returns.forEach((r) => {
      const ts = new Date(r.createdAt || r.date).getTime() || new Date(r.date).getTime();
      const isCreditReversal = r.refundMethod === 'credit_reversal';

      rawList.push({
        id: r.id,
        date: r.date,
        time: r.time,
        timestamp: ts,
        type: 'return',
        typeLabel: 'مرتجع مبيعات',
        ref: `#RET-${r.returnNumber || r.id.slice(-4)}`,
        description: `إرجاع ${r.items.length} صنف (${r.reason || 'إرجاع دواء'})`,
        paymentMethod: r.refundMethod,
        paymentMethodLabel: isCreditReversal ? 'خصم من الرصيد الآجل' : 'نقداً مسترد',
        debit: 0,
        credit: isCreditReversal ? r.totalRefund : 0,
        rawItem: r,
      });
    });

    // Sort chronologically ascending to compute progressive balance
    rawList.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    const finalLedger: StatementItem[] = rawList.map((item) => {
      runningBalance += item.debit - item.credit;
      return {
        ...item,
        balance: Math.max(0, runningBalance),
      };
    });

    return finalLedger;
  }, [selectedCustomer]);

  // Filtered Ledger Items based on user search, type, and dates
  const filteredStatementItems = useMemo(() => {
    return statementItems.filter((item) => {
      if (filterType === 'invoices' && item.type !== 'invoice') return false;
      if (filterType === 'payments' && item.type !== 'payment') return false;
      if (filterType === 'returns' && item.type !== 'return') return false;

      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        return (
          item.ref.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.typeLabel.toLowerCase().includes(q) ||
          item.date.includes(q)
        );
      }

      return true;
    });
  }, [statementItems, filterType, startDate, endDate, ledgerSearch]);

  // Summary Metrics for the Selected Customer
  const metrics = useMemo(() => {
    if (!selectedCustomer) {
      return {
        totalDebits: 0,
        totalCredits: 0,
        netBalance: 0,
        invoicesCount: 0,
        paymentsCount: 0,
        returnsCount: 0,
      };
    }

    const totalDebits = statementItems.reduce((sum, item) => sum + item.debit, 0);
    const totalCredits = statementItems.reduce((sum, item) => sum + item.credit, 0);
    const invoicesCount = statementItems.filter((i) => i.type === 'invoice').length;
    const paymentsCount = statementItems.filter((i) => i.type === 'payment').length;
    const returnsCount = statementItems.filter((i) => i.type === 'return').length;

    return {
      totalDebits,
      totalCredits,
      netBalance: selectedCustomer.currentBalance,
      invoicesCount,
      paymentsCount,
      returnsCount,
    };
  }, [selectedCustomer, statementItems]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Submit Quick Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      showToast('يرجى إدخال مبلغ صحيح');
      return;
    }

    const newPayment: CustomerPayment = {
      id: `CPAY-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: amountNum,
      date: paymentDate,
      paymentMethod,
      notes: paymentNote || 'سداد دفعة من الحساب الآجل',
      recordedBy: currentUser?.name || 'أمين الصندوق',
      createdAt: new Date().toISOString(),
    };

    db.addCustomerPayment(newPayment);

    // Update customer balance
    const updatedBalance = Math.max(0, selectedCustomer.currentBalance - amountNum);
    db.saveCustomer({
      ...selectedCustomer,
      currentBalance: updatedBalance,
    });

    if (printAfterPay) {
      printerService.printCustomerPaymentReceipt(newPayment, selectedCustomer, settings);
    }

    showToast(`تم تسجيل سند القبض بمبلغ ${formatCurrency(amountNum)} بنجاح ✅`);
    setPaymentAmount('');
    setActiveActionPanel('none');
    refreshData();
  };

  // Submit Settlement Discount
  const handleSubmitDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const discNum = parseFloat(discountAmount);
    if (!discNum || discNum <= 0) {
      showToast('يرجى إدخال مبلغ خصم صحيح');
      return;
    }

    const discountPayment: CustomerPayment = {
      id: `CDISC-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: discNum,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      notes: `خصم تسوية حساب معتمد: ${discountReason}`,
      recordedBy: currentUser?.name || 'مدير الصيدلية',
      createdAt: new Date().toISOString(),
    };

    db.addCustomerPayment(discountPayment);

    const updatedBalance = Math.max(0, selectedCustomer.currentBalance - discNum);
    db.saveCustomer({
      ...selectedCustomer,
      currentBalance: updatedBalance,
    });

    showToast(`تم تطبيق خصم التسوية بمبلغ ${formatCurrency(discNum)} بنجاح ✅`);
    setDiscountAmount('');
    setActiveActionPanel('none');
    refreshData();
  };

  // Send WhatsApp Account Statement Summary
  const handleSendWhatsApp = () => {
    if (!selectedCustomer || !selectedCustomer.phone) {
      showToast('العميل لا يمتلك رقم هاتف مسجل');
      return;
    }

    const cleanPhone = selectedCustomer.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('967')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `967${cleanPhone.slice(1)}`
      : `967${cleanPhone}`;

    const text = `*صيدلية ${settings.pharmacyName}*\n` +
      `--------------------------------\n` +
      `عزيزي العميل المحترم: *${selectedCustomer.name}*\n` +
      `نرفق لكم ملخص كشف الحساب والمسحوبات الدوائية:\n\n` +
      `💰 *إجمالي المسحوبات والمشتريات:* ${formatCurrency(metrics.totalDebits)}\n` +
      `💳 *إجمالي المسدد والمقبوض:* ${formatCurrency(metrics.totalCredits)}\n` +
      `📌 *الرصيد المتبقي المستحق:* ${formatCurrency(selectedCustomer.currentBalance)}\n` +
      `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-YE')}\n\n` +
      `شاكرين حسن تعاملكم وثقتكم بنا دائماً 🌿`;

    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Print Statement A4
  const handlePrintStatement = () => {
    if (!selectedCustomer) return;
    printerService.printCustomerAccountStatement(selectedCustomer, statementItems, settings);
  };

  // Export Excel CSV
  const handleExportCSV = () => {
    if (!selectedCustomer) return;
    excelService.exportCustomerStatementToCSV(selectedCustomer, statementItems);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800 select-none p-1 sm:p-2 max-w-7xl mx-auto w-full gap-1 sm:gap-1.5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-3 py-1.5 rounded-lg shadow-lg border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 animate-fadeIn backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area (Fitted to screen) */}
      <div className="flex-1 flex flex-col min-h-0 w-full gap-1 sm:gap-1.5">
        
        {/* ======================================================== */}
        {/* 1. Unified Row: Customer Selector + Contact + Balance Badge */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg p-1 sm:p-1.5 border border-teal-100 shadow-2xs flex items-center gap-1.5 relative shrink-0 flex-wrap sm:flex-nowrap">
          {/* Back button to directory */}
          <button
            type="button"
            onClick={() => setCustomersSubTab('directory')}
            className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 shrink-0 transition-colors active:scale-95 cursor-pointer"
            title="الرجوع لسجل العملاء"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">سجل العملاء</span>
          </button>

          {/* Customer Search & Select Input with Dropdown (Identical to Supplier Search in PurchasePOS) */}
          <div className="relative flex-1 min-w-[200px]" ref={customerDropdownRef}>
            <UserCheck className="w-3.5 h-3.5 text-teal-600 absolute right-2 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث بالاسم، رقم الهاتف، أو العنوان لتحديد العميل..."
              value={customerSearchQuery || (selectedCustomer ? selectedCustomer.name : '')}
              onFocus={() => {
                setIsCustomerDropdownOpen(true);
                setCustomerSearchQuery('');
              }}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setIsCustomerDropdownOpen(true);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pr-7 pl-6 py-1 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedCustomerIdForStatement(null);
                  setCustomerSearchQuery('');
                }}
                className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px]"
                title="إلغاء التحديد"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Interactive Dropdown Results */}
            {isCustomerDropdownOpen && (
              <div className="absolute top-full right-0 left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-teal-200 divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fadeIn">
                <div className="px-2.5 py-1 bg-teal-50/90 flex items-center justify-between text-[10px] font-bold text-teal-900 sticky top-0 z-10">
                  <span>العملاء المسجلون في الصيدلية ({dropdownFilteredCustomers.length})</span>
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setSelectedCustomerIdForStatement(null);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      إلغاء التحديد ✕
                    </button>
                  )}
                </div>

                {dropdownFilteredCustomers.length === 0 ? (
                  <div className="p-3 text-center space-y-1">
                    <p className="text-xs text-slate-700 font-bold">لا يوجد عميل مسجل بهذا الاسم</p>
                    <p className="text-[10px] text-teal-700">تأكد من كتابة الاسم أو رقم الهاتف بدقة</p>
                  </div>
                ) : (
                  dropdownFilteredCustomers.map((cust) => {
                    const isSelected = selectedCustomer?.id === cust.id;
                    const hasDebt = cust.currentBalance > 0;
                    return (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setSelectedCustomerIdForStatement(cust.id);
                          setCustomerSearchQuery('');
                          setIsCustomerDropdownOpen(false);
                        }}
                        className={`p-2 hover:bg-teal-50 active:bg-teal-100 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-teal-50/80 font-bold border-r-2 border-teal-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {isSelected ? <UserCheck className="w-3.5 h-3.5" /> : cust.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 leading-tight truncate">
                              {cust.name}
                            </div>
                            {cust.phone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {cust.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left shrink-0 mr-1">
                          {hasDebt ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              مدين: {formatCurrency(cust.currentBalance)}
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              خالص الحساب
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Customer Balance Indicator Badge */}
          {selectedCustomer && (
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-1 shrink-0 focus-within:border-teal-500">
              <span className="text-[10px] text-slate-500 font-bold ml-1">الرصيد الحالي:</span>
              <span
                className={`font-mono font-black text-xs px-1.5 py-0.2 rounded ${
                  selectedCustomer.currentBalance > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}
              >
                {formatCurrency(selectedCustomer.currentBalance)}
              </span>
            </div>
          )}

          {/* Action trigger switcher (سند قبض / خصم تسوية) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => setActiveActionPanel(activeActionPanel === 'pay' ? 'none' : 'pay')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer ${
                activeActionPanel === 'pay'
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>سند قبض</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveActionPanel(activeActionPanel === 'discount' ? 'none' : 'discount')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer ${
                activeActionPanel === 'discount'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Percent className="w-3 h-3" />
              <span>خصم تسوية</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. Unified Search & Filters Toolbar */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          {/* Search inside statement ledger */}
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-teal-600 absolute right-2.5 top-2" />
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، سند القبض، أو البيان في كشف الحساب..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pr-7 pl-2 py-1 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Transaction Type Filter Dropdown */}
          <div className="relative shrink-0 w-28 sm:w-36">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-md pr-2 pl-6 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">كافة الحركات (الكل)</option>
              <option value="invoices">فواتير المبيعات فقط</option>
              <option value="payments">سندات القبض والتحصيل</option>
              <option value="returns">المرتجعات والتسويات</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
          </div>

          {/* Date range presets dropdown */}
          <div className="relative shrink-0 w-24 sm:w-28">
            <select
              value={datePreset}
              onChange={(e) => applyDatePreset(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-md pr-2 pl-6 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">كامل الفترة</option>
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر شهر</option>
              <option value="quarter">آخر 3 أشهر</option>
            </select>
            <Calendar className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
          </div>

          {/* Quick Action Buttons (WhatsApp, Excel, Print A4) */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedCustomer?.phone && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 px-1.5"
                title="إرسال كشف الحساب عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] hidden md:inline">واتساب</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 px-1.5"
              title="تصدير كشف الحساب إلى ملف Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-[10px] hidden md:inline">إكسل</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStatement}
              className="p-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 px-2"
              title="طباعة كشف حساب معتمد A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">طباعة A4</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. Inline Quick Payment / Settlement Drawer */}
        {/* ======================================================== */}
        {activeActionPanel === 'pay' && selectedCustomer && (
          <form
            onSubmit={handleSubmitPayment}
            className="bg-emerald-50/90 border border-emerald-300 rounded-lg p-2.5 shadow-2xs space-y-2 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>تسجيل سند قبض وسداد دفعة للعميل: <strong>{selectedCustomer.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionPanel('none')}
                className="text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              {/* Payment Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  المبلغ المقبوض ({settings.currencySymbol}):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder={selectedCustomer.currentBalance > 0 ? selectedCustomer.currentBalance.toString() : '0.00'}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                  {selectedCustomer.currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedCustomer.currentBalance.toString())}
                      className="absolute left-1 top-1 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded hover:bg-emerald-200"
                    >
                      كامل الدين
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">طريقة الدفع:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="cash">نقداً (الخزينة الرئيسية)</option>
                  <option value="card">شبكة / بطاقة بنكية</option>
                  <option value="bank_transfer">تحويل بنكي / حساب كريمي</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">تاريخ السند:</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">البيان / الملاحظات:</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="سداد دفعة من الحساب..."
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 gap-2">
              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printAfterPay}
                  onChange={(e) => setPrintAfterPay(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span>طباعة إيصال قبض فوري بعد الحفظ</span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveActionPanel('none')}
                  className="px-2.5 py-1 rounded text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تأكيد وقبض المبلغ</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {activeActionPanel === 'discount' && selectedCustomer && (
          <form
            onSubmit={handleSubmitDiscount}
            className="bg-purple-50/90 border border-purple-300 rounded-lg p-2.5 shadow-2xs space-y-2 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-purple-200/80 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                <Percent className="w-4 h-4 text-purple-600" />
                <span>تسجيل خصم تسوية حساب / إعفاء للعميل: <strong>{selectedCustomer.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionPanel('none')}
                className="text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  مبلغ الخصم أو الإعفاء ({settings.currencySymbol}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">سبب الخصم / الاعتماد:</label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="خصم تسوية، إعفاء نسبة معينة..."
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveActionPanel('none')}
                className="px-2.5 py-1 rounded text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>اعتماد خصم التسوية</span>
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* 4. KPI Financial Cards Summary (Same compact height) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
          {/* 1: Current Balance */}
          <div className="bg-white rounded-lg p-2 border border-amber-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <span>الرصيد المدين المتبقي</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-mono font-black text-amber-700 mt-0.5">
              {formatCurrency(selectedCustomer?.currentBalance || 0)}
            </div>
            <div className="text-[9px] text-amber-600 font-medium">
              {selectedCustomer?.currentBalance ? 'مستحق على العميل' : 'الحساب خالص'}
            </div>
          </div>

          {/* 2: Total Purchases / Debits */}
          <div className="bg-white rounded-lg p-2 border border-teal-100 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <span>إجمالي المسحوبات والمبيعات</span>
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-sm sm:text-base font-mono font-black text-teal-800 mt-0.5">
              {formatCurrency(metrics.totalDebits)}
            </div>
            <div className="text-[9px] text-slate-400">
              عبر {metrics.invoicesCount} فاتورة مبيعات
            </div>
          </div>

          {/* 3: Total Payments / Credits */}
          <div className="bg-white rounded-lg p-2 border border-emerald-100 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <span>إجمالي المقبوضات والتحصيلات</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-sm sm:text-base font-mono font-black text-emerald-700 mt-0.5">
              {formatCurrency(metrics.totalCredits)}
            </div>
            <div className="text-[9px] text-emerald-600">
              عبر {metrics.paymentsCount} سند قبض
            </div>
          </div>

          {/* 4: Credit Limit & Status */}
          <div className="bg-white rounded-lg p-2 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <span>سقف الائتمان وحالة الحساب</span>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-800 mt-0.5">
              {selectedCustomer?.maxCreditLimit && selectedCustomer.maxCreditLimit > 0
                ? formatCurrency(selectedCustomer.maxCreditLimit)
                : 'بدون سقف'}
            </div>
            <div className="text-[9px] text-slate-500">
              {selectedCustomer?.maxCreditLimit && selectedCustomer.currentBalance > selectedCustomer.maxCreditLimit ? (
                <span className="text-rose-600 font-bold">تجاوز السقف الائتماني!</span>
              ) : (
                <span>ضمن الحدود المسموحة</span>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. Main Account Statement Ledger Box (Matching Purchase Cart Box) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg border-2 border-teal-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-2.5 py-1 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-teal-600 text-white">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-800">
                حركات وكشف حساب: {selectedCustomer?.name || '---'}
              </h2>
              <span className="bg-teal-700 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {filteredStatementItems.length}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 font-medium">
              الترتيب التراكمي للحركات
            </div>
          </div>

          {/* Ledger Items Container */}
          <div className="p-1 sm:p-1.5 flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {filteredStatementItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <FileText className="w-7 h-7 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-medium">لا توجد حركات مسجلة في كشف الحساب</p>
                <p className="text-[10px] text-slate-400">
                  سيتم تسجيل الحركات تلقائياً عند إجراء مبيعات أو تحصيل سندات قبض للعميل
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Tabular View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-1.5 px-2">التاريخ والوقت</th>
                        <th className="py-1.5 px-2">نوع الحركة</th>
                        <th className="py-1.5 px-2">رقم المرجع</th>
                        <th className="py-1.5 px-2">البيان والتفاصيل</th>
                        <th className="py-1.5 px-2 text-left">مدين (+) مسحوبات</th>
                        <th className="py-1.5 px-2 text-left">دائن (-) مقبوضات</th>
                        <th className="py-1.5 px-2 text-left">الرصيد التراكمي</th>
                        <th className="py-1.5 px-1 text-center w-8">تفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStatementItems.map((item) => {
                        const isExpanded = expandedRows[item.id];
                        const isInvoice = item.type === 'invoice';
                        const invoice = isInvoice ? (item.rawItem as SaleInvoice) : null;

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              onClick={() => isInvoice && toggleRow(item.id)}
                              className={`hover:bg-teal-50/50 transition-colors ${
                                isInvoice ? 'cursor-pointer' : ''
                              }`}
                            >
                              {/* Date & Time */}
                              <td className="py-2 px-2">
                                <div className="font-mono font-bold text-slate-800 text-[11px]">{item.date}</div>
                                {item.time && <div className="text-[9px] text-slate-400 font-mono">{item.time}</div>}
                              </td>

                              {/* Type Badge */}
                              <td className="py-2 px-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                    item.type === 'invoice'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : item.type === 'payment'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {item.typeLabel}
                                </span>
                              </td>

                              {/* Reference */}
                              <td className="py-2 px-2 font-mono font-bold text-slate-700 text-xs">
                                {item.ref}
                              </td>

                              {/* Description */}
                              <td className="py-2 px-2">
                                <div className="text-slate-800 text-xs font-medium">{item.description}</div>
                                {item.paymentMethodLabel && (
                                  <div className="text-[10px] text-slate-400">{item.paymentMethodLabel}</div>
                                )}
                              </td>

                              {/* Debit */}
                              <td className="py-2 px-2 text-left font-mono font-bold text-amber-700 text-xs">
                                {item.debit > 0 ? `+${formatCurrency(item.debit)}` : '---'}
                              </td>

                              {/* Credit */}
                              <td className="py-2 px-2 text-left font-mono font-bold text-emerald-700 text-xs">
                                {item.credit > 0 ? `-${formatCurrency(item.credit)}` : '---'}
                              </td>

                              {/* Progressive Balance */}
                              <td className="py-2 px-2 text-left font-mono font-black text-slate-900 text-xs">
                                {formatCurrency(item.balance)}
                              </td>

                              {/* Expand Button */}
                              <td className="py-2 px-1 text-center">
                                {isInvoice && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRow(item.id);
                                    }}
                                    className="p-1 rounded hover:bg-teal-100 text-teal-700"
                                    title="عرض محتويات الفاتورة"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Expandable Invoice Details */}
                            {isInvoice && isExpanded && invoice && (
                              <tr className="bg-slate-50/90 border-b border-teal-100">
                                <td colSpan={8} className="p-2.5">
                                  <div className="bg-white border border-teal-200 rounded-lg p-2 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-teal-900 border-b border-teal-100 pb-1">
                                      <span>محتويات وأصناف الفاتورة #{invoice.invoiceNumber}</span>
                                      <span>البائع: {invoice.cashierName || 'الكاشير'}</span>
                                    </div>
                                    <div className="divide-y divide-slate-100 text-xs">
                                      {invoice.items.map((it, idx) => (
                                        <div key={idx} className="py-1 flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <Pill className="w-3 h-3 text-teal-600" />
                                            <span className="font-bold text-slate-800">{it.product.name}</span>
                                            <span className="text-[10px] text-slate-400">× {it.quantity}</span>
                                          </div>
                                          <div className="font-mono font-bold text-slate-700">
                                            {formatCurrency(it.total)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (Touch-friendly & Compact) */}
                <div className="sm:hidden space-y-2">
                  {filteredStatementItems.map((item) => {
                    const isExpanded = expandedRows[item.id];
                    const isInvoice = item.type === 'invoice';
                    const invoice = isInvoice ? (item.rawItem as SaleInvoice) : null;

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-50/80 border border-slate-200 rounded-lg p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                item.type === 'invoice'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.type === 'payment'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.typeLabel}
                            </span>
                            <span className="font-mono font-bold text-[11px] text-slate-800 truncate">
                              {item.ref}
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-slate-500">
                            {item.date} {item.time || ''}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-700 leading-tight">
                          {item.description}
                        </div>

                        {/* Amounts Grid */}
                        <div className="grid grid-cols-3 gap-1 bg-white p-1.5 rounded border border-slate-200 text-center text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 block">مدين (+):</span>
                            <span className="font-mono font-bold text-amber-700 text-[11px]">
                              {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">دائن (-):</span>
                            <span className="font-mono font-bold text-emerald-700 text-[11px]">
                              {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">الرصيد:</span>
                            <span className="font-mono font-black text-slate-900 text-[11px]">
                              {formatCurrency(item.balance)}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Invoice details on Mobile */}
                        {isInvoice && invoice && (
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleRow(item.id)}
                              className="w-full text-center py-0.5 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'إخفاء أصناف الفاتورة' : 'عرض أصناف الفاتورة'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-1 bg-white border border-teal-200 rounded p-1.5 divide-y divide-slate-100 text-[11px]">
                                {invoice.items.map((it, idx) => (
                                  <div key={idx} className="py-1 flex items-center justify-between">
                                    <span className="font-medium text-slate-800">{it.product.name} (×{it.quantity})</span>
                                    <span className="font-mono font-bold text-slate-700">{formatCurrency(it.total)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 6. Sticky Bottom Action Bar (Identical to PurchasePOSView Checkout Bar) */}
      {/* ======================================================== */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-teal-200 shadow-[0_-8px_25px_rgba(15,23,42,0.1)] p-2 sm:p-3 space-y-2 max-w-7xl mx-auto w-full rounded-t-2xl">
        <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50/90 border border-slate-200/80 rounded-xl p-2">
          {/* Customer Name and Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500">العميل الحالي:</span>
            <span className="font-bold text-xs sm:text-sm text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
              {selectedCustomer?.name || 'لم يتم اختيار عميل'}
            </span>
          </div>

          {/* Outstanding Balance */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-teal-800">الرصيد المدين المستحق:</span>
            <span
              className={`font-mono font-black text-sm sm:text-base px-2.5 py-0.5 rounded-lg border shadow-2xs ${
                selectedCustomer?.currentBalance && selectedCustomer.currentBalance > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300'
              }`}
            >
              {formatCurrency(selectedCustomer?.currentBalance || 0)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomersSubTab('directory')}
            className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <span>سجل العملاء</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveActionPanel(activeActionPanel === 'pay' ? 'none' : 'pay')}
            className="flex-2 min-h-[40px] py-2 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-emerald-700/25"
          >
            <DollarSign className="w-4 h-4" />
            <span>سند قبض فوري وسداد</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-700/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة الكشف</span>
          </button>
        </div>
      </div>
    </div>
  );
};
