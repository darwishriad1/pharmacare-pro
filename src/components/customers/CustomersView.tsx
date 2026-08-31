import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  Edit2,
  Trash2,
  Download,
  CreditCard,
  Building,
  TrendingUp,
  Clock,
  ArrowDownLeft,
  ExternalLink,
  Printer,
  Receipt,
  MessageCircle,
  Calendar,
  Layers,
  Sparkles,
  PieChart,
  RefreshCw,
  UserCheck,
  Percent,
  ChevronLeft,
  X,
  PhoneCall,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Customer, CustomerPayment } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { CustomerModal } from './CustomerModal';
import { CustomerAccountModal } from './CustomerAccountModal';
import { CustomerStatementView } from './CustomerStatementView';
import { QuickPaymentModal } from './QuickPaymentModal';
import { excelService } from '../../services/excelService';
import { printerService } from '../../services/printerService';
import { CustomersSubTab } from '../../stores/useSettingsStore';
import { getCustomerColor } from '../../utils/customerColors';

type CustomerSubTab = CustomersSubTab | 'debtors';

export const CustomersView: React.FC = () => {
  const {
    formatCurrency,
    settings,
    customersSubTab,
    setCustomersSubTab,
    setSelectedCustomerIdForStatement,
    isNewCustomerModalTriggered,
    clearNewCustomerModalTrigger,
    isQuickPayModalTriggered,
    clearQuickPayModalTrigger,
  } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<CustomerSubTab>('directory');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'indebted' | 'overlimit' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'name_asc' | 'purchases_desc' | 'recent'>('debt_desc');

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isQuickPayModalOpen, setIsQuickPayModalOpen] = useState(false);

  // Sync with store subTab
  useEffect(() => {
    if (customersSubTab && (customersSubTab as string) !== 'statements') {
      setActiveSubTab(customersSubTab as any);
    }
  }, [customersSubTab]);

  // Listen for top bar triggers
  useEffect(() => {
    if (isNewCustomerModalTriggered) {
      setSelectedCustomer(null);
      setIsCustomerModalOpen(true);
      clearNewCustomerModalTrigger();
    }
  }, [isNewCustomerModalTriggered, clearNewCustomerModalTrigger]);

  useEffect(() => {
    if (isQuickPayModalTriggered) {
      setSelectedCustomer(null);
      setIsQuickPayModalOpen(true);
      clearQuickPayModalTrigger();
    }
  }, [isQuickPayModalTriggered, clearQuickPayModalTrigger]);

  const refreshData = () => {
    setCustomers(db.getCustomers());
    setPayments(db.getCustomerPayments());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, []);

  // Summary Metrics
  const totalDebts = useMemo(
    () => customers.reduce((acc, c) => acc + (c.currentBalance || 0), 0),
    [customers]
  );
  const indebtedCount = useMemo(
    () => customers.filter((c) => (c.currentBalance || 0) > 0).length,
    [customers]
  );
  const overLimitCount = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c.currentBalance || 0) > 0 &&
          (c.maxCreditLimit || 0) > 0 &&
          (c.currentBalance || 0) > (c.maxCreditLimit || 0)
      ).length,
    [customers]
  );
  const settledCount = useMemo(
    () => customers.filter((c) => (c.currentBalance || 0) === 0).length,
    [customers]
  );
  const totalPurchasesSum = useMemo(
    () => customers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0),
    [customers]
  );
  const totalCollectedSum = useMemo(
    () => payments.reduce((acc, p) => acc + (p.amount || 0), 0),
    [payments]
  );

  // Filtered & Sorted Customers for Directory
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchesDebt =
        debtFilter === 'all' ||
        (debtFilter === 'indebted' && c.currentBalance > 0) ||
        (debtFilter === 'overlimit' &&
          c.currentBalance > 0 &&
          c.maxCreditLimit > 0 &&
          c.currentBalance > c.maxCreditLimit) ||
        (debtFilter === 'settled' && c.currentBalance === 0);

      return matchesSearch && matchesDebt;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'debt_desc') return (b.currentBalance || 0) - (a.currentBalance || 0);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
      if (sortBy === 'purchases_desc') return (b.totalPurchases || 0) - (a.totalPurchases || 0);
      return 0;
    });

    return list;
  }, [customers, searchQuery, debtFilter, sortBy]);

  // Debtors Only List
  const debtorsList = useMemo(() => {
    return customers
      .filter((c) => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance);
  }, [customers]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.customerName.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  // Open Handlers
  const handleOpenAccount = (cust: Customer) => {
    setSelectedCustomerIdForStatement(cust.id);
    setCustomersSubTab('statements');
  };

  const handleOpenQuickPay = (cust?: Customer) => {
    setSelectedCustomer(cust || null);
    setIsQuickPayModalOpen(true);
  };

  const handleEditCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  const handleDeleteCustomer = (cust: Customer) => {
    if (cust.currentBalance > 0) {
      alert(`لا يمكن حذف العميل [${cust.name}] لوجود رصيد متبقي عليه قدره ${formatCurrency(cust.currentBalance)}. يرجى تصفية الحساب أولاً.`);
      return;
    }
    if (confirm(`هل أنت متأكد من حذف العميل [${cust.name}] نهائياً؟`)) {
      db.deleteCustomer(cust.id);
      refreshData();
    }
  };

  const handleSendWhatsAppDebt = (cust: Customer) => {
    if (!cust.phone) {
      alert('العميل لا يمتلك رقم هاتف مسجل');
      return;
    }
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('967')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `967${cleanPhone.slice(1)}`
      : cleanPhone
      ? `967${cleanPhone}`
      : '';

    const text = `*صيدلية ${settings.pharmacyName}*\n` +
      `--------------------------------\n` +
      `عزيزي العميل المحترم: *${cust.name}*\n` +
      `نود تذكيركم بالرصيد المدين المتبقي المستحق على حسابكم:\n\n` +
      `💰 *المبلغ المستحق:* ${formatCurrency(cust.currentBalance)}\n` +
      `📅 *تاريخ التذكير:* ${new Date().toLocaleDateString('ar-YE')}\n\n` +
      `شاكرين لكم سرعة السداد وحسن تعاملكم الدائم معنا 🌿`;

    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleReprintPayment = (p: CustomerPayment) => {
    const cust: Customer = customers.find((c) => c.id === p.customerId) || {
      id: p.customerId,
      name: p.customerName,
      phone: '',
      currentBalance: 0,
      totalPurchases: 0,
      maxCreditLimit: 0,
      createdAt: new Date().toISOString(),
    };
    printerService.printCustomerPaymentReceipt(p, cust, settings);
  };

  const handleDeletePayment = (p: CustomerPayment) => {
    if (
      confirm(
        `هل أنت متأكد من إلغاء سند القبض رقم #${p.id.slice(-6).toUpperCase()} بمبلغ ${formatCurrency(
          p.amount
        )}؟ سيتم إعادة المبلغ لمديونية العميل.`
      )
    ) {
      db.deleteCustomerPayment(p.id);
      refreshData();
    }
  };

  const handleExportCustomersExcel = () => {
    excelService.exportCustomersToCSV(customers);
  };

  // If user selected Full-Screen Statements Tab, render dedicated component
  if (customersSubTab === 'statements') {
    return <CustomerStatementView />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800 select-none p-1 sm:p-2 max-w-7xl mx-auto w-full gap-1 sm:gap-1.5">
      
      {/* ======================================================== */}
      {/* 1. Header Toolbar & Sub-Tab Switcher (Pinned at top)     */}
      {/* ======================================================== */}
      <div className="bg-white rounded-lg p-1 sm:p-1.5 border border-teal-100 shadow-2xs flex items-center justify-between gap-1 shrink-0 flex-wrap">
        {/* Sub-tabs pills */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-slate-100 rounded-md">
          <button
            type="button"
            onClick={() => setActiveSubTab('directory')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSubTab === 'directory'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>العملاء</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeSubTab === 'directory'
                  ? 'bg-teal-800 text-teal-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {customers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('debtors')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSubTab === 'debtors'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>المدينون</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeSubTab === 'debtors'
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {debtorsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCustomersSubTab('statements')}
            className="px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>كشف الحساب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('receipts')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSubTab === 'receipts'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>سندات القبض</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeSubTab === 'receipts'
                  ? 'bg-emerald-700 text-emerald-100'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {payments.length}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Payment Button */}
          <button
            type="button"
            onClick={() => handleOpenQuickPay()}
            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="تسجيل سند قبض وسداد دين فوري"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
            <span>سند قبض</span>
          </button>

          {/* Add Customer Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            className="px-2 py-1 rounded-md bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>عميل جديد</span>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportCustomersExcel}
            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="تصدير قائمة العملاء إلى إكسل"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Financial Metrics: Mobile Ultra-Dense Ticker & Desktop Cards */}
      {/* ======================================================== */}
      
      {/* Mobile Ultra-Compact Strip (Takes only ~26px) */}
      <div className="sm:hidden bg-white rounded-lg px-2 py-1 border border-teal-100 shadow-2xs flex items-center justify-between text-[11px] font-bold shrink-0 gap-1 overflow-x-auto">
        <div className="flex items-center gap-1 text-amber-900 shrink-0">
          <span className="text-[10px] text-slate-500 font-normal">الديون:</span>
          <span className="font-mono text-amber-700 font-black">{formatCurrency(totalDebts)}</span>
          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded-full">({indebtedCount})</span>
        </div>
        <div className="w-px h-3 bg-slate-200 shrink-0" />
        <div className="flex items-center gap-1 text-emerald-900 shrink-0">
          <span className="text-[10px] text-slate-500 font-normal">المقبوض:</span>
          <span className="font-mono text-emerald-700 font-black">{formatCurrency(totalCollectedSum)}</span>
        </div>
        <div className="w-px h-3 bg-slate-200 shrink-0" />
        <div className="flex items-center gap-1 text-slate-700 shrink-0">
          <span className="text-[10px] text-slate-500 font-normal">خالص:</span>
          <span className="font-mono text-teal-700 font-bold">{settledCount}</span>
        </div>
      </div>

      {/* Desktop 4 Metric Cards */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-1.5 shrink-0">
        {/* Total Debt */}
        <div className="bg-white rounded-lg p-1.5 border border-amber-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>إجمالي ديون العملاء</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-sm font-mono font-black text-amber-700">
            {formatCurrency(totalDebts)}
          </div>
          <div className="text-[10px] text-amber-800 font-medium">
            مستحقة على {indebtedCount} عميل {overLimitCount > 0 && `(${overLimitCount} تجاوز السقف)`}
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white rounded-lg p-1.5 border border-emerald-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>إجمالي التحصيلات المقبوضة</span>
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-sm font-mono font-black text-emerald-700">
            {formatCurrency(totalCollectedSum)}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium">
            عبر {payments.length} سند قبض مسجل
          </div>
        </div>

        {/* Total Purchases Volume */}
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>حجم مسحوبات العملاء</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-sm font-mono font-black text-teal-800">
            {formatCurrency(totalPurchasesSum)}
          </div>
          <div className="text-[10px] text-slate-500">
            إجمالي مبيعات الحسابات المسجلة
          </div>
        </div>

        {/* Settled & Total Count */}
        <div className="bg-white rounded-lg p-1.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>سجلات وخالصي الحساب</span>
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-sm font-mono font-black text-slate-900">
            {customers.length} <span className="text-xs font-normal text-slate-500">عميل</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            {settledCount} عميل خالص الحساب
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. Search, Filter Chips & Sorting Bar (Pinned at top)    */}
      {/* ======================================================== */}
      <div className="bg-white rounded-lg p-1 border border-teal-100 shadow-2xs flex items-center gap-1 shrink-0 flex-wrap">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-teal-600 absolute right-2 top-1.5" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pr-6 pl-5 py-0.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-1.5 top-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setDebtFilter('all')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              debtFilter === 'all'
                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            الكل ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setDebtFilter('indebted')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              debtFilter === 'indebted'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            مدينون ({indebtedCount})
          </button>

          {overLimitCount > 0 && (
            <button
              type="button"
              onClick={() => setDebtFilter('overlimit')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                debtFilter === 'overlimit'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              تجاوز السقف ({overLimitCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setDebtFilter('settled')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              debtFilter === 'settled'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            خالصون ({settledCount})
          </button>
        </div>

        {/* Sort Selector */}
        <div className="relative shrink-0 w-28 sm:w-32">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded pr-1.5 pl-5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="debt_desc">الأعلى مديونية</option>
            <option value="name_asc">الاسم أبجدياً</option>
            <option value="purchases_desc">الأعلى مشتريات</option>
          </select>
          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 absolute left-1.5 top-1.5 pointer-events-none" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TAB 1: Main Customer Directory (Scrollable Area)     */}
      {/* ======================================================== */}
      {activeSubTab === 'directory' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          {/* Mobile Card List (Ultra-Dense, Touch-First) */}
          <div className="sm:hidden space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-4 text-center text-slate-400">
                <Users className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                <p className="font-bold text-slate-700 text-xs">لا يوجد عميل مطابق للبحث</p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const hasDebt = (cust.currentBalance || 0) > 0;
                const isOverLimit =
                  hasDebt && (cust.maxCreditLimit || 0) > 0 && cust.currentBalance > cust.maxCreditLimit;
                const theme = getCustomerColor(cust);

                return (
                  <div
                    key={cust.id}
                    className={`rounded-xl p-2.5 border shadow-2xs transition-all space-y-1.5 ${theme.cardBg} ${theme.borderAccent} ${
                      isOverLimit
                        ? 'ring-1 ring-rose-400'
                        : ''
                    }`}
                  >
                    {/* Row 1: Avatar + Name + Color Tag + Debt Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${theme.avatarBg}`}
                        >
                          {cust.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {cust.name}
                            </h3>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${theme.badge}`}>
                              {theme.nameAr}
                            </span>
                          </div>
                          {cust.address && (
                            <p className="text-[9px] text-slate-400 truncate">{cust.address}</p>
                          )}
                        </div>
                      </div>

                      {/* Balance Badge */}
                      <div className="text-left shrink-0">
                        {hasDebt ? (
                          <span
                            className={`text-xs font-mono font-black px-1.5 py-0.5 rounded inline-block ${
                              isOverLimit
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {formatCurrency(cust.currentBalance)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            خالص
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Phone with 1-tap call & WhatsApp + Credit Limit */}
                    <div className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 p-1 rounded border border-slate-100">
                      {cust.phone ? (
                        <div className="flex items-center gap-1 font-mono text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                          <a
                            href={`tel:${cust.phone}`}
                            className="p-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100"
                            title="اتصال مباشر"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppDebt(cust)}
                            className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="إرسال تذكير بالرصيد عبر واتساب"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">بدون هاتف</span>
                      )}

                      {/* Credit Limit Badge */}
                      <div className="text-[10px] text-slate-500 shrink-0">
                        <span>سقف: </span>
                        <strong className="font-mono text-slate-800">
                          {cust.maxCreditLimit && cust.maxCreditLimit > 0
                            ? formatCurrency(cust.maxCreditLimit)
                            : 'مفتوح'}
                        </strong>
                      </div>
                    </div>

                    {/* Row 3: Action Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      {/* Quick Pay Receipt */}
                      <button
                        type="button"
                        onClick={() => handleOpenQuickPay(cust)}
                        className="col-span-2 py-1 px-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <DollarSign className="w-3 h-3 text-emerald-200" />
                        <span>سند قبض</span>
                      </button>

                      {/* Statement */}
                      <button
                        type="button"
                        onClick={() => handleOpenAccount(cust)}
                        className="col-span-1 py-1 px-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                        title="كشف الحساب"
                      >
                        <FileText className="w-3 h-3" />
                        <span>كشف</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleEditCustomer(cust)}
                        className="col-span-1 py-1 px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                        title="تعديل العميل"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 px-2.5">العميل</th>
                    <th className="py-1.5 px-2.5">رقم الهاتف</th>
                    <th className="py-1.5 px-2.5">العنوان</th>
                    <th className="py-1.5 px-2.5 text-left">الرصيد المتبقي (المديونية)</th>
                    <th className="py-1.5 px-2.5 text-left">سقف الآجل</th>
                    <th className="py-1.5 px-2.5 text-left">إجمالي المشتريات</th>
                    <th className="py-1.5 px-2.5 text-center">الإجراءات والعمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        <Users className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                        <p className="font-bold text-slate-700 text-xs">لا يوجد عملاء مطابقين للبحث</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const hasDebt = (cust.currentBalance || 0) > 0;
                      const isOverLimit =
                        hasDebt &&
                        (cust.maxCreditLimit || 0) > 0 &&
                        cust.currentBalance > cust.maxCreditLimit;
                      const theme = getCustomerColor(cust);

                      return (
                        <tr key={cust.id} className={`${theme.tableRow} transition-colors border-r-4 ${theme.borderAccent.split(' ')[1]}`}>
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs ${theme.avatarBg}`}
                              >
                                {cust.name.charAt(0)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{cust.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${theme.badge}`}>
                                  {theme.nameAr}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2 px-2.5 font-mono text-slate-700">
                            {cust.phone ? (
                              <div className="flex items-center gap-1">
                                <span>{cust.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppDebt(cust)}
                                  className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                  title="إرسال واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                            {cust.address || '-'}
                          </td>

                          <td className="py-2 px-2.5 text-left">
                            {hasDebt ? (
                              <span
                                className={`font-mono font-bold text-xs px-1.5 py-0.2 rounded ${
                                  isOverLimit
                                    ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {formatCurrency(cust.currentBalance)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                خالص
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-2.5 text-left font-mono text-slate-600">
                            {cust.maxCreditLimit && cust.maxCreditLimit > 0
                              ? formatCurrency(cust.maxCreditLimit)
                              : 'مفتوح'}
                          </td>

                          <td className="py-2 px-2.5 text-left font-mono font-medium text-slate-800">
                            {formatCurrency(cust.totalPurchases || 0)}
                          </td>

                          <td className="py-2 px-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickPay(cust)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-0.5 shadow-2xs active:scale-95 cursor-pointer"
                                title="سند قبض فوري"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>قبض</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenAccount(cust)}
                                className="p-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer"
                                title="كشف الحساب"
                              >
                                <FileText className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditCustomer(cust)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                                title="تعديل العميل"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {cust.currentBalance === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(cust)}
                                  className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                  title="حذف العميل"
                                >
                                  <Trash2 className="w-3 h-3" />
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB 2: Debtors Only View (Scrollable Area)            */}
      {/* ======================================================== */}
      {activeSubTab === 'debtors' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="bg-white rounded-lg border border-amber-200 shadow-2xs overflow-hidden">
            <div className="px-2.5 py-1 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-950">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>المدينون ({debtorsList.length})</span>
              </div>
              <div className="text-xs text-amber-900">
                إجمالي الديون:{' '}
                <strong className="font-mono font-black text-amber-800">
                  {formatCurrency(totalDebts)}
                </strong>
              </div>
            </div>

            {/* Mobile Debtors Cards */}
            <div className="sm:hidden divide-y divide-slate-100 p-1 space-y-1">
              {debtorsList.length === 0 ? (
                <div className="py-6 text-center text-emerald-600 font-bold text-xs">
                  🎉 رائع! لا يوجد أي عميل مدين حالياً، كافة الحسابات مصفاة
                </div>
              ) : (
                debtorsList.map((cust) => {
                  const theme = getCustomerColor(cust);
                  return (
                    <div key={cust.id} className={`rounded-xl p-2.5 space-y-1.5 border shadow-2xs ${theme.cardBg} ${theme.borderAccent}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${theme.avatarBg}`}>
                            {cust.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900">{cust.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold mr-1 ${theme.badge}`}>
                              {theme.nameAr}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-amber-700 text-xs bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                          {formatCurrency(cust.currentBalance)}
                        </span>
                      </div>
                      {cust.phone && (
                        <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between bg-slate-50 p-1 rounded">
                          <span>{cust.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppDebt(cust)}
                            className="text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>تذكير واتساب</span>
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPay(cust)}
                          className="py-1 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>سند قبض</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAccount(cust)}
                          className="py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>كشف الحساب</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Debtors Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 px-2.5">اسم العميل</th>
                    <th className="py-1.5 px-2.5">رقم الهاتف</th>
                    <th className="py-1.5 px-2.5 text-left">مبلغ الدين المستحق</th>
                    <th className="py-1.5 px-2.5 text-left">سقف الائتمان</th>
                    <th className="py-1.5 px-2.5 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtorsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-emerald-600 font-bold text-xs">
                        🎉 لا يوجد أي عميل مدين حالياً
                      </td>
                    </tr>
                  ) : (
                    debtorsList.map((cust) => {
                      const theme = getCustomerColor(cust);
                      return (
                        <tr key={cust.id} className={`${theme.tableRow} transition-colors border-r-4 ${theme.borderAccent.split(' ')[1]}`}>
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${theme.avatarBg}`}>
                                {cust.name.charAt(0)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{cust.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${theme.badge}`}>
                                  {theme.nameAr}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-600">{cust.phone || '-'}</td>
                          <td className="py-2 px-2.5 text-left font-mono font-black text-amber-700 text-xs">
                            {formatCurrency(cust.currentBalance)}
                          </td>
                          <td className="py-2 px-2.5 text-left font-mono text-slate-500">
                            {cust.maxCreditLimit && cust.maxCreditLimit > 0 ? formatCurrency(cust.maxCreditLimit) : 'بدون سقف'}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickPay(cust)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-0.5 shadow-2xs active:scale-95 cursor-pointer"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>قبض فوري</span>
                              </button>

                              {cust.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppDebt(cust)}
                                  className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                                  title="إرسال تذكير عبر واتساب"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenAccount(cust)}
                                className="p-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer"
                                title="كشف الحساب"
                              >
                                <FileText className="w-3 h-3" />
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

      {/* ======================================================== */}
      {/* 6. TAB 3: Payment Receipts Log (Scrollable Area)         */}
      {/* ======================================================== */}
      {activeSubTab === 'receipts' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden">
            <div className="px-2.5 py-1 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-1 text-xs font-bold text-teal-900">
                <Receipt className="w-3.5 h-3.5 text-teal-700" />
                <span>سندات القبض المسجلة ({filteredPayments.length})</span>
              </div>
              <div className="text-xs text-slate-700">
                إجمالي المقبوض:{' '}
                <strong className="text-emerald-700 font-mono font-black">
                  {formatCurrency(totalCollectedSum)}
                </strong>
              </div>
            </div>

            {/* Mobile Receipts Cards */}
            <div className="sm:hidden divide-y divide-slate-100 p-1 space-y-1">
              {filteredPayments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">لا توجد سندات قبض مسجلة</div>
              ) : (
                filteredPayments.map((p) => {
                  const cust = customers.find((c) => c.id === p.customerId || c.name === p.customerName);
                  const theme = getCustomerColor(cust || { name: p.customerName });

                  return (
                    <div key={p.id} className={`bg-white rounded p-2 space-y-1.5 border border-slate-200 shadow-2xs ${theme.borderAccent}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${theme.avatarBg}`}>
                            {p.customerName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900">{p.customerName}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold mr-1 ${theme.badge}`}>
                              {theme.nameAr}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-emerald-700 text-xs bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-slate-50 p-1 rounded">
                        <span>#{p.id.slice(-6).toUpperCase()}</span>
                        <span>{p.date}</span>
                        <span>{p.paymentMethod === 'card' ? 'شبكة' : p.paymentMethod === 'bank_transfer' ? 'تحويل' : 'نقداً'}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleReprintPayment(p)}
                          className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>طباعة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p)}
                          className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Receipts Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 px-2.5">رقم السند</th>
                    <th className="py-1.5 px-2.5">تاريخ السند</th>
                    <th className="py-1.5 px-2.5">اسم العميل</th>
                    <th className="py-1.5 px-2.5 text-left">المبلغ المقبوض</th>
                    <th className="py-1.5 px-2.5">طريقة الدفع</th>
                    <th className="py-1.5 px-2.5">البيان / ملاحظات</th>
                    <th className="py-1.5 px-2.5 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        <Receipt className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                        <p className="font-bold text-slate-600 text-xs">لا توجد سندات قبض مسجلة</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const cust = customers.find((c) => c.id === p.customerId || c.name === p.customerName);
                      const theme = getCustomerColor(cust || { name: p.customerName });
                      const methodLabels: Record<string, string> = {
                        cash: 'نقداً',
                        card: 'شبكة',
                        bank_transfer: 'تحويل بنكي',
                      };

                      return (
                        <tr key={p.id} className={`${theme.cardHover} transition-colors border-r-4 ${theme.borderAccent.split(' ')[1]}`}>
                          <td className="py-2 px-2.5 font-mono font-bold text-teal-700">
                            #{p.id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-600">{p.date}</td>
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${theme.avatarBg}`}>
                                {p.customerName.charAt(0)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{p.customerName}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${theme.badge}`}>
                                  {theme.nameAr}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-left font-mono font-black text-emerald-700">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                              {methodLabels[p.paymentMethod] || p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 text-[11px] max-w-xs truncate">
                            {p.notes || '-'}
                          </td>
                          <td className="py-2 px-2.5 text-left">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleReprintPayment(p)}
                                className="p-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer"
                                title="طباعة إيصال السند"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p)}
                                className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                title="إلغاء السند"
                              >
                                <Trash2 className="w-3 h-3" />
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

      {/* ======================================================== */}
      {/* Modals */}
      {/* ======================================================== */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        customer={selectedCustomer}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaved={refreshData}
      />

      <CustomerAccountModal
        isOpen={isAccountModalOpen}
        customer={selectedCustomer}
        onClose={() => setIsAccountModalOpen(false)}
        onSaved={refreshData}
      />

      <QuickPaymentModal
        isOpen={isQuickPayModalOpen}
        initialCustomer={selectedCustomer}
        onClose={() => setIsQuickPayModalOpen(false)}
        onSaved={refreshData}
      />
    </div>
  );
};
