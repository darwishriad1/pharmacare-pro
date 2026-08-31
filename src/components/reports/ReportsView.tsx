import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Printer,
  PieChart,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Coins,
  Receipt,
  CreditCard,
  Banknote,
  Users,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Building2,
  ShoppingCart,
  Percent,
  Sparkles,
  Search,
  Filter,
  Boxes,
} from 'lucide-react';
import { db } from '../../database/db';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';
import { ReportCatalogModal } from './ReportCatalogModal';
import { ComprehensiveReportPrintModal } from './ComprehensiveReportPrintModal';
import { ItemMovementReportTab } from './ItemMovementReportTab';
import { FullScreenReportModal } from './FullScreenReportModal';

type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';
type ReportTabType = 'item_movements' | 'pnl' | 'bestsellers' | 'shift' | 'purchases_debts' | 'customer_debts' | 'expiryloss' | 'expenses';
type ReportCategory = 'all' | 'financial' | 'inventory' | 'treasury' | 'debts';

export const ReportsView: React.FC = () => {
  const { formatCurrency, settings, setActiveTab, setPurchasesSubTab, setCustomersSubTab, showToast } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [activeReportTab, setActiveReportTab] = useState<ReportTabType>('item_movements');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [bestSellersSort, setBestSellersSort] = useState<'revenue' | 'profit' | 'qty'>('revenue');
  const [productSearch, setProductSearch] = useState('');

  // Keyboard shortcut (Escape) to close full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreenOpen) {
        setIsFullScreenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreenOpen]);

  // Primary stats calculated from DB
  const [stats, setStats] = useState({
    salesTotal: 0,
    costTotal: 0,
    grossProfit: 0,
    grossMargin: 0,
    expensesTotal: 0,
    netProfit: 0,
    netMargin: 0,
    invoicesCount: 0,
    itemsSoldCount: 0,
    averageInvoiceValue: 0,
    cashSales: 0,
    cardSales: 0,
    creditSales: 0,
    purchasesTotal: 0,
    purchasesPaid: 0,
    purchasesRemaining: 0,
    supplierDebtsTotal: 0,
    customerDebtsTotal: 0,
    debtorsCount: 0,
    indebtedSuppliersCount: 0,
    bestSellers: [] as Array<{ id: string; name: string; category: string; qty: number; revenue: number; profit: number; margin: number }>,
    nearExpiryLoss: 0,
    nearExpiryCount: 0,
    totalStockCost: 0,
    expenseCategories: [] as Array<{ category: string; amount: number; count: number }>,
  });

  // Comparative Snapshots (Daily, Weekly estimate, Monthly estimate)
  const [snapshots, setSnapshots] = useState({
    todaySales: 0,
    todayProfit: 0,
    todayInvoices: 0,
    weekSales: 0,
    weekProfit: 0,
    weekEstimate: 0,
    weekDailyAvg: 0,
    monthSales: 0,
    monthProfit: 0,
    monthEstimate: 0,
    monthDailyAvg: 0,
  });

  const calculateReportData = () => {
    const allSales = db.getSales().filter((s) => s.status !== 'returned');
    const allExpenses = db.getExpenses();
    const allPurchases = db.getPurchaseInvoices();
    const allSuppliers = db.getSuppliers();
    const allCustomers = db.getCustomers();
    const allBatches = db.getBatches();
    const allProducts = db.getProducts();

    const todayStr = new Date().toISOString().split('T')[0];

    // Filter by active dateRange
    let filteredSales = allSales;
    let filteredExpenses = allExpenses;
    let filteredPurchases = allPurchases;

    if (dateRange === 'today') {
      filteredSales = allSales.filter((s) => s.date === todayStr);
      filteredExpenses = allExpenses.filter((e) => e.date === todayStr);
      filteredPurchases = allPurchases.filter((p) => p.date === todayStr);
    } else if (dateRange === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const minDate = lastWeek.toISOString().split('T')[0];
      filteredSales = allSales.filter((s) => s.date >= minDate);
      filteredExpenses = allExpenses.filter((e) => e.date >= minDate);
      filteredPurchases = allPurchases.filter((p) => p.date >= minDate);
    } else if (dateRange === 'month') {
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      const minDate = lastMonth.toISOString().split('T')[0];
      filteredSales = allSales.filter((s) => s.date >= minDate);
      filteredExpenses = allExpenses.filter((e) => e.date >= minDate);
      filteredPurchases = allPurchases.filter((p) => p.date >= minDate);
    } else if (dateRange === 'custom') {
      filteredSales = allSales.filter((s) => s.date >= customStartDate && s.date <= customEndDate);
      filteredExpenses = allExpenses.filter((e) => e.date >= customStartDate && e.date <= customEndDate);
      filteredPurchases = allPurchases.filter((p) => p.date >= customStartDate && p.date <= customEndDate);
    }

    const salesTotal = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const expensesTotal = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const purchasesTotal = filteredPurchases.reduce((acc, p) => acc + (p.grandTotal || p.totalAmount || 0), 0);
    const purchasesPaid = filteredPurchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    const purchasesRemaining = purchasesTotal - purchasesPaid;

    // Calculate COGS and Product Analytics
    const productStats: { [id: string]: { name: string; category: string; qty: number; revenue: number; profit: number } } = {};
    let totalCostOfGoodsSold = 0;
    let totalUnitsSold = 0;

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const prod = allProducts.find((p) => p.id === item.product.id);
        const pkgQty = item.quantity * (item.unitMultiplier || 1);
        const itemCost = (prod?.costPrice || item.product.costPrice || item.unitPrice * 0.7) * pkgQty;
        const itemRevenue = item.total;
        const itemProfit = itemRevenue - itemCost;

        totalCostOfGoodsSold += itemCost;
        totalUnitsSold += item.quantity;

        const prodId = item.product.id || item.product.name;
        if (!productStats[prodId]) {
          productStats[prodId] = {
            name: item.product.name,
            category: item.product.category || 'أدوية عامة',
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productStats[prodId].qty += item.quantity;
        productStats[prodId].revenue += itemRevenue;
        productStats[prodId].profit += itemProfit;
      });
    });

    const bestSellersList = Object.entries(productStats).map(([id, data]) => ({
      id,
      ...data,
      margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0,
    }));

    const grossProfit = salesTotal - totalCostOfGoodsSold;
    const netProfit = grossProfit - expensesTotal;
    const grossMargin = salesTotal > 0 ? Math.round((grossProfit / salesTotal) * 100) : 0;
    const netMargin = salesTotal > 0 ? Math.round((netProfit / salesTotal) * 100) : 0;

    const cashSales = filteredSales.filter((s) => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.grandTotal, 0);
    const cardSales = filteredSales.filter((s) => s.paymentMethod === 'card').reduce((acc, s) => acc + s.grandTotal, 0);
    const creditSales = filteredSales.filter((s) => s.paymentMethod === 'credit').reduce((acc, s) => acc + s.grandTotal, 0);

    // Supplier & Customer Debts
    const supplierDebtsTotal = allSuppliers.reduce((acc, s) => acc + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
    const indebtedSuppliersCount = allSuppliers.filter((s) => s.currentBalance > 0).length;
    const customerDebtsTotal = allCustomers.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const debtorsCount = allCustomers.filter((c) => c.currentBalance > 0).length;

    // Expiry & Inventory Risk
    const now = new Date();
    const date90 = new Date();
    date90.setDate(now.getDate() + 90);
    const nearExpiryBatches = allBatches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return exp <= date90 && b.quantity > 0;
    });
    const nearExpiryLoss = nearExpiryBatches.reduce((acc, b) => acc + b.costPrice * b.quantity, 0);
    const totalStockCost = allBatches.reduce((acc, b) => acc + (b.quantity > 0 ? b.costPrice * b.quantity : 0), 0);

    // Expense Categories Breakdown
    const expCatMap: { [cat: string]: { amount: number; count: number } } = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'نثريات ومصاريف عامة';
      if (!expCatMap[cat]) expCatMap[cat] = { amount: 0, count: 0 };
      expCatMap[cat].amount += e.amount;
      expCatMap[cat].count += 1;
    });
    const expenseCategories = Object.entries(expCatMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);

    setStats({
      salesTotal,
      costTotal: totalCostOfGoodsSold,
      grossProfit,
      grossMargin,
      expensesTotal,
      netProfit,
      netMargin,
      invoicesCount: filteredSales.length,
      itemsSoldCount: totalUnitsSold,
      averageInvoiceValue: filteredSales.length > 0 ? Math.round(salesTotal / filteredSales.length) : 0,
      cashSales,
      cardSales,
      creditSales,
      purchasesTotal,
      purchasesPaid,
      purchasesRemaining,
      supplierDebtsTotal,
      customerDebtsTotal,
      debtorsCount,
      indebtedSuppliersCount,
      bestSellers: bestSellersList,
      nearExpiryLoss,
      nearExpiryCount: nearExpiryBatches.length,
      totalStockCost,
      expenseCategories,
    });

    // Compute Comparative Snapshots (Today vs 7-days vs 30-days)
    const todaySalesData = allSales.filter((s) => s.date === todayStr);
    const todayExpensesData = allExpenses.filter((e) => e.date === todayStr);
    const todaySales = todaySalesData.reduce((acc, s) => acc + s.grandTotal, 0);
    const todayExp = todayExpensesData.reduce((acc, e) => acc + e.amount, 0);
    const todayProfit = todaySales * 0.25 - todayExp; // Estimated daily net

    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const min7 = d7.toISOString().split('T')[0];
    const weekSalesData = allSales.filter((s) => s.date >= min7);
    const weekExpData = allExpenses.filter((e) => e.date >= min7);
    const weekSales = weekSalesData.reduce((acc, s) => acc + s.grandTotal, 0);
    const weekExp = weekExpData.reduce((acc, e) => acc + e.amount, 0);
    const weekProfit = weekSales * 0.25 - weekExp;
    const weekDailyAvg = Math.round(weekSales / 7);
    const weekEstimate = weekDailyAvg * 7; // Weekly projected run-rate

    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const min30 = d30.toISOString().split('T')[0];
    const monthSalesData = allSales.filter((s) => s.date >= min30);
    const monthExpData = allExpenses.filter((e) => e.date >= min30);
    const monthSales = monthSalesData.reduce((acc, s) => acc + s.grandTotal, 0);
    const monthExp = monthExpData.reduce((acc, e) => acc + e.amount, 0);
    const monthProfit = monthSales * 0.25 - monthExp;
    const monthDailyAvg = Math.round(monthSales / 30);
    const monthEstimate = monthDailyAvg * 30; // Monthly projected run-rate

    setSnapshots({
      todaySales,
      todayProfit: Math.round(todayProfit),
      todayInvoices: todaySalesData.length,
      weekSales,
      weekProfit: Math.round(weekProfit),
      weekEstimate,
      weekDailyAvg,
      monthSales,
      monthProfit: Math.round(monthProfit),
      monthEstimate,
      monthDailyAvg,
    });
  };

  useEffect(() => {
    calculateReportData();
    const unsub = db.subscribe(calculateReportData);
    return unsub;
  }, [dateRange, customStartDate, customEndDate]);

  // Period title and range text for printing / exporting
  const periodTitle = useMemo(() => {
    switch (dateRange) {
      case 'today':
        return 'التقرير المالي اليومي وتقفيل الوردية';
      case 'week':
        return 'التقرير والتقدير الأسبوعي للصيدلية';
      case 'month':
        return 'التقرير المالي الشهري الشامل';
      case 'custom':
        return `تقرير الفترة المخصصة (${customStartDate} إلى ${customEndDate})`;
      case 'all':
        return 'التقرير المالي التراكمي الشامل';
    }
  }, [dateRange, customStartDate, customEndDate]);

  const dateRangeStr = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateRange === 'today') return today;
    if (dateRange === 'week') return 'آخر 7 أيام';
    if (dateRange === 'month') return 'آخر 30 يوماً';
    if (dateRange === 'custom') return `${customStartDate} إلى ${customEndDate}`;
    return 'كافة الحركات المسجلة';
  }, [dateRange, customStartDate, customEndDate]);

  // Sorted and filtered best sellers
  const sortedBestSellers = useMemo(() => {
    let list = [...stats.bestSellers];
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
    }
    if (bestSellersSort === 'revenue') {
      list.sort((a, b) => b.revenue - a.revenue);
    } else if (bestSellersSort === 'profit') {
      list.sort((a, b) => b.profit - a.profit);
    } else if (bestSellersSort === 'qty') {
      list.sort((a, b) => b.qty - a.qty);
    }
    return list;
  }, [stats.bestSellers, bestSellersSort, productSearch]);

  const handleExportCSV = () => {
    excelService.exportFinancialReportToCSV({
      periodTitle,
      dateRangeStr,
      salesTotal: stats.salesTotal,
      costTotal: stats.costTotal,
      grossProfit: stats.grossProfit,
      grossMargin: stats.grossMargin,
      expensesTotal: stats.expensesTotal,
      netProfit: stats.netProfit,
      netMargin: stats.netMargin,
      invoicesCount: stats.invoicesCount,
      itemsSoldCount: stats.itemsSoldCount,
      cashSales: stats.cashSales,
      cardSales: stats.cardSales,
      creditSales: stats.creditSales,
      purchasesTotal: stats.purchasesTotal,
      supplierDebtsTotal: stats.supplierDebtsTotal,
      customerDebtsTotal: stats.customerDebtsTotal,
    });
    showToast('تم تصدير التقرير بنجاح إلى ملف إكسل CSV', 'success');
  };

  // Define the 8 report application modules for the Top App Grid Launcher
  const reportTiles = useMemo(() => [
    {
      id: 'item_movements' as ReportTabType,
      title: 'حركة الأصناف والأرباح',
      shortTitle: 'حركة الأصناف',
      subtitle: 'الوارد والمباع وهوامش ربح كل صنف',
      category: 'inventory' as ReportCategory,
      categoryName: 'المخزون والأصناف',
      icon: Boxes,
      color: {
        bg: 'from-emerald-500 to-teal-600',
        lightBg: 'bg-emerald-50/70 hover:bg-emerald-100/80',
        activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-emerald-300',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
        text: 'text-emerald-950',
      },
      metricLabel: 'المبيعات',
      metricValue: `${stats.itemsSoldCount} قطعة`,
      badgeText: 'تحليل الوارد والمباع',
    },
    {
      id: 'pnl' as ReportTabType,
      title: 'قائمة الأرباح والخسائر',
      shortTitle: 'الأرباح والخسائر',
      subtitle: 'صافي الدخل وهامش الربح الحقيقي',
      category: 'financial' as ReportCategory,
      categoryName: 'المالية والأرباح',
      icon: TrendingUp,
      color: {
        bg: 'from-teal-500 to-teal-700',
        lightBg: 'bg-teal-50/70 hover:bg-teal-100/80',
        activeBorder: 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-teal-300',
        badge: 'bg-teal-100 text-teal-800 border-teal-200',
        iconBg: 'bg-teal-600 text-white shadow-teal-600/30',
        text: 'text-teal-950',
      },
      metricLabel: 'صافي الربح',
      metricValue: formatCurrency(stats.netProfit),
      badgeText: `${stats.netMargin}% هامش صافي`,
    },
    {
      id: 'bestsellers' as ReportTabType,
      title: 'الأكثر مبيعاً وربحية',
      shortTitle: 'الأعلى مبيعاً',
      subtitle: 'ترتيب الأصناف بالدخل والربح والكمية',
      category: 'inventory' as ReportCategory,
      categoryName: 'المخزون والأصناف',
      icon: Award,
      color: {
        bg: 'from-amber-500 to-orange-600',
        lightBg: 'bg-amber-50/70 hover:bg-amber-100/80',
        activeBorder: 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-amber-300',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        iconBg: 'bg-amber-500 text-white shadow-amber-500/30',
        text: 'text-amber-950',
      },
      metricLabel: 'الأصناف الرائدة',
      metricValue: `${stats.bestSellers.length} صنف`,
      badgeText: 'تحليل ABC',
    },
    {
      id: 'shift' as ReportTabType,
      title: 'الخزينة وتقفيل الوردية',
      shortTitle: 'الخزينة والوردية',
      subtitle: 'حركة الصندوق والنقد والشبكة والمطابقة',
      category: 'treasury' as ReportCategory,
      categoryName: 'الخزينة والنقد',
      icon: Receipt,
      color: {
        bg: 'from-indigo-500 to-blue-600',
        lightBg: 'bg-indigo-50/70 hover:bg-indigo-100/80',
        activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-indigo-300',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
        text: 'text-indigo-950',
      },
      metricLabel: 'كاش وشبكة',
      metricValue: formatCurrency(stats.cashSales + stats.cardSales),
      badgeText: 'مطابقة الصندوق',
    },
    {
      id: 'purchases_debts' as ReportTabType,
      title: 'مستحقات وفواتير الموردين',
      shortTitle: 'مستحقات الموردين',
      subtitle: 'فواتير الشراء والذمم الآجلة للموردين',
      category: 'debts' as ReportCategory,
      categoryName: 'الذمم والديون',
      icon: Building2,
      color: {
        bg: 'from-sky-500 to-cyan-600',
        lightBg: 'bg-sky-50/70 hover:bg-sky-100/80',
        activeBorder: 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-sky-300',
        badge: 'bg-sky-100 text-sky-800 border-sky-200',
        iconBg: 'bg-sky-600 text-white shadow-sky-600/30',
        text: 'text-sky-950',
      },
      metricLabel: 'متبقي للموردين',
      metricValue: formatCurrency(stats.supplierDebtsTotal),
      badgeText: `${stats.indebtedSuppliersCount} مورد دائن`,
    },
    {
      id: 'customer_debts' as ReportTabType,
      title: 'ديون وذمم العملاء',
      shortTitle: 'ديون العملاء',
      subtitle: 'أرصدة المدينين والتحصيل وسندات القبض',
      category: 'debts' as ReportCategory,
      categoryName: 'الذمم والديون',
      icon: Users,
      color: {
        bg: 'from-rose-500 to-pink-600',
        lightBg: 'bg-rose-50/70 hover:bg-rose-100/80',
        activeBorder: 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-rose-300',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
        text: 'text-rose-950',
      },
      metricLabel: 'ديون العملاء',
      metricValue: formatCurrency(stats.customerDebtsTotal),
      badgeText: `${stats.debtorsCount} عميل مدين`,
    },
    {
      id: 'expiryloss' as ReportTabType,
      title: 'تقادم المخزون والمخاطر',
      shortTitle: 'تقادم ومخاطر',
      subtitle: 'الأصناف المنتهية والقريبة من الانتهاء',
      category: 'inventory' as ReportCategory,
      categoryName: 'المخزون والأصناف',
      icon: AlertTriangle,
      color: {
        bg: 'from-amber-600 to-rose-600',
        lightBg: 'bg-amber-50/70 hover:bg-amber-100/80',
        activeBorder: 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-rose-300',
        badge: stats.nearExpiryCount > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconBg: 'bg-amber-600 text-white shadow-amber-600/30',
        text: 'text-slate-900',
      },
      metricLabel: 'مخاطر قريبة',
      metricValue: stats.nearExpiryCount > 0 ? `${stats.nearExpiryCount} صنف` : 'المخزون سليم',
      badgeText: 'حماية الهدر',
    },
    {
      id: 'expenses' as ReportTabType,
      title: 'المصروفات التشغيلية',
      shortTitle: 'المصروفات',
      subtitle: 'تحليل بنود النفقات والرواتب والإيجارات',
      category: 'financial' as ReportCategory,
      categoryName: 'المالية والأرباح',
      icon: Coins,
      color: {
        bg: 'from-violet-500 to-purple-700',
        lightBg: 'bg-violet-50/70 hover:bg-violet-100/80',
        activeBorder: 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/90 shadow-sm',
        inactiveBorder: 'border-slate-200 bg-white hover:border-violet-300',
        badge: 'bg-violet-100 text-violet-800 border-violet-200',
        iconBg: 'bg-violet-600 text-white shadow-violet-600/30',
        text: 'text-violet-950',
      },
      metricLabel: 'المصاريف',
      metricValue: formatCurrency(stats.expensesTotal),
      badgeText: `${stats.expenseCategories.length} بنود تشغيل`,
    },
  ], [stats, formatCurrency]);

  // Filtered tiles based on category and search
  const filteredReportTiles = useMemo(() => {
    return reportTiles.filter((tile) => {
      const matchesCategory = selectedCategory === 'all' || tile.category === selectedCategory;
      const matchesSearch = !reportSearchQuery.trim() || 
        tile.title.includes(reportSearchQuery) || 
        tile.subtitle.includes(reportSearchQuery) || 
        tile.categoryName.includes(reportSearchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [reportTiles, selectedCategory, reportSearchQuery]);

  const activeTileData = useMemo(() => {
    return reportTiles.find((t) => t.id === activeReportTab) || reportTiles[0];
  }, [reportTiles, activeReportTab]);

  return (
    <div id="reports-analytics-view" className="w-full max-w-full overflow-x-hidden p-2 sm:p-4 space-y-3 sm:space-y-4 select-none font-sans text-right">
      
      {/* 1. Top Header Banner */}
      <div className="bg-white border border-teal-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                مركز التقارير والتحليلات الشاملة
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                P&L & Pharmacy Intelligence
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              تصفح تقارير الأرباح، حركة الأصناف، الخزينة، والمشتريات بشبكة تفاعلية سريعة
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            id="btn-open-report-catalog"
            onClick={() => setIsCatalogModalOpen(true)}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all cursor-pointer shadow-2xs text-center"
            title="تعرف على محتويات كل تقرير مالي وإداري بالتفصيل"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate">دليل التقارير</span>
          </button>

          <button
            id="btn-export-reports-csv"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs text-center"
            title="تصدير بيانات التقرير إلى ملف CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="truncate">تصدير إكسل</span>
          </button>

          <button
            id="btn-open-print-modal"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer text-center"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">طباعة</span>
          </button>
        </div>
      </div>

      {/* 2. TOP APP GRID LAUNCHER (نشر شبكي مثل التطبيقات للتنقل السريع بين التقارير في أعلى الشاشة) */}
      <div className="bg-white border border-teal-100/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs space-y-3">
        
        {/* App Launcher Toolbar: Categories + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
            <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-600" />
              تطبيقات وأقسام التقارير
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredReportTiles.length} تقارير متاحة
            </span>
          </div>

          {/* Categories Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-[11px] font-bold">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل (8)
            </button>
            <button
              onClick={() => setSelectedCategory('inventory')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'inventory'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Boxes className="w-3 h-3" />
              المخزون والأصناف (3)
            </button>
            <button
              onClick={() => setSelectedCategory('financial')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'financial'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              المالية والأرباح (2)
            </button>
            <button
              onClick={() => setSelectedCategory('debts')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'debts'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <Users className="w-3 h-3" />
              الذمم والديون (2)
            </button>
            <button
              onClick={() => setSelectedCategory('treasury')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'treasury'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              <Receipt className="w-3 h-3" />
              الخزينة والوردية (1)
            </button>
          </div>
        </div>

        {/* 8-App Grid (شبكة الأيقونات والبطاقات التطبيقية المنسقة بدقة) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-2.5">
          {filteredReportTiles.map((tile) => {
            const IconComp = tile.icon;
            const isActive = activeReportTab === tile.id;

            return (
              <button
                key={tile.id}
                id={`report-tile-${tile.id}`}
                onClick={() => {
                  setActiveReportTab(tile.id);
                  setIsFullScreenOpen(true);
                  showToast(`تم فتح تقرير ${tile.title} في شاشة كاملة`, 'info');
                }}
                className={`relative text-right p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                  isActive
                    ? tile.color.activeBorder
                    : `${tile.color.inactiveBorder} hover:shadow-md hover:-translate-y-0.5`
                }`}
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <div className="absolute -top-2 left-2 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>محدد</span>
                  </div>
                )}

                {/* Top Row: App Icon & Badge */}
                <div className="flex items-start justify-between gap-1 w-full">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                      isActive ? tile.color.iconBg : 'bg-slate-100 text-slate-700 group-hover:bg-teal-600 group-hover:text-white'
                    }`}
                  >
                    <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border truncate max-w-[90px] ${tile.color.badge}`}>
                    {tile.metricValue}
                  </span>
                </div>

                {/* Middle: Title & Subtitle */}
                <div className="mt-2 text-right w-full">
                  <div className={`text-xs font-black leading-snug truncate ${isActive ? 'text-slate-950 font-black' : 'text-slate-800'}`}>
                    {tile.title}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5 leading-tight">
                    {tile.subtitle}
                  </div>
                </div>

                {/* Bottom Row: Category & Status */}
                <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] w-full">
                  <span className="text-slate-400 truncate">{tile.categoryName}</span>
                  <span className="font-bold text-teal-700 group-hover:text-teal-900 flex items-center gap-0.5">
                    فتح شاشة كاملة ↗
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Period & Date Filter Toolbar (التحكم بالفترة الزمنية والتقديرات المالية) */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-md border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-100">فترة التحليل:</span>
            <span className="text-xs text-teal-300 font-mono font-semibold bg-white/10 px-2.5 py-0.5 rounded-md truncate border border-white/15">
              {periodTitle}
            </span>
          </div>

          {/* Quick Date Range Selectors */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 bg-white/10 p-1 rounded-xl border border-white/15 w-full sm:w-auto">
            <button
              onClick={() => setDateRange('today')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                dateRange === 'today' ? 'bg-teal-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                dateRange === 'week' ? 'bg-teal-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              الأسبوع (7 أيام)
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                dateRange === 'month' ? 'bg-teal-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              الشهر (30 يوم)
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                dateRange === 'custom' ? 'bg-teal-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              فترة مخصصة
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                dateRange === 'all' ? 'bg-teal-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              الكل
            </button>
          </div>
        </div>

        {/* Custom Date Inputs if 'custom' is selected */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-300 font-bold shrink-0">من تاريخ:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-slate-800 text-white px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-hidden focus:border-teal-400"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-300 font-bold shrink-0">إلى تاريخ:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-slate-800 text-white px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-hidden focus:border-teal-400"
              />
            </div>
          </div>
        )}

        {/* 3 Interactive Quick Snapshot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
          
          {/* Card 1: Today Snapshot */}
          <div
            onClick={() => setDateRange('today')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              dateRange === 'today'
                ? 'bg-teal-900/60 border-teal-400 ring-1 ring-teal-400'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-teal-300 font-bold">
              <span>تقرير اليوم (Daily)</span>
              <span className="text-[10px] bg-teal-500/30 px-2 py-0.5 rounded-full">{new Date().toISOString().split('T')[0]}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-base sm:text-lg font-mono font-black text-white">
                {formatCurrency(snapshots.todaySales)}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                أرباح: {formatCurrency(snapshots.todayProfit)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {snapshots.todayInvoices} فاتورة صادرة اليوم
            </div>
          </div>

          {/* Card 2: Weekly Estimate */}
          <div
            onClick={() => setDateRange('week')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              dateRange === 'week'
                ? 'bg-teal-900/60 border-teal-400 ring-1 ring-teal-400'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-sky-300 font-bold">
              <span>تقرير وتقدير أسبوعي (7 أيام)</span>
              <span className="text-[10px] bg-sky-500/30 px-2 py-0.5 rounded-full">معدل: {formatCurrency(snapshots.weekDailyAvg)}/يوم</span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-base sm:text-lg font-mono font-black text-white">
                {formatCurrency(snapshots.weekSales)}
              </span>
              <span className="text-xs font-mono font-bold text-sky-300">
                تقدير: {formatCurrency(snapshots.weekEstimate)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              صافي أرباح الأسبوع: <strong className="text-emerald-400 font-mono">{formatCurrency(snapshots.weekProfit)}</strong>
            </div>
          </div>

          {/* Card 3: Monthly Estimate */}
          <div
            onClick={() => setDateRange('month')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              dateRange === 'month'
                ? 'bg-teal-900/60 border-teal-400 ring-1 ring-teal-400'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
              <span>تقرير وتقدير شهري (30 يوماً)</span>
              <span className="text-[10px] bg-amber-500/30 px-2 py-0.5 rounded-full">معدل: {formatCurrency(snapshots.monthDailyAvg)}/يوم</span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-base sm:text-lg font-mono font-black text-white">
                {formatCurrency(snapshots.monthSales)}
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                تقدير: {formatCurrency(snapshots.monthEstimate)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              صافي أرباح الشهر: <strong className="text-emerald-400 font-mono">{formatCurrency(snapshots.monthProfit)}</strong>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Executive Summary & Quick Launch Hub */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                لوحة المؤشرات والتقارير التنفيذية
                <span className="text-[10px] bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full">
                  شاشة كاملة تفاعلية
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                انقر على أي تقرير من الشبكة أعلاه لعرض النتائج كاملة بملء الشاشة مع أدوات التصفية والطباعة والتصدير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveReportTab('item_movements');
                setIsFullScreenOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              عرض تقرير حركة الأصناف (كامل الشاشة)
            </button>
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              دليل التقارير
            </button>
          </div>
        </div>

        {/* 4 Financial & Operational Highlights Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Revenue & Cost */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between hover:border-teal-300 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-teal-600" />
                المبيعات والتكاليف
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-50 font-bold px-1.5 py-0.5 rounded-md border border-teal-100">
                {stats.invoicesCount} فاتورة
              </span>
            </div>
            <div className="my-2.5">
              <div className="text-lg sm:text-xl font-mono font-black text-slate-900">
                {formatCurrency(stats.salesTotal)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>التكلفة (COGS):</span>
                <span className="font-mono font-bold text-rose-600">-{formatCurrency(stats.costTotal)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('pnl');
                setIsFullScreenOpen(true);
              }}
              className="w-full py-1.5 bg-white group-hover:bg-teal-600 group-hover:text-white text-slate-700 border border-slate-200 group-hover:border-teal-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              قائمة الدخل P&L ↗
            </button>
          </div>

          {/* 2. Net Profit */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-teal-50/50 to-emerald-50/40 border border-teal-200 flex flex-col justify-between hover:border-teal-400 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                صافي الربح الفعلي
              </span>
              <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                هامش {stats.netMargin}%
              </span>
            </div>
            <div className="my-2.5">
              <div className="text-lg sm:text-xl font-mono font-black text-emerald-800">
                {formatCurrency(stats.netProfit)}
              </div>
              <div className="text-[11px] text-teal-800 flex items-center justify-between mt-1">
                <span>مجمل الربح:</span>
                <span className="font-mono font-bold text-teal-900">{formatCurrency(stats.grossProfit)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('item_movements');
                setIsFullScreenOpen(true);
              }}
              className="w-full py-1.5 bg-white group-hover:bg-teal-700 group-hover:text-white text-teal-900 border border-teal-200 group-hover:border-teal-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              تقرير أرباح الأصناف ↗
            </button>
          </div>

          {/* 3. Cash & Card Shift Flow */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between hover:border-teal-300 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                المقبوضات والدرج
              </span>
              <span className="text-[10px] text-slate-600 bg-slate-200/70 font-bold px-1.5 py-0.5 rounded-md">
                Z-Report
              </span>
            </div>
            <div className="my-2.5">
              <div className="text-lg sm:text-xl font-mono font-black text-slate-900">
                {formatCurrency(stats.cashSales + stats.cardSales)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1 font-mono">
                <span>نقد: {formatCurrency(stats.cashSales)}</span>
                <span>شبكة: {formatCurrency(stats.cardSales)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('shift');
                setIsFullScreenOpen(true);
              }}
              className="w-full py-1.5 bg-white group-hover:bg-teal-600 group-hover:text-white text-slate-700 border border-slate-200 group-hover:border-teal-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              تفاصيل الوردية Z-Report ↗
            </button>
          </div>

          {/* 4. Top Sellers */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between hover:border-teal-300 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                الأكثر مبيعاً
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded-md border border-amber-200">
                {stats.bestSellers.length} صنف نشط
              </span>
            </div>
            <div className="my-2.5">
              <div className="text-sm font-black text-slate-800 truncate">
                {stats.bestSellers[0]?.name || 'لا توجد مبيعات مسجلة'}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>مبيعات أفضل صنف:</span>
                <span className="font-mono font-bold text-teal-700">
                  {stats.bestSellers[0] ? `${stats.bestSellers[0].qty} وحدة` : '0'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('bestsellers');
                setIsFullScreenOpen(true);
              }}
              className="w-full py-1.5 bg-white group-hover:bg-teal-600 group-hover:text-white text-slate-700 border border-slate-200 group-hover:border-teal-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              قائمة أفضل الأدوية ↗
            </button>
          </div>
        </div>

        {/* 3 Secondary Critical Action & Risk Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Customer Receivables */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                ديون وذمم العملاء:
              </div>
              <div className="text-base font-mono font-black text-amber-900 mt-1">
                {formatCurrency(stats.customerDebtsTotal)}
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5">على {stats.debtorsCount} عميل مدين</div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('customer_debts');
                setIsFullScreenOpen(true);
              }}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              فتح التقرير ↗
            </button>
          </div>

          {/* Supplier Payables */}
          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-rose-600" />
                مستحقات الموردين:
              </div>
              <div className="text-base font-mono font-black text-rose-900 mt-1">
                {formatCurrency(stats.supplierDebtsTotal)}
              </div>
              <div className="text-[10px] text-rose-800 mt-0.5">على {stats.indebtedSuppliersCount} شركة ومورد</div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('purchases_debts');
                setIsFullScreenOpen(true);
              }}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              فتح التقرير ↗
            </button>
          </div>

          {/* Expiry Loss */}
          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                قيمة منتهي خلال 90 يوم:
              </div>
              <div className="text-base font-mono font-black text-teal-950 mt-1">
                {formatCurrency(stats.nearExpiryLoss)}
              </div>
              <div className="text-[10px] text-teal-800 mt-0.5">{stats.nearExpiryCount} تشغيلة مهددة</div>
            </div>
            <button
              onClick={() => {
                setActiveReportTab('expiryloss');
                setIsFullScreenOpen(true);
              }}
              className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              فتح التقرير ↗
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Modal: What Each Report Contains */}
      <ReportCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onSelectTab={(tabId) => {
          setActiveReportTab(tabId);
          setIsCatalogModalOpen(false);
          setIsFullScreenOpen(true);
        }}
      />

      {/* Full Screen Dedicated Report Modal */}
      <FullScreenReportModal
        isOpen={isFullScreenOpen}
        activeReportTab={activeReportTab}
        onClose={() => setIsFullScreenOpen(false)}
        onSelectTab={(tabId) => setActiveReportTab(tabId)}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        dateRangeStr={dateRangeStr}
        periodTitle={periodTitle}
        stats={stats}
        formatCurrency={formatCurrency}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        bestSellersSort={bestSellersSort}
        setBestSellersSort={setBestSellersSort}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
        setActiveTab={setActiveTab}
        setPurchasesSubTab={setPurchasesSubTab}
        setCustomersSubTab={setCustomersSubTab}
      />

      {/* Comprehensive Report Print Modal */}
      <ComprehensiveReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        periodTitle={periodTitle}
        dateRangeStr={dateRangeStr}
        stats={stats}
      />

    </div>
  );
};
