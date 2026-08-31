import React, { useMemo } from 'react';
import {
  X,
  ArrowRight,
  Printer,
  Download,
  Search,
  HelpCircle,
  Boxes,
  TrendingUp,
  Award,
  Receipt,
  Building2,
  Users,
  AlertTriangle,
  Coins,
  CheckCircle2,
  ExternalLink,
  Banknote,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';
import { ItemMovementReportTab } from './ItemMovementReportTab';

export type ReportTabType =
  | 'item_movements'
  | 'pnl'
  | 'bestsellers'
  | 'shift'
  | 'purchases_debts'
  | 'customer_debts'
  | 'expiryloss'
  | 'expenses';

export type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

interface FullScreenReportModalProps {
  isOpen: boolean;
  activeReportTab: ReportTabType;
  onClose: () => void;
  onSelectTab: (tab: ReportTabType) => void;
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  dateRangeStr: string;
  periodTitle: string;
  stats: any;
  formatCurrency: (amount: number) => string;
  productSearch: string;
  setProductSearch: (s: string) => void;
  bestSellersSort: 'revenue' | 'profit' | 'qty';
  setBestSellersSort: (s: 'revenue' | 'profit' | 'qty') => void;
  onOpenPrintModal: () => void;
  onOpenCatalogModal: () => void;
  setActiveTab: (tab: string) => void;
  setPurchasesSubTab?: (tab: string) => void;
  setCustomersSubTab?: (tab: string) => void;
}

export const FullScreenReportModal: React.FC<FullScreenReportModalProps> = ({
  isOpen,
  activeReportTab,
  onClose,
  onSelectTab,
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  dateRangeStr,
  periodTitle,
  stats,
  formatCurrency,
  productSearch,
  setProductSearch,
  bestSellersSort,
  setBestSellersSort,
  onOpenPrintModal,
  onOpenCatalogModal,
  setActiveTab,
  setPurchasesSubTab,
  setCustomersSubTab,
}) => {
  const { settings } = useSettingsStore();
  const { currentUser } = useAuthStore();

  // All 8 Reports Definition
  const reportTabs = useMemo(() => [
    {
      id: 'item_movements' as ReportTabType,
      title: 'حركة الأصناف والأرباح',
      shortTitle: 'حركة الأصناف',
      subtitle: 'الوارد والمباع وهوامش ربح كل صنف',
      icon: Boxes,
      badgeText: 'تحليل الوارد والمباع',
      color: {
        bg: 'from-emerald-500 to-teal-600',
        activeBtn: 'bg-emerald-600 text-white shadow-xs',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      },
    },
    {
      id: 'pnl' as ReportTabType,
      title: 'قائمة الأرباح والخسائر',
      shortTitle: 'الأرباح والخسائر',
      subtitle: 'صافي الدخل وهامش الربح الحقيقي',
      icon: TrendingUp,
      badgeText: `${stats.netMargin}% هامش صافي`,
      color: {
        bg: 'from-teal-500 to-teal-700',
        activeBtn: 'bg-teal-600 text-white shadow-xs',
        badge: 'bg-teal-100 text-teal-800 border-teal-200',
      },
    },
    {
      id: 'bestsellers' as ReportTabType,
      title: 'الأكثر مبيعاً وربحية',
      shortTitle: 'الأعلى مبيعاً',
      subtitle: 'ترتيب الأصناف بالدخل والربح والكمية',
      icon: Award,
      badgeText: 'تحليل ABC',
      color: {
        bg: 'from-amber-500 to-orange-600',
        activeBtn: 'bg-amber-600 text-white shadow-xs',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
      },
    },
    {
      id: 'shift' as ReportTabType,
      title: 'الخزينة وتقفيل الوردية',
      shortTitle: 'الخزينة والوردية',
      subtitle: 'حركة الصندوق والنقد والشبكة والمطابقة',
      icon: Receipt,
      badgeText: 'مطابقة الصندوق Z-Report',
      color: {
        bg: 'from-indigo-500 to-blue-600',
        activeBtn: 'bg-indigo-600 text-white shadow-xs',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      },
    },
    {
      id: 'purchases_debts' as ReportTabType,
      title: 'مستحقات وفواتير الموردين',
      shortTitle: 'مستحقات الموردين',
      subtitle: 'فواتير الشراء والذمم الآجلة للموردين',
      icon: Building2,
      badgeText: 'التوريدات والذمم الدائنة',
      color: {
        bg: 'from-sky-500 to-cyan-600',
        activeBtn: 'bg-sky-600 text-white shadow-xs',
        badge: 'bg-sky-100 text-sky-800 border-sky-200',
      },
    },
    {
      id: 'customer_debts' as ReportTabType,
      title: 'ديون وذمم العملاء (الآجل)',
      shortTitle: 'ديون العملاء',
      subtitle: 'الذمم المدينة وسندات القبض ومتابعة التحصيل',
      icon: Users,
      badgeText: 'الذمم المدينة والتحصيل',
      color: {
        bg: 'from-rose-500 to-red-600',
        activeBtn: 'bg-rose-600 text-white shadow-xs',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
      },
    },
    {
      id: 'expiryloss' as ReportTabType,
      title: 'المخزون والرواكد والصلاحية',
      shortTitle: 'مخاطر الصلاحية',
      subtitle: 'حماية رأس المال من الأدوية القريبة الانتهاء',
      icon: AlertTriangle,
      badgeText: 'حماية الهدر والتقادم',
      color: {
        bg: 'from-amber-600 to-red-600',
        activeBtn: 'bg-amber-600 text-white shadow-xs',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
      },
    },
    {
      id: 'expenses' as ReportTabType,
      title: 'المصروفات التشغيلية',
      shortTitle: 'المصروفات',
      subtitle: 'تحليل بنود النفقات والرواتب والإيجارات',
      icon: Coins,
      badgeText: `${stats.expenseCategories.length} بنود تشغيل`,
      color: {
        bg: 'from-violet-500 to-purple-700',
        activeBtn: 'bg-violet-600 text-white shadow-xs',
        badge: 'bg-violet-100 text-violet-800 border-violet-200',
      },
    },
  ], [stats]);

  const activeTabMeta = useMemo(() => {
    return reportTabs.find((t) => t.id === activeReportTab) || reportTabs[0];
  }, [reportTabs, activeReportTab]);

  // Filter and Sort Best Sellers
  const sortedBestSellers = useMemo(() => {
    let list = [...stats.bestSellers];
    if (productSearch.trim()) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          item.category.toLowerCase().includes(productSearch.toLowerCase())
      );
    }

    if (bestSellersSort === 'revenue') {
      list.sort((a, b) => b.revenue - a.revenue);
    } else if (bestSellersSort === 'profit') {
      list.sort((a, b) => b.profit - a.profit);
    } else if (bestSellersSort === 'qty') {
      list.sort((a, b) => b.qty - a.qty);
    }
    return list;
  }, [stats.bestSellers, productSearch, bestSellersSort]);

  if (!isOpen) return null;

  const ActiveIcon = activeTabMeta.icon;

  return (
    <div
      id="fullscreen-report-overlay"
      className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex flex-col overflow-hidden text-right font-sans select-none animate-in fade-in duration-200"
    >
      {/* Fullscreen Modal Content Container */}
      <div className="w-full h-full bg-slate-100 flex flex-col overflow-hidden">
        
        {/* TOP APP BAR (Header) */}
        <header className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 shrink-0 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
            
            {/* Right: Back Button & Report Title */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                id="btn-close-fullscreen-report"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-teal-700 text-slate-100 hover:text-white font-black text-xs sm:text-sm transition-all border border-slate-700 hover:border-teal-500 cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="الرجوع إلى لوحة مركز التقارير (Esc)"
              >
                <ArrowRight className="w-4 h-4 text-teal-400" />
                <span>الرجوع للوحة التقارير</span>
              </button>

              <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${activeTabMeta.color.bg} text-white flex items-center justify-center shadow-xs shrink-0`}>
                  <ActiveIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-base font-black text-white leading-tight">
                      {activeTabMeta.title}
                    </h2>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.2 rounded-full font-bold hidden sm:inline-block">
                      {activeTabMeta.badgeText}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-xs sm:max-w-md mt-0.5">
                    {activeTabMeta.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Left: Actions, Period, Date Selector, Catalog & Close */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
              
              {/* Period Quick Filter Badge */}
              <div className="flex items-center bg-slate-800 border border-slate-700 p-0.5 rounded-xl text-[11px]">
                <button
                  onClick={() => setDateRange('today')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    dateRange === 'today' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  اليوم
                </button>
                <button
                  onClick={() => setDateRange('yesterday')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    dateRange === 'yesterday' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  أمس
                </button>
                <button
                  onClick={() => setDateRange('week')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    dateRange === 'week' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  7 أيام
                </button>
                <button
                  onClick={() => setDateRange('month')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    dateRange === 'month' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  الشهر
                </button>
                <button
                  onClick={() => setDateRange('custom')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    dateRange === 'custom' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  مخصص
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenCatalogModal}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="دليل شروحات التقارير"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenPrintModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  title="طباعة التقرير كاملاً"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                  title="إغلاق الشاشة الكاملة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Sub-bar: Custom Date Pickers if active */}
          {dateRange === 'custom' && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-center gap-2 max-w-7xl mx-auto w-full flex-wrap text-xs">
              <span className="text-slate-400 font-bold text-[11px]">الفترة المخصصة:</span>
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px]">من:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px]">إلى:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none"
                />
              </div>
              <span className="text-teal-400 font-mono text-[11px] font-bold">({dateRangeStr})</span>
            </div>
          )}

          {/* Quick Switcher Horizontal Tabs: Instant Jump to other reports */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-7xl mx-auto w-full">
            <span className="text-[10px] text-slate-400 font-bold ml-1 shrink-0">التنقل السريع:</span>
            {reportTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeReportTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? tab.color.activeBtn
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* FULLSCREEN SCROLLABLE CONTENT BODY */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto w-full">
          
          {/* TAB 0: Item Movements Report */}
          {activeReportTab === 'item_movements' && (
            <ItemMovementReportTab
              dateRangeStr={dateRangeStr}
              dateRange={dateRange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onOpenPrintModal={onOpenPrintModal}
            />
          )}

          {/* TAB 1: P&L Statement */}
          {activeReportTab === 'pnl' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    قائمة الدخل والنتائج المالية المحققة (Income Statement)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    حساب الإيرادات الفعلية مقابل تكلفة البضاعة المباعة والمصروفات التشغيلية
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    الفترة: {dateRangeStr}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {/* 1. Revenue */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">+</span>
                    <span className="font-bold text-slate-800">إجمالي إيرادات المبيعات المحققة (Revenue):</span>
                  </div>
                  <span className="font-mono font-black text-emerald-700 text-base sm:text-lg">{formatCurrency(stats.salesTotal)}</span>
                </div>

                {/* 2. COGS */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">-</span>
                    <span className="font-medium text-slate-700">تكلفة شراء البضاعة المباعة (Cost of Goods Sold - COGS):</span>
                  </div>
                  <span className="font-mono font-black text-rose-600 text-base sm:text-lg">-{formatCurrency(stats.costTotal)}</span>
                </div>

                {/* 3. Gross Profit Bar */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-teal-50/90 border border-teal-200 text-xs sm:text-sm font-bold">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs">=</span>
                    <span className="text-teal-950 font-bold">مجمل الربح التجاري (Gross Profit):</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-teal-700 font-mono font-semibold">({stats.grossMargin}%)</span>
                    <span className="font-mono text-teal-800 text-base sm:text-xl font-black">{formatCurrency(stats.grossProfit)}</span>
                  </div>
                </div>

                {/* 4. Operating Expenses */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">-</span>
                    <span className="font-medium text-slate-700">المصروفات والنفقات التشغيلية (Operating Expenses - OPEX):</span>
                  </div>
                  <span className="font-mono font-black text-rose-600 text-base sm:text-lg">-{formatCurrency(stats.expensesTotal)}</span>
                </div>

                {/* 5. Net Profit Banner */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-400 text-sm font-bold shadow-2xs">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-black text-sm">★</span>
                    <div>
                      <span className="text-teal-950 font-black text-base sm:text-lg">صافي الربح الفعلي للصيدلية (Net Profit):</span>
                      <div className="text-xs text-teal-800 font-normal mt-0.5">بعد خصم كامل تكلفة المشتريات ومصاريف التشغيل</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`font-mono text-xl sm:text-3xl font-black ${stats.netProfit >= 0 ? 'text-teal-900' : 'text-rose-700'}`}>
                      {formatCurrency(stats.netProfit)}
                    </span>
                    <div className="text-xs text-teal-800 font-mono font-bold">هامش صافي: {stats.netMargin}%</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: Best Sellers Top Products */}
          {activeReportTab === 'bestsellers' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs space-y-0">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">ترتيب الأدوية الأكثر مبيعاً وتحقيقاً للأرباح</h3>
                  <p className="text-xs text-slate-500">تحليل المبيعات حسب الكميات، الإيرادات، وهوامش الربحية لكل صنف</p>
                </div>
                
                {/* Filter & Sort Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="بحث عن دواء أو قسم..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="px-3 py-1.5 pl-7 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-300 text-xs">
                    <button
                      onClick={() => setBestSellersSort('revenue')}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        bestSellersSort === 'revenue' ? 'bg-teal-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      الإيراد
                    </button>
                    <button
                      onClick={() => setBestSellersSort('profit')}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        bestSellersSort === 'profit' ? 'bg-teal-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      الربح
                    </button>
                    <button
                      onClick={() => setBestSellersSort('qty')}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        bestSellersSort === 'qty' ? 'bg-teal-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      الكمية
                    </button>
                  </div>

                  <button
                    onClick={() => excelService.exportBestSellersToCSV(stats.bestSellers)}
                    className="p-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="تصدير جدول الأصناف الأكثر مبيعاً إلى CSV"
                  >
                    <Download className="w-4 h-4 text-teal-600" />
                    <span className="hidden sm:inline">تصدير إكسل</span>
                  </button>
                </div>
              </div>

              {/* Mobile Card List View (< md) */}
              <div className="block md:hidden divide-y divide-slate-100 p-2 space-y-2">
                {sortedBestSellers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    لا توجد عمليات بيع مسجلة مطابقة في الفترة المحددة
                  </div>
                ) : (
                  sortedBestSellers.map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : idx === 2
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <h4 className="font-black text-slate-900 text-xs sm:text-sm">{item.name}</h4>
                            <span className="text-[10px] text-slate-500">{item.category}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-teal-100 text-teal-900 border border-teal-200 shrink-0">
                          هامش {item.margin}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                        <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                          <div className="text-[9px] text-slate-400 font-sans">الكمية المباعة</div>
                          <div className="text-xs font-bold text-slate-800">{item.qty}</div>
                        </div>
                        <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                          <div className="text-[9px] text-slate-400 font-sans">إجمالي الإيراد</div>
                          <div className="text-xs font-bold text-teal-800">{formatCurrency(item.revenue)}</div>
                        </div>
                        <div className="bg-white p-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                          <div className="text-[9px] text-emerald-600 font-sans">صافي الربح</div>
                          <div className="text-xs font-black text-emerald-700">{formatCurrency(item.profit)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-teal-50/80 text-teal-950 border-b border-teal-100 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">الصنف الدوائي والتصنيف</th>
                      <th className="p-3 text-center">الكمية المباعة</th>
                      <th className="p-3 text-left">إجمالي الإيرادات</th>
                      <th className="p-3 text-left">صافي الأرباح</th>
                      <th className="p-3 text-center">هامش الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {sortedBestSellers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400">
                          لا توجد عمليات بيع مسجلة مطابقة في الفترة المحددة
                        </td>
                      </tr>
                    ) : (
                      sortedBestSellers.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-teal-50/30 transition-colors">
                          <td className="p-3 text-center">
                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs font-mono ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</div>
                            <div className="text-[10px] text-slate-500">{item.category}</div>
                          </td>

                          <td className="p-3 text-center font-mono text-slate-800 font-bold">
                            {item.qty} <span className="text-slate-500 text-[10px]">وحدة</span>
                          </td>

                          <td className="p-3 text-left font-mono font-bold text-teal-800 text-xs sm:text-sm">
                            {formatCurrency(item.revenue)}
                          </td>

                          <td className="p-3 text-left font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                            {formatCurrency(item.profit)}
                          </td>

                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-teal-50 text-teal-800 border border-teal-200">
                              {item.margin}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Shift & Cashflow Z-Report */}
          {activeReportTab === 'shift' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    توزيع المقبوضات وتدفق النقدية حسب طريقة السداد (Z-Report)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    مطابقة النقد في درج الكاشير مع مبيعات الشبكة والذمم الآجلة
                  </p>
                </div>
                <button
                  onClick={() => printerService.printDailyFinancialReport(stats, settings, currentUser?.name)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  طباعة Z-Report
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Cash */}
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>المقبوض نقداً (درج الكاشير):</span>
                    <Banknote className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-800 mt-3">
                    {formatCurrency(stats.cashSales)}
                  </div>
                  <div className="text-xs text-emerald-700 mt-1.5 font-medium">
                    يشكل نسبة {stats.salesTotal > 0 ? Math.round((stats.cashSales / stats.salesTotal) * 100) : 0}% من إجمالي المبيعات
                  </div>
                </div>

                {/* Card / POS */}
                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-sky-800 font-bold">
                    <span>المحصل عبر الشبكة والبطاقات:</span>
                    <CreditCard className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-sky-800 mt-3">
                    {formatCurrency(stats.cardSales)}
                  </div>
                  <div className="text-xs text-sky-700 mt-1.5 font-medium">
                    يشكل نسبة {stats.salesTotal > 0 ? Math.round((stats.cardSales / stats.salesTotal) * 100) : 0}% من إجمالي المبيعات
                  </div>
                </div>

                {/* Credit / Receivables */}
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                    <span>مبيعات آجلة (ذمم عملاء معلقة):</span>
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-amber-800 mt-3">
                    {formatCurrency(stats.creditSales)}
                  </div>
                  <div className="text-xs text-amber-700 mt-1.5 font-medium">
                    يشكل نسبة {stats.salesTotal > 0 ? Math.round((stats.creditSales / stats.salesTotal) * 100) : 0}% من إجمالي المبيعات
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold">إجمالي المبالغ النقدية والبنكية المقبوضة فعلياً (نقد + شبكة):</span>
                <span className="font-mono font-black text-teal-900 text-lg sm:text-xl">
                  {formatCurrency(stats.cashSales + stats.cardSales)}
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: Purchases & Supplier Payables */}
          {activeReportTab === 'purchases_debts' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    تقرير المشتريات ومستحقات الموردين والشركات
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    متابعة التوريدات، المدفوعات المسددة، والديون الدائنة المستحقة للموردين
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('purchases');
                    if (setPurchasesSubTab) setPurchasesSubTab('invoices');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  الانتقال لسجل المشتريات
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">إجمالي التوريدات في الفترة:</span>
                  <span className="text-2xl font-mono font-black text-slate-900 mt-2 block">
                    {formatCurrency(stats.purchasesTotal)}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    المسدد نقداً/بنكياً: {formatCurrency(stats.purchasesPaid)}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <span className="text-xs text-rose-800 block font-bold">إجمالي ديون ومستحقات الموردين:</span>
                  <span className="text-2xl font-mono font-black text-rose-700 mt-2 block">
                    {formatCurrency(stats.supplierDebtsTotal)}
                  </span>
                  <span className="text-xs text-rose-700 mt-1 block font-medium">
                    على {stats.indebtedSuppliersCount} شركة ومورد دائن
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-teal-800 block font-bold">إجراءات الموردين:</span>
                    <span className="text-xs text-teal-900 mt-1 block">
                      إصدار سندات صرف وكشوفات حساب رسمية
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      setActiveTab('purchases');
                      if (setPurchasesSubTab) setPurchasesSubTab('suppliers');
                    }}
                    className="mt-3 w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    فتح دليل الموردين والكشوفات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Customer Receivables & Debtors */}
          {activeReportTab === 'customer_debts' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    تقرير ديون وذمم العملاء والتحصيل (Customer Receivables)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    متابعة الذمم المدينة، المرضى المدينين، والتحصيلات النقدية
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('customers');
                    if (setCustomersSubTab) setCustomersSubTab('reports');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  الانتقال لسجل العملاء والتحصيل
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-xs text-amber-900 block font-bold">إجمالي ديون وذمم العملاء:</span>
                  <span className="text-2xl font-mono font-black text-amber-800 mt-2 block">
                    {formatCurrency(stats.customerDebtsTotal)}
                  </span>
                  <span className="text-xs text-amber-700 mt-1 block font-medium">
                    موزعة على {stats.debtorsCount} عميل ومريض مدين
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">المبيعات الآجلة في الفترة الحالية:</span>
                  <span className="text-2xl font-mono font-black text-slate-900 mt-2 block">
                    {formatCurrency(stats.creditSales)}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    تسجل مباشرة في الذمم المدينة
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-teal-800 block font-bold">إدارة الذمم:</span>
                    <span className="text-xs text-teal-900 mt-1 block">
                      تسجيل سندات قبض وطباعة كشوفات معتمدة
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      setActiveTab('customers');
                      if (setCustomersSubTab) setCustomersSubTab('receipts');
                    }}
                    className="mt-3 w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    تسجيل سند قبض مالي للعملاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Expiry & Inventory Risk */}
          {activeReportTab === 'expiryloss' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    تحليل تقادم المخزون والمخاطر المالية لانتهاء الصلاحية
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تقييم الأدوية القريبة من الانتهاء لحمايتها من التلف والحد من الخسائر
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('inventory');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  إدارة دفعات المخزون
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">إجمالي رأس مال المخزون الحالي:</span>
                  <span className="text-2xl font-mono font-black text-slate-900 mt-2 block">
                    {formatCurrency(stats.totalStockCost)}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-xs text-amber-800 block font-bold">قيمة الأدوية المنتهية خلال 90 يوم:</span>
                  <span className="text-2xl font-mono font-black text-amber-700 mt-2 block">
                    {formatCurrency(stats.nearExpiryLoss)}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200">
                  <span className="text-xs text-teal-800 block font-bold">عدد الدفعات المهددة:</span>
                  <span className="text-2xl font-mono font-black text-teal-900 mt-2 block">
                    {stats.nearExpiryCount} تشغيلة
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 text-xs sm:text-sm text-teal-900 leading-relaxed">
                <div className="font-bold mb-2 flex items-center gap-2 text-teal-950 text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  توصيات النظام للحد من الهدر المالي:
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-700 mr-2">
                  <li>تطبيق سياسة الصرف بالأقدم انتهاءً أولاً (FEFO - First Expired First Out).</li>
                  <li>التواصل مع الموردين لإرجاع أو استبدال الدفعات قبل 60 يوماً من موعد الانتهاء.</li>
                  <li>تقديم عروض أو خصومات للأطباء والمرضى للأصناف سريعة الدوران القريبة من الانتهاء.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 7: Operating Expenses Breakdown */}
          {activeReportTab === 'expenses' && (
            <div className="bg-white border border-teal-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    تحليل المصروفات والنفقات التشغيلية (OPEX)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    توزيع المصروفات حسب البنود وتأثيرها على صافي الأرباح
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('expenses');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  تسجيل نفقة جديدة
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.expenseCategories.length === 0 ? (
                  <div className="col-span-full p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    لا توجد مصروفات مسجلة في الفترة المحددة
                  </div>
                ) : (
                  stats.expenseCategories.map((exp: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm sm:text-base text-slate-900">{exp.category}</div>
                        <div className="text-xs text-slate-500 mt-1">{exp.count} حركة صرف</div>
                      </div>
                      <div className="text-left font-mono font-bold text-rose-600 text-base sm:text-lg">
                        {formatCurrency(exp.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};
