import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Package,
  Boxes,
  Truck,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Batch, Product } from '../../types';

export interface ExpiryDashboardTrackerProps {
  batches: Batch[];
  products: Product[];
  onNavigateToExpiryRiskTab?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToPurchases?: () => void;
}

export type ExpiryTier = 'all' | 'expired' | '30' | '60' | '90';

export const ExpiryDashboardTracker: React.FC<ExpiryDashboardTrackerProps> = ({
  batches,
  products,
  onNavigateToExpiryRiskTab,
  onNavigateToInventory,
  onNavigateToPurchases,
}) => {
  const { formatCurrency, setActiveTab, setInventorySubTab } = useSettingsStore();
  const [selectedTier, setSelectedTier] = useState<ExpiryTier>('all');

  const now = useMemo(() => new Date(), []);
  
  // Build product lookup map for fast details
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Categorize batches into strict 30, 60, 90 days and expired
  const expiryAnalysis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired: (Batch & { daysRemaining: number; statusText: string; tier: 'expired' })[] = [];
    const within30: (Batch & { daysRemaining: number; statusText: string; tier: '30' })[] = [];
    const within60: (Batch & { daysRemaining: number; statusText: string; tier: '60' })[] = [];
    const within90: (Batch & { daysRemaining: number; statusText: string; tier: '90' })[] = [];
    const safeBatches: Batch[] = [];

    batches.forEach((b) => {
      if (b.quantity <= 0 || !b.expiryDate) return;

      const exp = new Date(b.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expired.push({
          ...b,
          daysRemaining: diffDays,
          statusText: diffDays === 0 ? 'ينتهي اليوم' : `منتهي منذ ${Math.abs(diffDays)} يوم`,
          tier: 'expired',
        });
      } else if (diffDays <= 30) {
        within30.push({
          ...b,
          daysRemaining: diffDays,
          statusText: `متبقي ${diffDays} يوم (حرج جداً)`,
          tier: '30',
        });
      } else if (diffDays <= 60) {
        within60.push({
          ...b,
          daysRemaining: diffDays,
          statusText: `متبقي ${diffDays} يوم (تخفيض/تصفية)`,
          tier: '60',
        });
      } else if (diffDays <= 90) {
        within90.push({
          ...b,
          daysRemaining: diffDays,
          statusText: `متبقي ${diffDays} يوم (مهلة إرجاع)`,
          tier: '90',
        });
      } else {
        safeBatches.push(b);
      }
    });

    // Sort each group ascending by expiry date
    expired.sort((a, b) => a.daysRemaining - b.daysRemaining);
    within30.sort((a, b) => a.daysRemaining - b.daysRemaining);
    within60.sort((a, b) => a.daysRemaining - b.daysRemaining);
    within90.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const totalAtRiskCount = expired.length + within30.length + within60.length + within90.length;

    const expiredCost = expired.reduce((sum, b) => sum + (b.costPrice || 0) * b.quantity, 0);
    const within30Cost = within30.reduce((sum, b) => sum + (b.costPrice || 0) * b.quantity, 0);
    const within60Cost = within60.reduce((sum, b) => sum + (b.costPrice || 0) * b.quantity, 0);
    const within90Cost = within90.reduce((sum, b) => sum + (b.costPrice || 0) * b.quantity, 0);
    const totalRiskCost = expiredCost + within30Cost + within60Cost + within90Cost;

    return {
      expired,
      within30,
      within60,
      within90,
      safeBatches,
      totalAtRiskCount,
      expiredCost,
      within30Cost,
      within60Cost,
      within90Cost,
      totalRiskCost,
    };
  }, [batches]);

  // Selected batch list for presentation
  const displayedBatches = useMemo(() => {
    if (selectedTier === 'expired') return expiryAnalysis.expired;
    if (selectedTier === '30') return expiryAnalysis.within30;
    if (selectedTier === '60') return expiryAnalysis.within60;
    if (selectedTier === '90') return expiryAnalysis.within90;
    
    // 'all' shows all at risk starting from most critical
    return [
      ...expiryAnalysis.expired,
      ...expiryAnalysis.within30,
      ...expiryAnalysis.within60,
      ...expiryAnalysis.within90,
    ];
  }, [selectedTier, expiryAnalysis]);

  const handleOpenRiskRoom = () => {
    if (onNavigateToExpiryRiskTab) {
      onNavigateToExpiryRiskTab();
    } else {
      setActiveTab('inventory');
      setInventorySubTab('expiry_hub');
    }
  };

  return (
    <div id="dashboard-expiry-indicator-card" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 select-none space-y-4">
      
      {/* 1. Header with Live Status & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900 leading-tight">
                مؤشر ومتابعة تواريخ الصلاحية (30 / 60 / 90 يوم)
              </h3>
              {expiryAnalysis.totalAtRiskCount > 0 ? (
                <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  {expiryAnalysis.totalAtRiskCount} تشغيلات بحاجة لاتخاذ إجراء
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  جميع الدفعات آمنة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              نظام ترميز لوني ذكي لتصنيف الأدوية المعرضة لانتهاء الصلاحية وحماية رأس مال الصيدلية
            </p>
          </div>
        </div>

        {/* Action Link to Full Expiry Hub */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenRiskRoom}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-900 to-slate-900 hover:from-rose-800 hover:to-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>غرفة عمليات الصلاحية والمرتجع</span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. Color-Coded Expiry Indicators (30 / 60 / 90 Days + Expired) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* Tier 1: Expired (Red / Maroon) */}
        <button
          type="button"
          onClick={() => setSelectedTier(selectedTier === 'expired' ? 'all' : 'expired')}
          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedTier === 'expired'
              ? 'bg-rose-900 text-white border-rose-900 ring-2 ring-rose-500 shadow-md'
              : 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/80 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-black flex items-center gap-1.5 ${selectedTier === 'expired' ? 'text-rose-200' : 'text-rose-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shadow-sm" />
              منتهية الصلاحية
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${selectedTier === 'expired' ? 'bg-rose-800 text-rose-200' : 'bg-rose-200/80 text-rose-900'}`}>
              إتلاف فوري
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black font-mono">
                {expiryAnalysis.expired.length}
              </span>
              <span className={`text-xs font-mono font-bold ${selectedTier === 'expired' ? 'text-rose-300' : 'text-rose-700'}`}>
                {formatCurrency(expiryAnalysis.expiredCost)}
              </span>
            </div>
            <span className={`text-[10px] block mt-0.5 ${selectedTier === 'expired' ? 'text-rose-300' : 'text-slate-500'}`}>
              دفعات منتهية يجب عزلها
            </span>
          </div>
        </button>

        {/* Tier 2: ≤ 30 Days (Bright Red / Critical) */}
        <button
          type="button"
          onClick={() => setSelectedTier(selectedTier === '30' ? 'all' : '30')}
          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedTier === '30'
              ? 'bg-red-700 text-white border-red-700 ring-2 ring-red-400 shadow-md'
              : 'bg-red-50/70 border-red-200/80 hover:bg-red-100/80 text-red-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-black flex items-center gap-1.5 ${selectedTier === '30' ? 'text-red-100' : 'text-red-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm" />
              أقل من 30 يوماً
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${selectedTier === '30' ? 'bg-red-800 text-red-200' : 'bg-red-200/80 text-red-900'}`}>
              حرج جداً
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black font-mono">
                {expiryAnalysis.within30.length}
              </span>
              <span className={`text-xs font-mono font-bold ${selectedTier === '30' ? 'text-red-200' : 'text-red-700'}`}>
                {formatCurrency(expiryAnalysis.within30Cost)}
              </span>
            </div>
            <span className={`text-[10px] block mt-0.5 ${selectedTier === '30' ? 'text-red-200' : 'text-slate-500'}`}>
              عروض تصفية / استبدال سريع
            </span>
          </div>
        </button>

        {/* Tier 3: 31 to 60 Days (Orange / Warning) */}
        <button
          type="button"
          onClick={() => setSelectedTier(selectedTier === '60' ? 'all' : '60')}
          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedTier === '60'
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-md'
              : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/80 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-black flex items-center gap-1.5 ${selectedTier === '60' ? 'text-amber-100' : 'text-amber-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm" />
              خلال 31 - 60 يوماً
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${selectedTier === '60' ? 'bg-amber-700 text-amber-200' : 'bg-amber-200/80 text-amber-900'}`}>
              تخفيض وتنبيه
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black font-mono">
                {expiryAnalysis.within60.length}
              </span>
              <span className={`text-xs font-mono font-bold ${selectedTier === '60' ? 'text-amber-200' : 'text-amber-700'}`}>
                {formatCurrency(expiryAnalysis.within60Cost)}
              </span>
            </div>
            <span className={`text-[10px] block mt-0.5 ${selectedTier === '60' ? 'text-amber-200' : 'text-slate-500'}`}>
              أولوية صرف في الكاشير
            </span>
          </div>
        </button>

        {/* Tier 4: 61 to 90 Days (Yellow-Amber / Supplier Return Window) */}
        <button
          type="button"
          onClick={() => setSelectedTier(selectedTier === '90' ? 'all' : '90')}
          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedTier === '90'
              ? 'bg-teal-700 text-white border-teal-700 ring-2 ring-teal-400 shadow-md'
              : 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/80 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-black flex items-center gap-1.5 ${selectedTier === '90' ? 'text-emerald-100' : 'text-emerald-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
              خلال 61 - 90 يوماً
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${selectedTier === '90' ? 'bg-teal-800 text-emerald-200' : 'bg-emerald-200/80 text-emerald-900'}`}>
              مهلة الموردين
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black font-mono">
                {expiryAnalysis.within90.length}
              </span>
              <span className={`text-xs font-mono font-bold ${selectedTier === '90' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                {formatCurrency(expiryAnalysis.within90Cost)}
              </span>
            </div>
            <span className={`text-[10px] block mt-0.5 ${selectedTier === '90' ? 'text-emerald-200' : 'text-slate-500'}`}>
              مؤهلة لسياسة الإرجاع
            </span>
          </div>
        </button>

      </div>

      {/* 3. Filtered Items List Display */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
        {/* Subheader bar with filter pills */}
        <div className="p-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              عرض التشغيلات حسب الصلاحية:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedTier('all')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTier === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كافة المعرضة ({expiryAnalysis.totalAtRiskCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('expired')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTier === 'expired'
                    ? 'bg-rose-600 text-white shadow-2xs font-black'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                منتهية ({expiryAnalysis.expired.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('30')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTier === '30'
                    ? 'bg-red-600 text-white shadow-2xs font-black'
                    : 'text-red-700 hover:text-red-900'
                }`}
              >
                ≤ 30 يوم ({expiryAnalysis.within30.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('60')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTier === '60'
                    ? 'bg-amber-600 text-white shadow-2xs font-black'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                31-60 يوم ({expiryAnalysis.within60.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('90')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTier === '90'
                    ? 'bg-teal-700 text-white shadow-2xs font-black'
                    : 'text-teal-800 hover:text-teal-950'
                }`}
              >
                61-90 يوم ({expiryAnalysis.within90.length})
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            إجمالي القيمة المعرضة: <b className="font-mono text-slate-800">{formatCurrency(expiryAnalysis.totalRiskCost)}</b>
          </div>
        </div>

        {/* Batches Table / List */}
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-200/80">
          {displayedBatches.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-1">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold">
                ✓
              </div>
              <p className="font-bold text-slate-700">لا توجد دفعات أدوية في هذا النطاق الزمني</p>
              <p className="text-[11px] text-slate-400">مخزون الصيدلية منتظم وصالح وفق معايير الجودة</p>
            </div>
          ) : (
            displayedBatches.map((batch) => {
              const prod = productMap.get(batch.productId);
              const isExpired = batch.daysRemaining <= 0;
              const is30 = batch.daysRemaining > 0 && batch.daysRemaining <= 30;
              const is60 = batch.daysRemaining > 30 && batch.daysRemaining <= 60;
              const is90 = batch.daysRemaining > 60 && batch.daysRemaining <= 90;

              // Border and Badge color mapping
              const badgeClasses = isExpired
                ? 'bg-rose-100 text-rose-900 border-rose-300'
                : is30
                ? 'bg-red-100 text-red-900 border-red-300'
                : is60
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300';

              const indicatorPillBg = isExpired
                ? 'bg-rose-600'
                : is30
                ? 'bg-red-500'
                : is60
                ? 'bg-amber-500'
                : 'bg-emerald-600';

              return (
                <div
                  key={batch.id}
                  className="p-3 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Product & Batch Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-8 rounded-full shrink-0 ${indicatorPillBg}`} />
                    
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                        {prod?.name || batch.productName}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                        <span>تشغيلة: <b className="font-mono text-slate-700">#{batch.batchNumber}</b></span>
                        <span>•</span>
                        <span>المتبقي بالمخزن: <b className="font-mono text-slate-800">{batch.quantity} عبوة</b></span>
                        {batch.supplierName && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600">المورد: {batch.supplierName}</span>
                          </>
                        )}
                        {prod?.locationRack && (
                          <>
                            <span>•</span>
                            <span className="text-teal-700">رف: {prod.locationRack}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Expiry Date, Remaining Days, Valuation */}
                  <div className="text-left shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${badgeClasses}`}>
                        {batch.statusText}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center justify-end gap-2">
                      <span>تاريخ الصلاحية: <b className="text-slate-700">{batch.expiryDate}</b></span>
                      <span>•</span>
                      <span className="font-bold text-slate-800">{formatCurrency(batch.costPrice * batch.quantity)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
