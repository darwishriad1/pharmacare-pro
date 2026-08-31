import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Trash2,
  Truck,
  Tag,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Search,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Batch, Product } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface InventoryExpiryRiskTabProps {
  batches: Batch[];
  products: Product[];
  onRefresh: () => void;
  canEditInventory: boolean;
}

export const InventoryExpiryRiskTab: React.FC<InventoryExpiryRiskTabProps> = ({
  batches,
  products,
  onRefresh,
  canEditInventory,
}) => {
  const { formatCurrency, settings, showToast } = useSettingsStore();
  const [selectedWorkflow, setSelectedWorkflow] = useState<'return' | 'clearance' | 'quarantine'>('return');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('الكل');
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(() => new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const now = new Date();
  const dateIn30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateIn60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const dateIn90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Suppliers
  const availableSuppliers = useMemo(() => {
    const s = new Set<string>();
    batches.forEach((b) => {
      if (b.supplierName && b.supplierName.trim()) s.add(b.supplierName.trim());
    });
    return ['الكل', ...Array.from(s).sort()];
  }, [batches]);

  // Classify batches
  const { returnableBatches, clearanceBatches, expiredBatches } = useMemo(() => {
    const returnable: Batch[] = [];
    const clearance: Batch[] = [];
    const expired: Batch[] = [];

    batches.forEach((b) => {
      if (b.quantity <= 0) return;
      const expDate = new Date(b.expiryDate);

      if (expDate <= now) {
        // Expired
        expired.push(b);
      } else if (expDate <= dateIn60Days) {
        // 1 to 60 days -> Urgent clearance
        clearance.push(b);
      } else if (expDate <= dateIn90Days) {
        // 60 to 90 days -> Eligible for supplier return window
        returnable.push(b);
      }
    });

    return {
      returnableBatches: returnable.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
      clearanceBatches: clearance.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
      expiredBatches: expired.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    };
  }, [batches, now, dateIn60Days, dateIn90Days]);

  // Current active list
  const currentWorkflowBatches = useMemo(() => {
    if (selectedWorkflow === 'return') return returnableBatches;
    if (selectedWorkflow === 'clearance') return clearanceBatches;
    return expiredBatches;
  }, [selectedWorkflow, returnableBatches, clearanceBatches, expiredBatches]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return currentWorkflowBatches.filter((b) => {
      const prod = productMap.get(b.productId);
      const q = searchQuery.toLowerCase().trim();
      const name = (prod?.name || b.productName || '').toLowerCase();
      const bNum = b.batchNumber.toLowerCase();
      const supplier = (b.supplierName || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || bNum.includes(q) || supplier.includes(q);
      const matchesSupplier = selectedSupplier === 'الكل' || b.supplierName === selectedSupplier;

      return matchesSearch && matchesSupplier;
    });
  }, [currentWorkflowBatches, searchQuery, selectedSupplier, productMap]);

  // Metrics
  const returnableCost = useMemo(
    () => returnableBatches.reduce((acc, b) => acc + b.costPrice * b.quantity, 0),
    [returnableBatches]
  );
  const clearanceCost = useMemo(
    () => clearanceBatches.reduce((acc, b) => acc + b.costPrice * b.quantity, 0),
    [clearanceBatches]
  );
  const expiredCost = useMemo(
    () => expiredBatches.reduce((acc, b) => acc + b.costPrice * b.quantity, 0),
    [expiredBatches]
  );

  // Toggle selection
  const handleToggleSelect = (batchId: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedBatchIds(new Set(filteredBatches.map((b) => b.id)));
  };

  const handleDeselectAll = () => {
    setSelectedBatchIds(new Set());
  };

  // Bulk Dispose Expired
  const handleBulkDispose = () => {
    const targetBatches =
      selectedBatchIds.size > 0
        ? expiredBatches.filter((b) => selectedBatchIds.has(b.id))
        : filteredBatches;

    if (targetBatches.length === 0) {
      showToast('لا توجد تشغيلات منتهية محددة للإتلاف', 'warning');
      return;
    }

    if (
      !confirm(
        `هل أنت متأكد من تنفيذ محضر إتلاف رسمي لـ (${targetBatches.length}) تشغيلة منتهية الصلاحية؟ سيتم تصفير أرصدتها وتسجيل محضر الهالك.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      targetBatches.forEach((b) => {
        db.adjustBatchQuantity(
          b.id,
          0,
          'محضر إتلاف هالك منتهي الصلاحية معتمد',
          'usr-1',
          'مدير الصيدلية'
        );
      });

      onRefresh();
      showToast(`تم إتلاف (${targetBatches.length}) تشغيلة منتهية وتوثيق المحضر بنجاح`, 'success');
      setSelectedBatchIds(new Set());
    } catch (err) {
      showToast('حدث خطأ أثناء تنفيذ عملية الإتلاف', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export Supplier Return Manifest
  const handleExportReturnManifest = () => {
    const targetBatches =
      selectedBatchIds.size > 0
        ? returnableBatches.filter((b) => selectedBatchIds.has(b.id))
        : filteredBatches;

    if (targetBatches.length === 0) {
      showToast('لا توجد تشغيلات محددة للتصدير', 'warning');
      return;
    }

    const headers = [
      'اسم الصنف الدوائي',
      'رقم التشغيلة',
      'تاريخ الانتهاء',
      'الكمية المرتجعة',
      'سعر الشراء (التكلفة)',
      'إجمالي مبلغ الارتجاع',
      'اسم المورد',
    ];

    const rows = targetBatches.map((b) => {
      const prod = productMap.get(b.productId);
      return [
        prod?.name || b.productName,
        b.batchNumber,
        b.expiryDate,
        b.quantity,
        b.costPrice,
        b.costPrice * b.quantity,
        b.supplierName || 'غير محدد',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `محضر_مرتجع_أدوية_للمورد_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('تم تصدير محضر المرتجع بنجاح إلى ملف Excel', 'success');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden text-slate-800">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-lg p-2 sm:p-2.5 border border-rose-900/40 shadow-2xs space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs sm:text-sm text-white">
                  غرفة عمليات الصلاحية والإرجاع للموردين (Expiry Risk & Returns Hub)
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40">
                  حماية رأس المال
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                إجراءات استباقية لإرجاع الأدوية للشركات، والتصفية السريعة، وتوثيق محاضر الإتلاف
              </p>
            </div>
          </div>

          {/* Master Actions */}
          <div className="flex items-center gap-1">
            {selectedWorkflow === 'return' && (
              <button
                type="button"
                onClick={handleExportReturnManifest}
                className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير محضر مرتجع موردين</span>
              </button>
            )}

            {selectedWorkflow === 'quarantine' && canEditInventory && (
              <button
                type="button"
                onClick={handleBulkDispose}
                disabled={isProcessing || expiredBatches.length === 0}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إتلاف الهالك وتصفير الرصيد</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Workflows Metric Cards */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800 text-xs">
          {/* 1. Returnable to Suppliers */}
          <button
            type="button"
            onClick={() => setSelectedWorkflow('return')}
            className={`p-1.5 rounded-lg border text-right transition-all cursor-pointer ${
              selectedWorkflow === 'return'
                ? 'bg-teal-950/80 border-teal-400 ring-1 ring-teal-400'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-teal-300 font-bold">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                1. مؤهلة للإرجاع للموردين
              </span>
              <span className="font-mono bg-teal-900/80 px-1 rounded text-teal-200">60-90 يوم</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono font-black text-white text-sm">
                {returnableBatches.length} <span className="text-[9px] font-normal text-slate-400">تشغيلة</span>
              </span>
              <span className="font-mono font-bold text-teal-300 text-[11px]">
                {formatCurrency(returnableCost)}
              </span>
            </div>
          </button>

          {/* 2. Clearance & Promotion */}
          <button
            type="button"
            onClick={() => setSelectedWorkflow('clearance')}
            className={`p-1.5 rounded-lg border text-right transition-all cursor-pointer ${
              selectedWorkflow === 'clearance'
                ? 'bg-amber-950/80 border-amber-400 ring-1 ring-amber-400'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                2. تصفية وتخفيض سريع
              </span>
              <span className="font-mono bg-amber-900/80 px-1 rounded text-amber-200">≤ 60 يوم</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono font-black text-white text-sm">
                {clearanceBatches.length} <span className="text-[9px] font-normal text-slate-400">تشغيلة</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-[11px]">
                {formatCurrency(clearanceCost)}
              </span>
            </div>
          </button>

          {/* 3. Expired Quarantine */}
          <button
            type="button"
            onClick={() => setSelectedWorkflow('quarantine')}
            className={`p-1.5 rounded-lg border text-right transition-all cursor-pointer ${
              selectedWorkflow === 'quarantine'
                ? 'bg-rose-950/80 border-rose-400 ring-1 ring-rose-400'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-rose-300 font-bold">
              <span className="flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                3. عزل وإتلاف رسمي
              </span>
              <span className="font-mono bg-rose-900/80 px-1 rounded text-rose-200">منتهية الصلاحية</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono font-black text-white text-sm">
                {expiredBatches.length} <span className="text-[9px] font-normal text-slate-400">تشغيلة</span>
              </span>
              <span className="font-mono font-bold text-rose-300 text-[11px]">
                {formatCurrency(expiredCost)}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white rounded-lg p-1 border border-teal-100 shadow-2xs flex items-center justify-between gap-1 shrink-0 flex-wrap">
        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-slate-400 absolute right-2 top-1.5" />
            <input
              type="text"
              placeholder="بحث بالدواء أو المورد أو رقم التشغيلة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded pr-6 pl-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="w-36 shrink-0">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              {availableSuppliers.map((s) => (
                <option key={s} value={s}>
                  {s === 'الكل' ? 'جميع الموردين' : `مورد: ${s}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-bold">
          <button
            type="button"
            onClick={selectedBatchIds.size === filteredBatches.length ? handleDeselectAll : handleSelectAll}
            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          >
            {selectedBatchIds.size === filteredBatches.length ? 'إلغاء التحديد' : 'تحديد الكل'}
          </button>
        </div>
      </div>

      {/* 3. Batches List Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
              <tr>
                <th className="py-1.5 px-2 w-8 text-center">✓</th>
                <th className="py-1.5 px-2">اسم الصنف الدوائي</th>
                <th className="py-1.5 px-1.5">التشغيلة</th>
                <th className="py-1.5 px-1.5">تاريخ الانتهاء</th>
                <th className="py-1.5 px-1.5 text-center">الكمية بالمخزن</th>
                <th className="py-1.5 px-1.5 text-left">سعر الشراء</th>
                <th className="py-1.5 px-1.5 text-left">إجمالي القيمة المعرضة</th>
                <th className="py-1.5 px-1.5 text-left">المورد والرف</th>
                <th className="py-1.5 px-1.5 text-center">الإجراء الموصى به</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-1" />
                    <p className="font-bold text-slate-700 text-xs">لا توجد تشغيلات في هذه الفئة حالياً</p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const prod = productMap.get(batch.productId);
                  const isSelected = selectedBatchIds.has(batch.id);
                  const expDate = new Date(batch.expiryDate);
                  const isExpired = expDate <= now;

                  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr
                      key={batch.id}
                      onClick={() => handleToggleSelect(batch.id)}
                      className={`hover:bg-teal-50/50 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50/70'
                          : isExpired
                          ? 'bg-rose-50/20'
                          : selectedWorkflow === 'clearance'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(batch.id)}
                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-50 border-slate-300 cursor-pointer"
                        />
                      </td>

                      <td className="py-1 px-2">
                        <div className="font-bold text-slate-900 text-xs leading-tight">
                          {prod?.name || batch.productName}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-0.2">
                          <span>{prod?.category || 'دواء'}</span>
                          {prod?.strength && <span>• {prod.strength}</span>}
                        </div>
                      </td>

                      <td className="py-1 px-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-bold">
                          #{batch.batchNumber}
                        </span>
                      </td>

                      <td className="py-1 px-1.5 font-mono text-[11px]">
                        <span className={`font-bold ${isExpired ? 'text-rose-700' : 'text-slate-800'}`}>
                          {batch.expiryDate}
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {isExpired ? `منتهية منذ ${Math.abs(daysLeft)} يوم` : `متبقي ${daysLeft} يوم`}
                        </span>
                      </td>

                      <td className="py-1 px-1.5 text-center font-mono font-black text-xs text-slate-900">
                        {batch.quantity} عبوة
                      </td>

                      <td className="py-1 px-1.5 text-left font-mono text-[11px] text-slate-700">
                        {formatCurrency(batch.costPrice)}
                      </td>

                      <td className="py-1 px-1.5 text-left font-mono font-black text-[11px] text-rose-700">
                        {formatCurrency(batch.costPrice * batch.quantity)}
                      </td>

                      <td className="py-1 px-1.5 text-left text-[10px] text-slate-700">
                        <span className="font-medium text-slate-800 block truncate max-w-[120px]">
                          {batch.supplierName || 'توريد مباشر'}
                        </span>
                        <span className="text-[9px] text-teal-700 flex items-center gap-0.5 font-mono">
                          <MapPin className="w-2.5 h-2.5" />
                          {prod?.locationRack || 'الرف العام'}
                        </span>
                      </td>

                      <td className="py-1 px-1.5 text-center">
                        {selectedWorkflow === 'return' ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
                            تجهيز مرتجع للمورد
                          </span>
                        ) : selectedWorkflow === 'clearance' ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            تخفيض سعر / تصفية
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                            عزل وإتلاف معتمد
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
