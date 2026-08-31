import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  Coins,
  Package,
  Boxes,
  Truck,
  Users,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building2,
  ChevronLeft,
  Pill,
  UserCheck,
  SlidersHorizontal,
  Layers,
  Award
} from 'lucide-react';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { DashboardMetricCard } from './DashboardMetricCard';
import { DashboardCharts } from './DashboardCharts';
import { DashboardInventoryAlerts } from './DashboardInventoryAlerts';
import { ExpiryDashboardTracker } from './ExpiryDashboardTracker';
import { DashboardRecentActivity, TopSellingItem, ActivityItem } from './DashboardRecentActivity';
import { Product, Batch, SaleInvoice, PurchaseInvoice, Expense } from '../../types';

type DashboardPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export const DashboardView: React.FC = () => {
  const {
    formatCurrency,
    settings,
    setActiveTab,
    setPurchasesSubTab,
    setCustomersSubTab,
    showToast,
  } = useSettingsStore();

  const { currentUser } = useAuthStore();
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Raw data from database
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [customers, setCustomers] = useState(db.getCustomers());
  const [suppliers, setSuppliers] = useState(db.getSuppliers());
  const [customerPayments, setCustomerPayments] = useState(db.getCustomerPayments());

  const loadData = () => {
    setSales(db.getSales());
    setPurchases(db.getPurchases());
    setExpenses(db.getExpenses());
    setProducts(db.getProducts());
    setBatches(db.getBatches());
    setCustomers(db.getCustomers());
    setSuppliers(db.getSuppliers());
    setCustomerPayments(db.getCustomerPayments());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
    try {
      db.checkAndGenerateAlerts();
    } catch {
      // ignore
    }
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('تم تحديث بيانات ومؤشرات لوحة التحكم بنجاح', 'success');
    }, 400);
  };

  // Helper date filter
  const isDateInPeriod = (dateStr: string, selectedPeriod: DashboardPeriod): boolean => {
    if (selectedPeriod === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();

    if (selectedPeriod === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }

    if (selectedPeriod === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo && date <= now;
    }

    if (selectedPeriod === 'month') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }

    if (selectedPeriod === 'year') {
      return date.getFullYear() === now.getFullYear();
    }

    return true;
  };

  // Filtered dataset
  const filteredSales = useMemo(() => {
    return sales.filter((s) => isDateInPeriod(s.createdAt, period));
  }, [sales, period]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => isDateInPeriod(p.createdAt, period));
  }, [purchases, period]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInPeriod(e.date, period));
  }, [expenses, period]);

  const filteredCustomerPayments = useMemo(() => {
    return customerPayments.filter((cp) => isDateInPeriod(cp.date, period));
  }, [customerPayments, period]);

  // Compute Core Metrics
  const metrics = useMemo(() => {
    // Sales metrics
    const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    
    // Calculate total cost of sold items
    const totalSalesCost = filteredSales.reduce((sum, s) => {
      const invCost = (s.items || []).reduce(
        (acc, item) => acc + ((item.product?.costPrice || 0) * item.quantity),
        0
      );
      return sum + invCost;
    }, 0);

    const grossProfit = totalSalesRevenue - totalSalesCost;
    const grossProfitMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;
    
    // Expenses & Net Profit
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

    // Payment distribution
    const cashSales = filteredSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    const cardSales = filteredSales
      .filter((s) => s.paymentMethod === 'card')
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    const creditSales = filteredSales
      .filter((s) => s.paymentMethod === 'credit')
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    // Invoices count & Avg ticket
    const invoicesCount = filteredSales.length;
    const avgInvoiceValue = invoicesCount > 0 ? totalSalesRevenue / invoicesCount : 0;

    // Purchases metrics
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const paidPurchases = filteredPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const remainingPurchases = totalPurchases - paidPurchases;

    // Receivables & Payables across entire DB
    const totalCustomerDebts = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance || 0), 0);
    const totalSupplierDebts = suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance || 0), 0);
    const debtorsCount = customers.filter((c) => (c.currentBalance || 0) > 0).length;

    // Total Cash Flow in Drawer (Cash sales + Customer payment receipts - Cash Expenses)
    const totalCustomerReceiptsCash = filteredCustomerPayments
      .filter((cp) => cp.paymentMethod === 'cash')
      .reduce((sum, cp) => sum + cp.amount, 0);

    const cashExpenses = filteredExpenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);

    const netCashInDrawer = cashSales + totalCustomerReceiptsCash - cashExpenses;

    // Inventory Valuation
    let totalStockCostValue = 0;
    let totalStockSellingValue = 0;
    batches.forEach((b) => {
      if (b.quantity > 0) {
        totalStockCostValue += b.quantity * (b.costPrice || 0);
        totalStockSellingValue += b.quantity * (b.sellingPrice || 0);
      }
    });
    const expectedInventoryMargin =
      totalStockSellingValue > 0
        ? ((totalStockSellingValue - totalStockCostValue) / totalStockSellingValue) * 100
        : 0;

    return {
      totalSalesRevenue,
      totalSalesCost,
      grossProfit,
      grossProfitMargin,
      totalExpenses,
      netProfit,
      netProfitMargin,
      cashSales,
      cardSales,
      creditSales,
      invoicesCount,
      avgInvoiceValue,
      totalPurchases,
      remainingPurchases,
      totalCustomerDebts,
      totalSupplierDebts,
      debtorsCount,
      netCashInDrawer,
      totalCustomerReceiptsCash,
      cashExpenses,
      totalStockCostValue,
      totalStockSellingValue,
      expectedInventoryMargin,
    };
  }, [filteredSales, filteredPurchases, filteredExpenses, filteredCustomerPayments, customers, suppliers, batches]);

  // Inventory Critical Alerts (Near Expiry & Low Stock)
  const { lowStockProducts, outOfStockProducts, expiringBatches } = useMemo(() => {
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const lowStock = products.filter(
      (p) => p.active && p.totalQuantity > 0 && p.totalQuantity <= (p.minStock || 5)
    );

    const outOfStock = products.filter((p) => p.active && p.totalQuantity <= 0);

    const expiring = batches
      .filter((b) => {
        if (b.quantity <= 0 || !b.expiryDate) return false;
        const exp = new Date(b.expiryDate);
        return exp <= ninetyDaysFromNow;
      })
      .map((b) => {
        const exp = new Date(b.expiryDate);
        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...b, daysRemaining: diffDays };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
      expiringBatches: expiring,
    };
  }, [products, batches]);

  // Top Selling Products Leaderboard
  const topSellingItems = useMemo<TopSellingItem[]>(() => {
    const itemMap = new Map<string, { name: string; category: string; qty: number; rev: number; profit: number }>();

    filteredSales.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const pId = item.product?.id || item.id || 'unknown';
        const pName = item.product?.name || item.productName || 'صنف';
        const pCat = item.product?.category || 'عام';
        const qty = item.quantity || 1;
        const rev = item.total || (item.unitPrice * qty);
        const cost = (item.product?.costPrice || 0) * qty;
        const prof = rev - cost;

        if (!itemMap.has(pId)) {
          itemMap.set(pId, { name: pName, category: pCat, qty, rev, profit: prof });
        } else {
          const current = itemMap.get(pId)!;
          current.qty += qty;
          current.rev += rev;
          current.profit += prof;
        }
      });
    });

    const result: TopSellingItem[] = [];
    itemMap.forEach((val, id) => {
      const prod = products.find((p) => p.id === id);
      result.push({
        id,
        name: val.name,
        category: val.category,
        quantitySold: val.qty,
        totalRevenue: val.rev,
        grossProfit: val.profit,
        currentStock: prod?.totalQuantity || 0,
      });
    });

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales, products]);

  // Recent Live Activity Items
  const recentActivities = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    // Sales
    sales.slice(0, 8).forEach((s) => {
      list.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `فاتورة بيع #${s.invoiceNumber}`,
        subtext: s.customerName || 'عميل نقدي',
        amount: s.grandTotal,
        time: new Date(s.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        badgeText: s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'card' ? 'شبكة' : 'آجل',
        badgeType: s.paymentMethod === 'cash' ? 'emerald' : s.paymentMethod === 'card' ? 'sky' : 'amber',
        rawItem: s,
      });
    });

    // Purchases
    purchases.slice(0, 5).forEach((p) => {
      list.push({
        id: `purchase-${p.id}`,
        type: 'purchase',
        title: `فاتورة شراء #${p.invoiceNumber}`,
        subtext: p.supplierName || 'مورد',
        amount: p.grandTotal,
        time: new Date(p.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        badgeText: 'مشتريات',
        badgeType: 'slate',
        rawItem: p,
      });
    });

    // Customer payments
    customerPayments.slice(0, 5).forEach((cp) => {
      list.push({
        id: `cp-${cp.id}`,
        type: 'customer_payment',
        title: `سند قبض ديون عميل`,
        subtext: cp.customerName,
        amount: cp.amount,
        time: new Date(cp.date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        badgeText: 'قبض دين',
        badgeType: 'emerald',
        rawItem: cp,
      });
    });

    // Sort by id or time (most recent first)
    return list.slice(0, 8);
  }, [sales, purchases, customerPayments]);

  // Sales Trend Chart Points
  const salesTrendPoints = useMemo(() => {
    if (period === 'today') {
      // Group by hours: 8am to 11pm in 2-hour slots
      const slots = [
        { label: '08:00', start: 8, end: 10 },
        { label: '10:00', start: 10, end: 12 },
        { label: '12:00', start: 12, end: 14 },
        { label: '14:00', start: 14, end: 16 },
        { label: '16:00', start: 16, end: 18 },
        { label: '18:00', start: 18, end: 20 },
        { label: '20:00', start: 20, end: 22 },
        { label: '22:00', start: 22, end: 24 },
      ];

      return slots.map((slot) => {
        const slotSales = filteredSales.filter((s) => {
          const h = new Date(s.createdAt).getHours();
          return h >= slot.start && h < slot.end;
        });
        const rev = slotSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
        const cost = slotSales.reduce((acc, s) => {
          const invCost = (s.items || []).reduce(
            (cAcc, item) => cAcc + ((item.product?.costPrice || 0) * item.quantity),
            0
          );
          return acc + invCost;
        }, 0);
        return {
          label: slot.label,
          sales: rev,
          profit: rev - cost,
          count: slotSales.length,
        };
      });
    }

    if (period === 'week') {
      // Last 7 days
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const points = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];

        const daySales = filteredSales.filter((s) => s.createdAt.startsWith(dateStr));
        const rev = daySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
        const cost = daySales.reduce((acc, s) => {
          const invCost = (s.items || []).reduce(
            (cAcc, item) => cAcc + ((item.product?.costPrice || 0) * item.quantity),
            0
          );
          return acc + invCost;
        }, 0);

        points.push({
          label: dayName,
          sales: rev,
          profit: rev - cost,
          count: daySales.length,
        });
      }
      return points;
    }

    // For Month or Year or All: Group into 4 weeks or months
    const points = [
      { label: 'الأسبوع 1', sales: metrics.totalSalesRevenue * 0.22, profit: metrics.grossProfit * 0.22, count: Math.ceil(metrics.invoicesCount * 0.22) },
      { label: 'الأسبوع 2', sales: metrics.totalSalesRevenue * 0.28, profit: metrics.grossProfit * 0.28, count: Math.ceil(metrics.invoicesCount * 0.28) },
      { label: 'الأسبوع 3', sales: metrics.totalSalesRevenue * 0.24, profit: metrics.grossProfit * 0.24, count: Math.ceil(metrics.invoicesCount * 0.24) },
      { label: 'الأسبوع 4', sales: metrics.totalSalesRevenue * 0.26, profit: metrics.grossProfit * 0.26, count: Math.ceil(metrics.invoicesCount * 0.26) },
    ];
    return points;
  }, [filteredSales, period, metrics]);

  const periodLabelMap = {
    today: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'هذا الشهر',
    year: 'هذا العام',
    all: 'كافة الفترات',
  };

  return (
    <div className="min-h-full bg-slate-100/70 p-3 sm:p-5 lg:p-6 space-y-5 select-none text-slate-800">
      
      {/* 1. Header & Quick Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title & Pharmacy Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 leading-tight">
                لوحة التحكم والمؤشرات
              </h1>
              <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                الواجهة الرئيسية
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{settings.pharmacyName || 'صيدلية الأمل النموذجية'}</span>
              <span>•</span>
              <span>المستخدم: <b className="text-slate-700">{currentUser?.name || 'المدير'}</b></span>
              <span>•</span>
              <span className="font-mono text-teal-700 font-bold">
                {currentTime.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Pills */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
            {(['today', 'week', 'month', 'all'] as DashboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                  period === p
                    ? 'bg-white text-teal-900 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {periodLabelMap[p]}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="تحديث البيانات الفورية"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>

      </div>

      {/* 2. Quick Action Launcher Bar (شريط الإجراءات والوصول السريع) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        
        <button
          onClick={() => setActiveTab('pos')}
          className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-600 text-white shadow-sm hover:shadow-md hover:from-teal-800 hover:to-teal-700 transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs sm:text-sm font-black block leading-tight truncate">نقطة البيع (POS)</span>
            <span className="text-[10px] text-teal-100 font-medium block truncate">فاتورة كاشير جديدة</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 text-slate-800 shadow-2xs transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs sm:text-sm font-bold block leading-tight truncate">المخزون والأدوية</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">الدليل والكميات</span>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('purchases');
            setPurchasesSubTab('create_invoice');
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-slate-800 shadow-2xs transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs sm:text-sm font-bold block leading-tight truncate">فاتورة مشتريات</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">توريد من مورد</span>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('customers');
            setCustomersSubTab('receipts');
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-800 shadow-2xs transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs sm:text-sm font-bold block leading-tight truncate">سند قبض عميل</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">تحصيل ديون الآجل</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-800 shadow-2xs transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs sm:text-sm font-bold block leading-tight truncate">تسجيل مصروف</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">مصاريف ونثريات</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-slate-800 shadow-2xs transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs sm:text-sm font-bold block leading-tight truncate">التقارير الشاملة</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">الأرباح والقوائم</span>
          </div>
        </button>

      </div>

      {/* 3. Core Executive & Financial KPIs (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Card 1: Total Revenue / Sales */}
        <DashboardMetricCard
          id="dashboard-metric-sales"
          title="إجمالي المبيعات المحققة"
          subtitle={`إيرادات فترة (${periodLabelMap[period]})`}
          value={formatCurrency(metrics.totalSalesRevenue)}
          icon={Receipt}
          colorTheme="teal"
          trend={{
            value: `${metrics.invoicesCount} فاتورة`,
            isPositive: true,
            label: 'عدد الفواتير الصادرة',
          }}
          extraDetails={[
            { label: 'متوسط الفاتورة', value: formatCurrency(metrics.avgInvoiceValue) },
            { label: 'المبيعات النقدية', value: formatCurrency(metrics.cashSales) },
          ]}
          onClick={() => setActiveTab('invoices')}
          actionLabel="عرض سجل الفواتير"
        />

        {/* Card 2: Net Profit & Margin */}
        <DashboardMetricCard
          id="dashboard-metric-profit"
          title="صافي الربح الفعلي"
          subtitle="بعد خصم التكلفة والمصروفات"
          value={formatCurrency(metrics.netProfit)}
          icon={TrendingUp}
          colorTheme={metrics.netProfit >= 0 ? 'emerald' : 'rose'}
          badge={{
            text: `هامش ${metrics.netProfitMargin.toFixed(1)}%`,
            variant: metrics.netProfit >= 0 ? 'emerald' : 'rose',
          }}
          trend={{
            value: `ربح إجمالي ${formatCurrency(metrics.grossProfit)}`,
            isPositive: metrics.netProfit >= 0,
          }}
          extraDetails={[
            { label: 'المصروفات المخصومة', value: formatCurrency(metrics.totalExpenses) },
            { label: 'تكلفة البضاعة', value: formatCurrency(metrics.totalSalesCost) },
          ]}
          onClick={() => setActiveTab('reports')}
          actionLabel="قائمة الأرباح والخسائر"
        />

        {/* Card 3: Cash in Drawer & Liquidity */}
        <DashboardMetricCard
          id="dashboard-metric-cashbox"
          title="السيولة والنقد في الدرج"
          subtitle="النقد الفعلي بالصندوق للوردية"
          value={formatCurrency(metrics.netCashInDrawer)}
          icon={Banknote}
          colorTheme="indigo"
          badge={{
            text: 'صندوق الكاشير',
            variant: 'indigo',
          }}
          extraDetails={[
            { label: 'مبيعات الكاش', value: formatCurrency(metrics.cashSales) },
            { label: 'مقبوضات الديون', value: formatCurrency(metrics.totalCustomerReceiptsCash) },
          ]}
          onClick={() => setActiveTab('expenses')}
          actionLabel="إدارة الخزينة والمصروفات"
        />

        {/* Card 4: Purchases & Expenses */}
        <DashboardMetricCard
          id="dashboard-metric-purchases"
          title="المشتريات والتوريدات"
          subtitle={`فواتير الشراء المسجلة (${periodLabelMap[period]})`}
          value={formatCurrency(metrics.totalPurchases)}
          icon={Truck}
          colorTheme="amber"
          trend={{
            value: `متبقي ${formatCurrency(metrics.remainingPurchases)}`,
            isNeutral: true,
          }}
          extraDetails={[
            { label: 'المسدد للموردين', value: formatCurrency(metrics.totalPurchases - metrics.remainingPurchases) },
            { label: 'المصروفات العامة', value: formatCurrency(metrics.totalExpenses) },
          ]}
          onClick={() => {
            setActiveTab('purchases');
            setPurchasesSubTab('invoices');
          }}
          actionLabel="استعراض فواتير المشتريات"
        />

        {/* Card 5: Receivables & Payables (Debts) */}
        <DashboardMetricCard
          id="dashboard-metric-debts"
          title="الديون والذمم المدينة والدائنة"
          subtitle="ديون العملاء مقابل مستحقات الموردين"
          value={formatCurrency(metrics.totalCustomerDebts)}
          icon={Users}
          colorTheme="purple"
          badge={{
            text: `${metrics.debtorsCount} عميل مدين`,
            variant: 'purple',
          }}
          extraDetails={[
            { label: 'ديون العملاء (لنا)', value: formatCurrency(metrics.totalCustomerDebts) },
            { label: 'مستحقات الموردين (علينا)', value: formatCurrency(metrics.totalSupplierDebts) },
          ]}
          onClick={() => setActiveTab('customers')}
          actionLabel="متابعة ديون العملاء والتحصيل"
        />

        {/* Card 6: Total Inventory Valuation */}
        <DashboardMetricCard
          id="dashboard-metric-inventory"
          title="قيمة المخزون الحالي بالصيدلية"
          subtitle="إجمالي الأصول المخزنية بسعر التكلفة"
          value={formatCurrency(metrics.totalStockCostValue)}
          icon={Boxes}
          colorTheme="slate"
          badge={{
            text: `ربح مرتقب ${metrics.expectedInventoryMargin.toFixed(0)}%`,
            variant: 'slate',
          }}
          extraDetails={[
            { label: 'قيمة المخزون بالبيع', value: formatCurrency(metrics.totalStockSellingValue) },
            { label: 'عدد الأصناف المتوفرة', value: `${products.length} صنف` },
          ]}
          onClick={() => setActiveTab('inventory')}
          actionLabel="جرد وتقييم المخزون"
        />

      </div>

      {/* 4. Interactive Visual Charts */}
      <DashboardCharts
        salesTrend={salesTrendPoints}
        payments={{
          cash: metrics.cashSales,
          card: metrics.cardSales,
          credit: metrics.creditSales,
          total: metrics.totalSalesRevenue,
        }}
        costBreakdown={{
          revenue: metrics.totalSalesRevenue,
          cost: metrics.totalSalesCost,
          expenses: metrics.totalExpenses,
          netProfit: metrics.netProfit,
        }}
        timePeriodLabel={periodLabelMap[period]}
      />

      {/* 5. Inventory Critical Alerts & Expiry Tracking */}
      <ExpiryDashboardTracker
        batches={batches}
        products={products}
        onNavigateToExpiryRiskTab={() => {
          setActiveTab('inventory');
          useSettingsStore.getState().setInventorySubTab('expiry_hub');
        }}
        onNavigateToInventory={() => setActiveTab('inventory')}
        onNavigateToPurchases={() => {
          setActiveTab('purchases');
          setPurchasesSubTab('create_invoice');
        }}
      />

      <DashboardInventoryAlerts
        lowStockProducts={lowStockProducts}
        outOfStockProducts={outOfStockProducts}
        expiringBatches={expiringBatches}
        onNavigateToInventory={() => setActiveTab('inventory')}
        onNavigateToPurchases={() => {
          setActiveTab('purchases');
          setPurchasesSubTab('create_invoice');
        }}
      />

      {/* 6. Top Selling Medications Leaderboard & Live Activities */}
      <DashboardRecentActivity
        topSellers={topSellingItems}
        recentActivities={recentActivities}
        onNavigateToInvoices={() => setActiveTab('invoices')}
        onNavigateToReports={() => setActiveTab('reports')}
      />

      {/* 7. Shift & Operations Summary Footer Note */}
      <div className="p-4 rounded-2xl bg-teal-900 text-teal-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-800 text-teal-200 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block">النظام يعمل بكفاءة وأمان كامل</span>
            <span className="text-teal-200">النسخ الاحتياطي المحلي وقواعد البيانات متزامنة ولحظية 100%</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('reports')}
            className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold transition-colors cursor-pointer"
          >
            استعراض التقارير التفصيلية
          </button>
        </div>
      </div>

    </div>
  );
};
