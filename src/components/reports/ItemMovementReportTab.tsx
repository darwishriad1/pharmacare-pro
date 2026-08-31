import React, { useState, useMemo } from 'react';
import {
  Package,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Search,
  Filter,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Eye,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Coins,
  DollarSign,
  Boxes,
  ArrowUpDown,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ItemMovementDetailModal, ItemMovementRecord } from './ItemMovementDetailModal';
import { excelService } from '../../services/excelService';

interface ItemMovementReportTabProps {
  dateRangeStr: string;
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';
  customStartDate?: string;
  customEndDate?: string;
  onOpenPrintModal?: () => void;
}

export const ItemMovementReportTab: React.FC<ItemMovementReportTabProps> = ({
  dateRangeStr,
  dateRange,
  customStartDate,
  customEndDate,
}) => {
  const { formatCurrency, showToast, setActiveTab } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [movementFilter, setMovementFilter] = useState<'all' | 'sold' | 'stagnant' | 'out_of_stock' | 'low_stock' | 'fast'>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'sold_qty' | 'revenue' | 'incoming_qty' | 'remaining_qty' | 'name'>('sold_qty');
  const [selectedItemForModal, setSelectedItemForModal] = useState<ItemMovementRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 1. Calculate Full Movement Data from DB
  const movementData = useMemo(() => {
    const allProducts = db.getProducts();
    const allBatches = db.getBatches();
    const allPurchases = db.getPurchaseInvoices();
    const allSales = db.getSales().filter((s) => s.status !== 'returned');
    const allReturns = db.getReturns();

    const todayStr = new Date().toISOString().split('T')[0];

    // Filter sales & purchases by active period
    let filteredSales = allSales;
    let filteredPurchases = allPurchases;

    if (dateRange === 'today') {
      filteredSales = allSales.filter((s) => s.date === todayStr);
      filteredPurchases = allPurchases.filter((p) => p.date === todayStr);
    } else if (dateRange === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const minDate = lastWeek.toISOString().split('T')[0];
      filteredSales = allSales.filter((s) => s.date >= minDate);
      filteredPurchases = allPurchases.filter((p) => p.date >= minDate);
    } else if (dateRange === 'month') {
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      const minDate = lastMonth.toISOString().split('T')[0];
      filteredSales = allSales.filter((s) => s.date >= minDate);
      filteredPurchases = allPurchases.filter((p) => p.date >= minDate);
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      filteredSales = allSales.filter((s) => s.date >= customStartDate && s.date <= customEndDate);
      filteredPurchases = allPurchases.filter((p) => p.date >= customStartDate && p.date <= customEndDate);
    }

    // Build Product Stats
    const itemsList: ItemMovementRecord[] = allProducts.map((prod) => {
      // 1. Calculate incoming quantities from filtered purchase invoices + product batches
      const productPurchases = filteredPurchases.flatMap((p) =>
        p.items.filter((pi) => pi.productId === prod.id || pi.productName === prod.name || pi.barcode === prod.barcode)
      );
      const purchasedQty = productPurchases.reduce((acc, pi) => acc + pi.quantity, 0);

      // Batches of this product
      const prodBatches = allBatches.filter((b) => b.productId === prod.id);
      const batchesTotalStock = prodBatches.reduce((acc, b) => acc + Math.max(0, b.quantity), 0);

      // If 'all' period, incoming = purchasedQty + initial seed batches
      // If specific date period, incoming = purchasedQty in this period
      const incomingQty = dateRange === 'all' 
        ? Math.max(purchasedQty, batchesTotalStock) + (prod.totalQuantity > 0 && purchasedQty === 0 ? prod.totalQuantity : 0)
        : purchasedQty;

      // 2. Calculate sold quantities & revenue in the period
      let soldQty = 0;
      let revenue = 0;
      let costOfSold = 0;
      let lastSaleDate: string | undefined;

      filteredSales.forEach((s) => {
        s.items.forEach((item) => {
          if (item.product.id === prod.id || item.product.name === prod.name) {
            const pkgMultiplier = item.unitMultiplier || 1;
            const itemPkgQty = item.quantity * pkgMultiplier;
            soldQty += item.quantity;
            revenue += item.total;
            const unitCost = prod.costPrice || item.product.costPrice || item.unitPrice * 0.7;
            costOfSold += unitCost * itemPkgQty;
            if (!lastSaleDate || s.date > lastSaleDate) {
              lastSaleDate = s.date;
            }
          }
        });
      });

      // 3. Returns in period
      let returnedQty = 0;
      allReturns.forEach((r) => {
        r.items.forEach((ri) => {
          if (ri.productId === prod.id || ri.productName === prod.name) {
            returnedQty += ri.returnedQuantity;
          }
        });
      });

      // 4. Current remaining quantity in stock (accurate batches total)
      const remainingQty = prodBatches.length > 0 ? batchesTotalStock : prod.totalQuantity;

      // 5. Profit & Margins
      const profit = revenue - costOfSold;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      const remainingCostValue = remainingQty * prod.costPrice;
      const remainingSellValue = remainingQty * prod.price;

      // 6. Movement Status determination
      let movementStatus: 'fast' | 'medium' | 'stagnant' | 'out_of_stock' | 'low_stock' = 'medium';
      if (remainingQty <= 0) {
        movementStatus = 'out_of_stock';
      } else if (remainingQty <= prod.minStock) {
        movementStatus = 'low_stock';
      } else if (soldQty >= 15 || (incomingQty > 0 && soldQty / incomingQty >= 0.5)) {
        movementStatus = 'fast';
      } else if (soldQty === 0) {
        movementStatus = 'stagnant';
      } else {
        movementStatus = 'medium';
      }

      return {
        id: prod.id,
        name: prod.name,
        scientificName: prod.scientificName,
        barcode: prod.barcode,
        category: prod.category || 'أدوية عامة',
        form: prod.form,
        strength: prod.strength,
        costPrice: prod.costPrice,
        sellingPrice: prod.price,
        minStock: prod.minStock,
        locationRack: prod.locationRack,
        incomingQty: incomingQty || (dateRange === 'all' ? remainingQty + soldQty : 0),
        soldQty,
        returnedQty,
        remainingQty,
        revenue,
        costOfSold,
        profit,
        margin,
        remainingCostValue,
        remainingSellValue,
        movementStatus,
        lastSaleDate,
      };
    });

    return itemsList;
  }, [dateRange, customStartDate, customEndDate]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    movementData.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [movementData]);

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    let result = [...movementData];

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.scientificName && i.scientificName.toLowerCase().includes(q)) ||
          i.barcode.includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    // Movement Velocity Filter
    if (movementFilter === 'sold') {
      result = result.filter((i) => i.soldQty > 0);
    } else if (movementFilter === 'stagnant') {
      result = result.filter((i) => i.soldQty === 0 && i.remainingQty > 0);
    } else if (movementFilter === 'out_of_stock') {
      result = result.filter((i) => i.remainingQty <= 0);
    } else if (movementFilter === 'low_stock') {
      result = result.filter((i) => i.remainingQty > 0 && i.remainingQty <= i.minStock);
    } else if (movementFilter === 'fast') {
      result = result.filter((i) => i.movementStatus === 'fast');
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'sold_qty') return b.soldQty - a.soldQty;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'incoming_qty') return b.incomingQty - a.incomingQty;
      if (sortBy === 'remaining_qty') return b.remainingQty - a.remainingQty;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [movementData, searchQuery, selectedCategory, movementFilter, sortBy]);

  // Overall Aggregate KPIs for the Movement Report
  const totals = useMemo(() => {
    const totalItemsCount = movementData.length;
    const incomingItemsCount = movementData.filter((i) => i.incomingQty > 0).length;
    const soldItemsCount = movementData.filter((i) => i.soldQty > 0).length;
    const stagnantItemsCount = movementData.filter((i) => i.soldQty === 0 && i.remainingQty > 0).length;
    const outOfStockCount = movementData.filter((i) => i.remainingQty <= 0).length;

    const totalIncomingQty = movementData.reduce((acc, i) => acc + i.incomingQty, 0);
    const totalSoldQty = movementData.reduce((acc, i) => acc + i.soldQty, 0);
    const totalRemainingQty = movementData.reduce((acc, i) => acc + i.remainingQty, 0);
    const totalRevenue = movementData.reduce((acc, i) => acc + i.revenue, 0);
    const totalCostOfSold = movementData.reduce((acc, i) => acc + i.costOfSold, 0);
    const totalProfit = movementData.reduce((acc, i) => acc + i.profit, 0);
    const totalRemainingCostValue = movementData.reduce((acc, i) => acc + i.remainingCostValue, 0);
    const totalRemainingSellValue = movementData.reduce((acc, i) => acc + i.remainingSellValue, 0);

    const overallMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return {
      totalItemsCount,
      incomingItemsCount,
      soldItemsCount,
      stagnantItemsCount,
      outOfStockCount,
      totalIncomingQty,
      totalSoldQty,
      totalRemainingQty,
      totalRevenue,
      totalCostOfSold,
      totalProfit,
      totalRemainingCostValue,
      totalRemainingSellValue,
      overallMargin,
    };
  }, [movementData]);

  // Export to CSV / Excel
  const handleExportExcel = () => {
    const headers = [
      'الباركود',
      'اسم الصنف الدوائي',
      'الاسم العلمي',
      'المجموعة الدوائية',
      'الكمية الواردة',
      'الكمية المباعة',
      'الكمية المتبقية',
      'سعر الشراء (التكلفة)',
      'سعر البيع',
      'إجمالي مبيعات الصنف (الإيراد)',
      'تكلفة المبيعات',
      'صافي ربح الصنف المباع',
      'هامش الربح %',
      'قيمة المخزون المتبقي بالتكلفة',
      'قيمة المخزون المتبقي بالبيع',
      'حالة الحركة والنشاط',
    ];

    const rows = filteredItems.map((item) => [
      `"${item.barcode}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.scientificName || '').replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.incomingQty,
      item.soldQty,
      item.remainingQty,
      item.costPrice,
      item.sellingPrice,
      item.revenue,
      item.costOfSold,
      item.profit,
      `${item.margin}%`,
      item.remainingCostValue,
      item.remainingSellValue,
      item.remainingQty <= 0
        ? '"نفد من المخزون"'
        : item.soldQty === 0
        ? '"راكد / لم يباع"'
        : item.movementStatus === 'fast'
        ? '"سريع الحركة"'
        : '"متوسط الحركة"',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    excelService.downloadFile(
      csvContent,
      `item_movement_report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8;'
    );
    showToast('تم تصدير تقرير حركة ومبيعات وأرباح الأصناف إلى ملف Excel بنجاح', 'success');
  };

  // Quick Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs space-y-4 font-sans text-right select-none">
      
      {/* 1. Header with Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-teal-600" />
              <span>تقرير حركة الأصناف، الوارد، المبيعات، المتبقي، وصافي أرباح كل دواء</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {dateRangeStr}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            كشف تحليلي شامل لكل صنف: كميات الوارد، المنصرف، الرصيد المتبقي، إيراد الصنف، تكلفة الشراء، والربح الفعلي المحقق
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="تصدير كشف حركة الأصناف إلى إكسل"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>تصدير إكسل (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الكشف</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Metrics Cards (عدد الوارد، الكميات، المباع، المتبقي، والأرباح) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        
        {/* Metric 1: Incoming Items & Batches */}
        <div className="bg-sky-50/70 border border-sky-200 p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-sky-900 font-bold">
            <span>الأصناف الواردة:</span>
            <ArrowDownLeft className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-sky-950 mt-1">
            {totals.incomingItemsCount} <span className="text-[10px] text-sky-700 font-normal">صنف</span>
          </div>
          <div className="text-[10px] text-sky-800 font-mono mt-0.5">
            إجمالي الوارد: <strong>{totals.totalIncomingQty}</strong> عبوة
          </div>
        </div>

        {/* Metric 2: Sold Units */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
            <span>الكمية المباعة (المنصرف):</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-emerald-950 mt-1">
            {totals.totalSoldQty} <span className="text-[10px] text-emerald-700 font-normal">عبوة</span>
          </div>
          <div className="text-[10px] text-emerald-800 mt-0.5">
            من <strong>{totals.soldItemsCount}</strong> صنف مباع
          </div>
        </div>

        {/* Metric 3: Remaining Stock Units */}
        <div className="bg-teal-50/80 border border-teal-200 p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-teal-900 font-bold">
            <span>الرصيد المتبقي بالمخزن:</span>
            <Layers className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-teal-950 mt-1">
            {totals.totalRemainingQty} <span className="text-[10px] text-teal-700 font-normal">عبوة</span>
          </div>
          <div className="text-[10px] text-teal-800 mt-0.5">
            رصيد {totals.totalItemsCount} صنف مسجل
          </div>
        </div>

        {/* Metric 4: Revenue */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
            <span>إجمالي مبيعات الأصناف:</span>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm sm:text-base font-mono font-black text-slate-900 mt-1">
            {formatCurrency(totals.totalRevenue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
            تكلفة شراء: {formatCurrency(totals.totalCostOfSold)}
          </div>
        </div>

        {/* Metric 5: Net Profit from Sold Items */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-400 p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-teal-900 font-black">
            <span>صافي ربح الأصناف:</span>
            <TrendingUp className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-teal-950 mt-1">
            {formatCurrency(totals.totalProfit)}
          </div>
          <div className="text-[10px] text-teal-900 font-bold mt-0.5 font-mono">
            هامش ربح وسطي: <strong>{totals.overallMargin}%</strong>
          </div>
        </div>

        {/* Metric 6: Remaining Stock Value */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
            <span>قيمة المخزون المتبقي:</span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm sm:text-base font-mono font-bold text-slate-900 mt-1">
            {formatCurrency(totals.totalRemainingCostValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            بسعر البيع: <strong className="text-slate-700 font-mono">{formatCurrency(totals.totalRemainingSellValue)}</strong>
          </div>
        </div>

      </div>

      {/* 3. Search, Filter & Sorters Bar */}
      <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="بحث باسم الدواء التجاري، العلمي، أو الباركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pl-8 text-xs focus:outline-hidden focus:border-teal-600 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter by Category */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-teal-600 shadow-2xs cursor-pointer"
          >
            <option value="all">كافة المجموعات الدوائية ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Filter by Movement Velocity */}
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value as any)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-teal-600 shadow-2xs cursor-pointer"
          >
            <option value="all">حالة الحركة: الكل ({movementData.length})</option>
            <option value="sold">الأصناف المباعة فقط ({totals.soldItemsCount})</option>
            <option value="fast">سريع الحركة والدوران</option>
            <option value="stagnant">راكد / بدون مبيعات ({totals.stagnantItemsCount})</option>
            <option value="low_stock">منخفض قارب على النفاد</option>
            <option value="out_of_stock">نفد من المخزن ({totals.outOfStockCount})</option>
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[11px] hidden sm:inline">الترتيب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-0 font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="sold_qty">الأكثر مبيعاً (الكمية)</option>
              <option value="profit">الأعلى ربحاً صافياً</option>
              <option value="revenue">الأعلى إيراداً</option>
              <option value="incoming_qty">الأعلى كمية واردة</option>
              <option value="remaining_qty">الأعلى رصيداً متبقياً</option>
              <option value="name">أبجدياً بالاسم</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. The Main Comprehensive Item Movement Table & Mobile Cards */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        
        {/* MOBILE CARD VIEW (< md) - No horizontal scroll! */}
        <div className="block md:hidden divide-y divide-slate-100 p-2 space-y-2.5 bg-slate-50/50">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-xs">لا توجد أصناف مطابقة للبحث أو التصفية</p>
              <p className="text-[11px] text-slate-400 mt-1">جرب تغيير معايير البحث أو اختيار فترة زمنية أخرى</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isOutOfStock = item.remainingQty <= 0;
              const isLowStock = item.remainingQty > 0 && item.remainingQty <= item.minStock;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItemForModal(item);
                    setIsDetailModalOpen(true);
                  }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5 shadow-2xs hover:border-teal-400 transition-all cursor-pointer"
                >
                  {/* Card Header: Rank, Name, Category, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm leading-snug">{item.name}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.barcode}
                          </span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Movement Status Badge */}
                    <div className="shrink-0">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          نفد الرصيد
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          قارب النفاد
                        </span>
                      ) : item.soldQty >= 15 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          سريع الدوران
                        </span>
                      ) : item.soldQty === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          راكد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          طبيعي
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Breakdown Grid (الوارد / المباع / المتبقي) */}
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div className="bg-sky-50/70 border border-sky-200/80 p-2 rounded-xl">
                      <div className="text-[9px] text-sky-800 font-sans font-bold">الوارد</div>
                      <div className="text-sm font-black text-sky-950">{item.incomingQty}</div>
                      <div className="text-[8px] text-sky-600 font-sans">عبوة</div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200/80 p-2 rounded-xl">
                      <div className="text-[9px] text-emerald-800 font-sans font-bold">المباع</div>
                      <div className="text-sm font-black text-emerald-950">{item.soldQty}</div>
                      <div className="text-[8px] text-emerald-600 font-sans">عبوة</div>
                    </div>

                    <div className={`p-2 rounded-xl border ${
                      isOutOfStock
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : isLowStock
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-teal-50/80 border-teal-200/80 text-teal-950'
                    }`}>
                      <div className="text-[9px] font-sans font-bold">المتبقي</div>
                      <div className="text-sm font-black">{item.remainingQty}</div>
                      <div className="text-[8px] font-sans opacity-75">
                        {isOutOfStock ? 'منتهي' : isLowStock ? 'حرج' : 'متاح'}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Profit Details */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                      <div className="text-[9px] text-slate-500 font-sans">إجمالي المبيعات:</div>
                      <div className="text-xs font-bold text-slate-900">{formatCurrency(item.revenue)}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">تكلفة المباع: {formatCurrency(item.costOfSold)}</div>
                    </div>

                    <div className="bg-emerald-50/60 border border-emerald-300/80 p-2 rounded-xl">
                      <div className="flex items-center justify-between text-[9px] text-emerald-800 font-sans font-bold">
                        <span>صافي الربح:</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900 text-[8px] font-mono">
                          {item.margin}%
                        </span>
                      </div>
                      <div className="text-xs font-black text-emerald-800">{formatCurrency(item.profit)}</div>
                      <div className="text-[9px] text-emerald-700/80 mt-0.5">هامش ربح الصنف</div>
                    </div>
                  </div>

                  {/* Footer Bar: Price & Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>شراء: <strong className="font-mono text-slate-700">{formatCurrency(item.costPrice)}</strong></span>
                      <span>•</span>
                      <span>بيع: <strong className="font-mono text-slate-800">{formatCurrency(item.sellingPrice)}</strong></span>
                    </div>

                    <div className="flex items-center gap-1 text-teal-700 font-bold text-xs">
                      <span>كشف الحركات</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Mobile Summary Banner */}
          {filteredItems.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-3 space-y-2 mt-2 font-mono">
              <div className="text-xs font-bold font-sans text-slate-300">
                ملخص النتائج المعروضة ({filteredItems.length} صنف):
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <div className="text-[9px] text-sky-300 font-sans">الوارد</div>
                  <div className="font-bold">{filteredItems.reduce((acc, i) => acc + i.incomingQty, 0)}</div>
                </div>
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <div className="text-[9px] text-emerald-300 font-sans">المباع</div>
                  <div className="font-bold">{filteredItems.reduce((acc, i) => acc + i.soldQty, 0)}</div>
                </div>
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <div className="text-[9px] text-teal-300 font-sans">المتبقي</div>
                  <div className="font-bold">{filteredItems.reduce((acc, i) => acc + i.remainingQty, 0)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                <span className="text-slate-300 font-sans">إجمالي أرباح الأصناف:</span>
                <span className="font-black text-emerald-400 text-sm">
                  {formatCurrency(filteredItems.reduce((acc, i) => acc + i.profit, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-teal-900 text-white text-[11px] font-bold tracking-wider">
              <tr>
                <th className="p-3 text-center w-10">#</th>
                <th className="p-3 min-w-[180px]">الصنف الدوائي والمجموعة</th>
                <th className="p-3 text-center bg-sky-950/60 min-w-[75px]">الوارد</th>
                <th className="p-3 text-center bg-emerald-950/60 min-w-[75px]">المباع</th>
                <th className="p-3 text-center bg-teal-950/80 min-w-[80px]">المتبقي</th>
                <th className="p-3 text-left min-w-[80px]">سعر الشراء</th>
                <th className="p-3 text-left min-w-[80px]">سعر البيع</th>
                <th className="p-3 text-left min-w-[95px]">إجمالي المبيعات</th>
                <th className="p-3 text-left min-w-[95px]">تكلفة المباع</th>
                <th className="p-3 text-left bg-emerald-950/80 min-w-[100px]">صافي الربح</th>
                <th className="p-3 text-center min-w-[65px]">الهامش %</th>
                <th className="p-3 text-left min-w-[95px]">قيمة المتبقي</th>
                <th className="p-3 text-center min-w-[85px]">حالة الصنف</th>
                <th className="p-3 text-center w-12">تفاصيل</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">لا توجد أصناف مطابقة للبحث أو التصفية</p>
                      <p className="text-xs text-slate-400">جرب تغيير معايير البحث أو اختيار فترة زمنية أخرى</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isOutOfStock = item.remainingQty <= 0;
                  const isLowStock = item.remainingQty > 0 && item.remainingQty <= item.minStock;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedItemForModal(item);
                        setIsDetailModalOpen(true);
                      }}
                      className={`hover:bg-teal-50/40 transition-colors cursor-pointer ${
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      {/* Index */}
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Product Name & Details */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm hover:text-teal-700 transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {item.barcode}
                          </span>
                          <span>•</span>
                          <span>{item.category}</span>
                          {item.scientificName && (
                            <span className="text-slate-400 hidden xl:inline">({item.scientificName})</span>
                          )}
                        </div>
                      </td>

                      {/* Incoming Qty */}
                      <td className="p-3 text-center font-mono font-bold text-sky-800 bg-sky-50/30">
                        {item.incomingQty}
                      </td>

                      {/* Sold Qty */}
                      <td className="p-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/30">
                        {item.soldQty}
                      </td>

                      {/* Remaining Qty */}
                      <td className={`p-3 text-center font-mono font-black ${
                        isOutOfStock
                          ? 'bg-rose-50 text-rose-700'
                          : isLowStock
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-teal-50/40 text-teal-900'
                      }`}>
                        {item.remainingQty}
                        {isLowStock && (
                          <span className="block text-[9px] text-amber-700 font-normal">منخفض</span>
                        )}
                        {isOutOfStock && (
                          <span className="block text-[9px] text-rose-700 font-normal">نفد</span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="p-3 text-left font-mono text-slate-600">
                        {formatCurrency(item.costPrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="p-3 text-left font-mono font-bold text-slate-800">
                        {formatCurrency(item.sellingPrice)}
                      </td>

                      {/* Total Sales (Revenue) */}
                      <td className="p-3 text-left font-mono font-bold text-slate-900">
                        {formatCurrency(item.revenue)}
                      </td>

                      {/* Cost of Sold */}
                      <td className="p-3 text-left font-mono text-slate-500">
                        {formatCurrency(item.costOfSold)}
                      </td>

                      {/* Net Profit */}
                      <td className="p-3 text-left font-mono font-black text-emerald-700 bg-emerald-50/30">
                        {formatCurrency(item.profit)}
                      </td>

                      {/* Margin % */}
                      <td className="p-3 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          item.margin >= 30
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.margin >= 15
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.margin}%
                        </span>
                      </td>

                      {/* Remaining Value */}
                      <td className="p-3 text-left font-mono text-slate-700 text-[11px]">
                        <div>{formatCurrency(item.remainingCostValue)}</div>
                        <div className="text-[9px] text-slate-400">تكلفة</div>
                      </td>

                      {/* Movement Status Badge */}
                      <td className="p-3 text-center">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            نفد الرصيد
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            قارب على النفاد
                          </span>
                        ) : item.soldQty >= 15 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            سريع الدوران
                          </span>
                        ) : item.soldQty === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            راكد / لم يباع
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800">
                            متوسط الحركة
                          </span>
                        )}
                      </td>

                      {/* Action Icon */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForModal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors cursor-pointer"
                          title="عرض كشف الحركات الكامل للصنف"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Summary Totals */}
            {filteredItems.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-bold text-xs">
                <tr>
                  <td colSpan={2} className="p-3 text-right">
                    إجمالي النتائج المعروضة ({filteredItems.length} صنف):
                  </td>
                  <td className="p-3 text-center font-mono text-sky-300">
                    {filteredItems.reduce((acc, i) => acc + i.incomingQty, 0)}
                  </td>
                  <td className="p-3 text-center font-mono text-emerald-300">
                    {filteredItems.reduce((acc, i) => acc + i.soldQty, 0)}
                  </td>
                  <td className="p-3 text-center font-mono text-teal-300">
                    {filteredItems.reduce((acc, i) => acc + i.remainingQty, 0)}
                  </td>
                  <td colSpan={2} className="p-3 text-slate-400 text-center">-</td>
                  <td className="p-3 text-left font-mono text-slate-100">
                    {formatCurrency(filteredItems.reduce((acc, i) => acc + i.revenue, 0))}
                  </td>
                  <td className="p-3 text-left font-mono text-slate-300">
                    {formatCurrency(filteredItems.reduce((acc, i) => acc + i.costOfSold, 0))}
                  </td>
                  <td className="p-3 text-left font-mono text-emerald-400 font-black">
                    {formatCurrency(filteredItems.reduce((acc, i) => acc + i.profit, 0))}
                  </td>
                  <td className="p-3 text-center font-mono text-teal-300">
                    {totals.overallMargin}%
                  </td>
                  <td className="p-3 text-left font-mono text-slate-200">
                    {formatCurrency(filteredItems.reduce((acc, i) => acc + i.remainingCostValue, 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. Detail Ledger Modal for Individual Selected Item */}
      <ItemMovementDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItemForModal(null);
        }}
        item={selectedItemForModal}
        dateRangeStr={dateRangeStr}
      />

    </div>
  );
};
