import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Scale,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Download,
  Plus,
  Minus,
  Check,
  MapPin,
  X,
  FileCheck,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Package
} from 'lucide-react';
import { Batch, Product } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';

interface InventoryAuditTabProps {
  batches: Batch[];
  products: Product[];
  onRefresh: () => void;
  canEditInventory: boolean;
}

interface AuditItem {
  batchId: string;
  productId: string;
  productName: string;
  scientificName?: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
  locationRack: string;
  systemQty: number;
  countedQty: number;
  isCounted: boolean;
  varianceQty: number;
  varianceCost: number;
}

export const InventoryAuditTab: React.FC<InventoryAuditTabProps> = ({
  batches,
  products,
  onRefresh,
  canEditInventory,
}) => {
  const { formatCurrency, settings, showToast } = useSettingsStore();
  const [selectedRack, setSelectedRack] = useState<string>('الكل');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [filterMode, setFilterMode] = useState<'all' | 'variance' | 'counted' | 'uncounted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [scanMode, setScanMode] = useState<'increment' | 'set'>('increment');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [auditNotes, setAuditNotes] = useState<string>('جرد دوري ومطابقة رفوف المخزون');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Available unique racks
  const availableRacks = useMemo(() => {
    const racks = new Set<string>();
    products.forEach((p) => {
      if (p.locationRack && p.locationRack.trim()) {
        racks.add(p.locationRack.trim());
      }
    });
    return ['الكل', ...Array.from(racks).sort()];
  }, [products]);

  // Categories
  const categories = useMemo(() => {
    return ['الكل', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  // Product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Local state for counts (persisted across session in React state)
  const [countedMap, setCountedMap] = useState<Map<string, number>>(() => new Map());
  const [isCountedSet, setIsCountedSet] = useState<Set<string>>(() => new Set());

  // Initialize or maintain countedMap
  const auditItems: AuditItem[] = useMemo(() => {
    return batches.map((b) => {
      const prod = productMap.get(b.productId);
      const isCounted = isCountedSet.has(b.id);
      const countedQty = isCounted ? (countedMap.get(b.id) ?? b.quantity) : b.quantity;
      const varianceQty = isCounted ? countedQty - b.quantity : 0;
      const varianceCost = varianceQty * b.costPrice;

      return {
        batchId: b.id,
        productId: b.productId,
        productName: prod?.name || b.productName || 'دواء',
        scientificName: prod?.scientificName,
        barcode: prod?.barcode || '',
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        costPrice: b.costPrice,
        sellingPrice: b.sellingPrice,
        locationRack: prod?.locationRack || 'الرف العام',
        systemQty: b.quantity,
        countedQty,
        isCounted,
        varianceQty,
        varianceCost,
      };
    });
  }, [batches, productMap, countedMap, isCountedSet]);

  // Filtered items
  const filteredAuditItems = useMemo(() => {
    return auditItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        (item.scientificName && item.scientificName.toLowerCase().includes(q)) ||
        item.barcode.includes(q) ||
        item.batchNumber.toLowerCase().includes(q) ||
        item.locationRack.toLowerCase().includes(q);

      const prod = productMap.get(item.productId);
      const matchesCategory = selectedCategory === 'الكل' || prod?.category === selectedCategory;
      const matchesRack = selectedRack === 'الكل' || item.locationRack === selectedRack;

      let matchesFilterMode = true;
      if (filterMode === 'variance') {
        matchesFilterMode = item.isCounted && item.varianceQty !== 0;
      } else if (filterMode === 'counted') {
        matchesFilterMode = item.isCounted;
      } else if (filterMode === 'uncounted') {
        matchesFilterMode = !item.isCounted;
      }

      return matchesSearch && matchesCategory && matchesRack && matchesFilterMode;
    });
  }, [auditItems, searchQuery, selectedCategory, selectedRack, filterMode, productMap]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalItems = auditItems.length;
    let countedItems = 0;
    let matchingItems = 0;
    let surplusCount = 0;
    let shortageCount = 0;
    let totalSurplusCost = 0;
    let totalShortageCost = 0;

    auditItems.forEach((item) => {
      if (item.isCounted) {
        countedItems++;
        if (item.varianceQty === 0) {
          matchingItems++;
        } else if (item.varianceQty > 0) {
          surplusCount++;
          totalSurplusCost += item.varianceCost;
        } else {
          shortageCount++;
          totalShortageCost += Math.abs(item.varianceCost);
        }
      }
    });

    const netVarianceCost = totalSurplusCost - totalShortageCost;

    return {
      totalItems,
      countedItems,
      matchingItems,
      surplusCount,
      shortageCount,
      totalSurplusCost,
      totalShortageCost,
      netVarianceCost,
      completionRate: totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0,
    };
  }, [auditItems]);

  // Handle Barcode Scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    // Find batch matching barcode or batch number
    const matchingBatches = auditItems.filter(
      (item) => item.barcode === barcode || item.batchNumber.toLowerCase() === barcode.toLowerCase()
    );

    if (matchingBatches.length === 0) {
      showToast(`لم يتم العثور على تشغيلة بالباركود أو الرقم (${barcode})`, 'warning');
      setBarcodeInput('');
      return;
    }

    // Pick first or primary matching batch
    const target = matchingBatches[0];
    const currentCount = isCountedSet.has(target.batchId)
      ? countedMap.get(target.batchId) ?? target.systemQty
      : target.systemQty;

    const newCount = scanMode === 'increment' ? currentCount + 1 : currentCount;

    setCountedMap((prev) => {
      const next = new Map(prev);
      next.set(target.batchId, newCount);
      return next;
    });

    setIsCountedSet((prev) => {
      const next = new Set(prev);
      next.add(target.batchId);
      return next;
    });

    showToast(`تم تسجيل مسح (${target.productName}) • الفعلي: ${newCount}`, 'success');
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Update item count
  const handleUpdateCount = (batchId: string, newCount: number) => {
    const validCount = Math.max(0, newCount);
    setCountedMap((prev) => {
      const next = new Map(prev);
      next.set(batchId, validCount);
      return next;
    });

    setIsCountedSet((prev) => {
      const next = new Set(prev);
      next.add(batchId);
      return next;
    });
  };

  // Mark all currently filtered items as counted matching system
  const handleMarkFilteredAsMatching = () => {
    setCountedMap((prev) => {
      const next = new Map(prev);
      filteredAuditItems.forEach((item) => {
        if (!next.has(item.batchId)) {
          next.set(item.batchId, item.systemQty);
        }
      });
      return next;
    });

    setIsCountedSet((prev) => {
      const next = new Set(prev);
      filteredAuditItems.forEach((item) => next.add(item.batchId));
      return next;
    });

    showToast(`تم تأكيد مطابقة ${filteredAuditItems.length} تشغيلة مع أرصدة النظام`, 'info');
  };

  // Reset audit session
  const handleResetAudit = () => {
    if (confirm('هل تريد إعادة تعيين جلسة الجرد وتصفير التعديلات غير المعتمدة؟')) {
      setCountedMap(new Map());
      setIsCountedSet(new Set());
      showToast('تمت إعادة تعيين جلسة الجرد', 'info');
    }
  };

  // Apply all adjustments to DB
  const handleApplyAllAdjustments = () => {
    const varianceItems = auditItems.filter((i) => i.isCounted && i.varianceQty !== 0);

    if (varianceItems.length === 0) {
      showToast('لا توجد فروقات أو تسويات تتطلب الاعتماد في قاعدة البيانات', 'info');
      return;
    }

    if (
      !confirm(
        `هل أنت متأكد من اعتماد نتائج الجرد؟ سيتم تطبيق (${varianceItems.length}) تسوية جردية رسمية وتحديث أرصدة المخزون وتسجيل القيود في سجل التدقيق.`
      )
    ) {
      return;
    }

    setIsApplying(true);
    try {
      varianceItems.forEach((item) => {
        const reason = `${auditNotes} (الرصيد السابق: ${item.systemQty}، الفعلي: ${item.countedQty}، الفارق: ${
          item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty
        })`;
        db.adjustBatchQuantity(item.batchId, item.countedQty, reason, 'usr-1', 'مدير الصيدلية');
      });

      onRefresh();
      showToast(`تم بنجاح تطبيق واعتماد (${varianceItems.length}) تسوية جردية في المخزون 🎉`, 'success');

      // Clear counted items
      setCountedMap(new Map());
      setIsCountedSet(new Set());
    } catch (err) {
      showToast('حدث خطأ أثناء تطبيق التسويات الجردية', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Export to Excel
  const handleExportAuditSheet = () => {
    const headers = [
      'اسم الصنف الدوائي',
      'الاسم العلمي',
      'الباركود',
      'التشغيلة',
      'تاريخ الانتهاء',
      'موقع الرف',
      'رصيد النظام',
      'الرصيد الفعلي المعدود',
      'الفارق (حبة/عبوة)',
      'سعر التكلفة',
      'فارق القيمة المالية',
    ];

    const rows = filteredAuditItems.map((item) => [
      item.productName,
      item.scientificName || '-',
      item.barcode,
      item.batchNumber,
      item.expiryDate,
      item.locationRack,
      item.systemQty,
      item.isCounted ? item.countedQty : 'لم يجرد بعد',
      item.isCounted ? item.varianceQty : '-',
      item.costPrice,
      item.isCounted ? item.varianceCost : 0,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `استمارة_جرد_المخزون_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('تم تصدير استمارة الجرد ومحضر التسوية بنجاح إلى ملف CSV', 'success');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden text-slate-800">
      {/* 1. Header Control Bar with Live Barcode Scanning */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-lg p-2 sm:p-2.5 border border-teal-700/50 shadow-2xs space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-600/60 text-teal-100 border border-teal-500/40">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs sm:text-sm text-white">
                  محطة الجرد الدوري ومطابقة الأرفف (Smart Cycle Count)
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40">
                  Live Scanner
                </span>
              </div>
              <p className="text-[10px] text-teal-200">
                امسح باركود الدواء أو أدخل الكميات الفعلية لحساب الفروقات والتسوية التلقائية
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleMarkFilteredAsMatching}
              className="px-2 py-1 rounded bg-teal-700/80 hover:bg-teal-600 text-teal-100 border border-teal-500/40 font-bold text-[10px] flex items-center gap-1 transition-all"
              title="تحديد كافة المعروض كأرصدة مطابقة للنظام"
            >
              <Check className="w-3 h-3 text-teal-300" />
              <span>تأكيد مطابقة المعروض ({filteredAuditItems.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportAuditSheet}
              className="px-2 py-1 rounded bg-teal-700/80 hover:bg-teal-600 text-teal-100 border border-teal-500/40 font-bold text-[10px] flex items-center gap-1 transition-all"
              title="تصدير كشف الجرد إلى Excel"
            >
              <Download className="w-3 h-3 text-teal-300" />
              <span>تصدير الكشف</span>
            </button>

            <button
              type="button"
              onClick={handleResetAudit}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[10px] flex items-center gap-1 transition-all"
              title="إعادة تعيين الجلسة"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة تعيين</span>
            </button>
          </div>
        </div>

        {/* Barcode Scan Field + Scan Mode Toggle */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <Barcode className="w-4 h-4 text-teal-400 absolute right-2.5 top-2" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="امسح الباركود أو رقم التشغيلة هنا للزيادة التلقائية..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full bg-slate-950/80 border border-teal-500/60 focus:border-teal-400 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none shadow-inner font-mono"
            />
          </div>

          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-teal-600/40 text-[10px] shrink-0">
            <button
              type="button"
              onClick={() => setScanMode('increment')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                scanMode === 'increment' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              زيادة عند كل مسح (+1)
            </button>
            <button
              type="button"
              onClick={() => setScanMode('set')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                scanMode === 'set' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              تحديد ومطابقة فورية
            </button>
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
          >
            <span>مسح ✓</span>
          </button>
        </form>
      </div>

      {/* 2. Audit KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 shrink-0">
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500">نسبة إنجاز الجرد</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-teal-800">{summary.completionRate}%</span>
            <span className="text-[9px] text-slate-400 font-mono">
              ({summary.countedItems}/{summary.totalItems})
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
            <div className="bg-teal-600 h-1 rounded-full transition-all" style={{ width: `${summary.completionRate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-1.5 border border-emerald-100 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-800">الأصناف المطابقة تماماً</div>
          <div className="text-sm font-black font-mono text-emerald-700 mt-0.5">
            {summary.matchingItems}{' '}
            <span className="text-[9px] font-normal text-slate-500">تشغيلة (فارق 0)</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-1.5 border border-rose-100 shadow-2xs">
          <div className="text-[10px] font-bold text-rose-800">عجز في المخزون (نقص)</div>
          <div className="text-sm font-black font-mono text-rose-700 mt-0.5">
            {summary.shortageCount}{' '}
            <span className="text-[9px] font-normal text-slate-500">تشغيلة</span>
          </div>
          <div className="text-[9px] text-rose-600 font-mono font-bold">
            -{formatCurrency(summary.totalShortageCost)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-1.5 border border-blue-100 shadow-2xs">
          <div className="text-[10px] font-bold text-blue-800">فائض في المخزون (زيادة)</div>
          <div className="text-sm font-black font-mono text-blue-700 mt-0.5">
            {summary.surplusCount}{' '}
            <span className="text-[9px] font-normal text-slate-500">تشغيلة</span>
          </div>
          <div className="text-[9px] text-blue-600 font-mono font-bold">
            +{formatCurrency(summary.totalSurplusCost)}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white rounded-lg p-1.5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-600">صافي أثر التسوية المالية</div>
          <div
            className={`text-xs sm:text-sm font-black font-mono ${
              summary.netVarianceCost >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {summary.netVarianceCost >= 0 ? '+' : ''}
            {formatCurrency(summary.netVarianceCost)}
          </div>
          <div className="text-[9px] text-slate-400">فارق تكلفة الفائض والعجز</div>
        </div>
      </div>

      {/* 3. Filter & Commit Actions Bar */}
      <div className="bg-white rounded-lg p-1 border border-teal-100 shadow-2xs flex items-center justify-between gap-1 shrink-0 flex-wrap">
        {/* Search & Location Filter */}
        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-slate-400 absolute right-2 top-1.5" />
            <input
              type="text"
              placeholder="بحث بالدواء أو الباركود أو الرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded pr-6 pl-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Rack Selector */}
          <div className="w-32 shrink-0">
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              {availableRacks.map((r) => (
                <option key={r} value={r}>
                  {r === 'الكل' ? 'جميع الأرفف' : `موقع: ${r}`}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="w-28 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'الكل' ? 'المجموعات' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Mode Chips */}
        <div className="flex items-center gap-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              filterMode === 'all'
                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            الكل ({filteredAuditItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('variance')}
            className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
              filterMode === 'variance'
                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
            <span>فروقات ({summary.shortageCount + summary.surplusCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('uncounted')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              filterMode === 'uncounted'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            لم تجرد ({summary.totalItems - summary.countedItems})
          </button>
        </div>

        {/* Master Apply Adjustments Button */}
        {canEditInventory && (
          <button
            type="button"
            disabled={isApplying || summary.shortageCount + summary.surplusCount === 0}
            onClick={handleApplyAllAdjustments}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="تطبيق واعتماد التسويات الجردية في قاعدة البيانات"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>اعتماد تسويات الجرد ({summary.shortageCount + summary.surplusCount})</span>
          </button>
        )}
      </div>

      {/* 4. Live Audit Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
              <tr>
                <th className="py-1.5 px-2">اسم الصنف الدوائي والمواصفات</th>
                <th className="py-1.5 px-1.5">التشغيلة / الصلاحية</th>
                <th className="py-1.5 px-1.5">موقع الرف</th>
                <th className="py-1.5 px-1.5 text-center">رصيد النظام</th>
                <th className="py-1.5 px-1.5 text-center min-w-[140px]">الرصيد الفعلي المعدود</th>
                <th className="py-1.5 px-1.5 text-center">الفارق</th>
                <th className="py-1.5 px-1.5 text-left">أثر التكلفة</th>
                <th className="py-1.5 px-1.5 text-center">حالة المطابقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAuditItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Scale className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-bold text-slate-700 text-xs">لا توجد عناصر مطابقة للبحث أو التصفية</p>
                  </td>
                </tr>
              ) : (
                filteredAuditItems.map((item) => {
                  const hasVariance = item.isCounted && item.varianceQty !== 0;
                  const isSurplus = item.varianceQty > 0;

                  return (
                    <tr
                      key={item.batchId}
                      className={`hover:bg-teal-50/50 transition-colors ${
                        !item.isCounted
                          ? 'opacity-85'
                          : hasVariance
                          ? isSurplus
                            ? 'bg-blue-50/30'
                            : 'bg-rose-50/30'
                          : 'bg-emerald-50/20'
                      }`}
                    >
                      {/* Product Name */}
                      <td className="py-1 px-2">
                        <div className="font-bold text-slate-900 text-xs leading-tight">{item.productName}</div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-0.2">
                          {item.scientificName && <span>{item.scientificName} • </span>}
                          <span>باركود: {item.barcode || '-'}</span>
                        </div>
                      </td>

                      {/* Batch & Expiry */}
                      <td className="py-1 px-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-bold">
                          #{item.batchNumber}
                        </span>
                        <span className="block text-[9px] text-slate-500 mt-0.5">{item.expiryDate}</span>
                      </td>

                      {/* Rack Location */}
                      <td className="py-1 px-1.5 text-[10px] text-slate-700">
                        <span className="flex items-center gap-0.5 font-medium text-teal-800">
                          <MapPin className="w-2.5 h-2.5 text-teal-600" />
                          {item.locationRack}
                        </span>
                      </td>

                      {/* System Qty */}
                      <td className="py-1 px-1.5 text-center font-mono font-bold text-xs text-slate-800">
                        {item.systemQty}
                      </td>

                      {/* Counted Qty with Quick Stepper Buttons */}
                      <td className="py-1 px-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateCount(item.batchId, item.countedQty - 1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                            title="إنقاص 1"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={item.isCounted ? item.countedQty : ''}
                            placeholder={String(item.systemQty)}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              handleUpdateCount(item.batchId, isNaN(val) ? 0 : val);
                            }}
                            className={`w-16 text-center font-mono font-black text-xs py-0.5 rounded border focus:outline-none ${
                              !item.isCounted
                                ? 'bg-slate-50 border-slate-300 text-slate-400'
                                : hasVariance
                                ? isSurplus
                                  ? 'bg-blue-100 border-blue-300 text-blue-900'
                                  : 'bg-rose-100 border-rose-300 text-rose-900'
                                : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateCount(item.batchId, item.countedQty + 1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                            title="زيادة 1"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateCount(item.batchId, item.countedQty + 5)}
                            className="px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold"
                            title="زيادة 5"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Variance Qty */}
                      <td className="py-1 px-1.5 text-center font-mono font-bold text-xs">
                        {!item.isCounted ? (
                          <span className="text-slate-400">-</span>
                        ) : item.varianceQty === 0 ? (
                          <span className="text-emerald-700">0 (مطابق)</span>
                        ) : isSurplus ? (
                          <span className="text-blue-700 flex items-center justify-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            +{item.varianceQty}
                          </span>
                        ) : (
                          <span className="text-rose-700 flex items-center justify-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            {item.varianceQty}
                          </span>
                        )}
                      </td>

                      {/* Variance Cost */}
                      <td className="py-1 px-1.5 text-left font-mono text-[11px]">
                        {!item.isCounted || item.varianceQty === 0 ? (
                          <span className="text-slate-400">0.00</span>
                        ) : (
                          <span className={`font-bold ${isSurplus ? 'text-blue-700' : 'text-rose-700'}`}>
                            {isSurplus ? '+' : ''}
                            {formatCurrency(item.varianceCost)}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-1 px-1.5 text-center">
                        {!item.isCounted ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-500">
                            في انتظار الجرد
                          </span>
                        ) : item.varianceQty === 0 ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>مطابق ✓</span>
                          </span>
                        ) : isSurplus ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                            فائض (+{item.varianceQty})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                            عجز ({item.varianceQty})
                          </span>
                        )}
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
  );
};
