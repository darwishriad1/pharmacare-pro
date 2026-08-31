import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Building2,
  DollarSign,
  PackageX,
  TrendingUp,
  Plus,
  Minus,
  Sparkles,
  Search,
  ArrowUpDown,
  Send
} from 'lucide-react';
import { Product, Batch } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';

interface InventoryReorderTabProps {
  products: Product[];
  batches: Batch[];
  onRefresh: () => void;
}

interface ReorderItem {
  product: Product;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  costPrice: number;
  sellingPrice: number;
  estimatedCost: number;
  supplier: string;
  urgency: 'critical_out' | 'very_low' | 'low' | 'adequate';
  isSelected: boolean;
}

export const InventoryReorderTab: React.FC<InventoryReorderTabProps> = ({
  products,
  batches,
  onRefresh,
}) => {
  const { formatCurrency, settings, showToast } = useSettingsStore();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('الكل');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'out' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Available suppliers from batches or products
  const availableSuppliers = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.supplierName && b.supplierName.trim()) set.add(b.supplierName.trim());
    });
    return ['الكل', ...Array.from(set).sort()];
  }, [batches]);

  // Categories
  const categories = useMemo(() => {
    return ['الكل', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  // Build items needing reorder
  const allReorderItems: ReorderItem[] = useMemo(() => {
    return products
      .filter((p) => p.totalQuantity <= (p.minStock || 5))
      .map((p) => {
        // Find most recent supplier for this product
        const prodBatches = batches.filter((b) => b.productId === p.id);
        const lastBatch = prodBatches[prodBatches.length - 1];
        const supplier = lastBatch?.supplierName || 'مورد عام';

        const currentStock = p.totalQuantity;
        const minStock = p.minStock || 5;

        let urgency: 'critical_out' | 'very_low' | 'low' | 'adequate' = 'low';
        if (currentStock === 0) urgency = 'critical_out';
        else if (currentStock <= Math.ceil(minStock / 2)) urgency = 'very_low';

        // Default suggested qty: target 3x minStock or at least 10 packs
        const defaultSuggested = Math.max(minStock * 2 - currentStock, 10);
        const suggestedQty = customQuantities[p.id] !== undefined ? customQuantities[p.id] : defaultSuggested;
        const estimatedCost = suggestedQty * p.costPrice;

        return {
          product: p,
          currentStock,
          minStock,
          suggestedQty,
          costPrice: p.costPrice,
          sellingPrice: p.price,
          estimatedCost,
          supplier,
          urgency,
          isSelected: selectedProductIds.has(p.id),
        };
      })
      .sort((a, b) => {
        // Critical out first, then very low
        if (a.currentStock === 0 && b.currentStock > 0) return -1;
        if (b.currentStock === 0 && a.currentStock > 0) return 1;
        return a.currentStock - b.currentStock;
      });
  }, [products, batches, customQuantities, selectedProductIds]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allReorderItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.product.name.toLowerCase().includes(q) ||
        (item.product.scientificName && item.product.scientificName.toLowerCase().includes(q)) ||
        item.product.barcode.includes(q) ||
        item.supplier.toLowerCase().includes(q);

      const matchesSupplier = selectedSupplier === 'الكل' || item.supplier === selectedSupplier;
      const matchesCategory = selectedCategory === 'الكل' || item.product.category === selectedCategory;

      let matchesUrgency = true;
      if (urgencyFilter === 'out') {
        matchesUrgency = item.currentStock === 0;
      } else if (urgencyFilter === 'low') {
        matchesUrgency = item.currentStock > 0;
      }

      return matchesSearch && matchesSupplier && matchesCategory && matchesUrgency;
    });
  }, [allReorderItems, searchQuery, selectedSupplier, selectedCategory, urgencyFilter]);

  // Active items for calculation (either selected or all filtered)
  const activeItemsToOrder = useMemo(() => {
    if (selectedProductIds.size > 0) {
      return allReorderItems.filter((i) => selectedProductIds.has(i.product.id));
    }
    return filteredItems;
  }, [allReorderItems, selectedProductIds, filteredItems]);

  const totalEstimatedCost = useMemo(() => {
    return activeItemsToOrder.reduce((acc, item) => acc + item.estimatedCost, 0);
  }, [activeItemsToOrder]);

  const totalOrderUnits = useMemo(() => {
    return activeItemsToOrder.reduce((acc, item) => acc + item.suggestedQty, 0);
  }, [activeItemsToOrder]);

  const outOfStockCount = useMemo(() => {
    return allReorderItems.filter((i) => i.currentStock === 0).length;
  }, [allReorderItems]);

  // Handle Qty change
  const handleQtyChange = (productId: string, newQty: number) => {
    const val = Math.max(1, newQty);
    setCustomQuantities((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  // Toggle selection
  const handleToggleSelect = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedProductIds(new Set(filteredItems.map((i) => i.product.id)));
  };

  const handleDeselectAll = () => {
    setSelectedProductIds(new Set());
  };

  // Copy WhatsApp / Text Order
  const handleCopyWhatsAppOrder = () => {
    if (activeItemsToOrder.length === 0) {
      showToast('لا توجد أصناف في مسودة الطلبية للنسخ', 'warning');
      return;
    }

    let text = `📦 *طلب توريد أصناف وأدوية - ${settings.pharmacyName || 'الصيدلية'}*\n`;
    text += `📅 التاريخ: ${new Date().toLocaleDateString('ar-YE')}\n`;
    if (selectedSupplier !== 'الكل') text += `🏢 المورد: ${selectedSupplier}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    activeItemsToOrder.forEach((item, index) => {
      text += `${index + 1}. *${item.product.name}*\n`;
      text += `   الكمية المطلوبة: *${item.suggestedQty}* عبوة | (الرصيد الحالي: ${item.currentStock})\n`;
      if (item.product.barcode) text += `   الباركود: ${item.product.barcode}\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 إجمالي الأصناف: ${activeItemsToOrder.length} صنف (${totalOrderUnits} عبوة)\n`;
    text += `💰 القيمة التقديرية: ${formatCurrency(totalEstimatedCost)}\n`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
    showToast('تم نسخ مسودة الطلبية بصيغة WhatsApp بنجاح 📋', 'success');
  };

  // Export to Excel
  const handleExportCSV = () => {
    const headers = [
      'اسم الدواء والصنف',
      'الاسم العلمي',
      'الباركود',
      'المجموعة',
      'المورد المعتاد',
      'الرصيد الحالي',
      'حد الطلب الأدنى',
      'الكمية المقترحة للطلب',
      'سعر الشراء المتوقع',
      'إجمالي التكلفة المتوقعة',
    ];

    const rows = activeItemsToOrder.map((item) => [
      item.product.name,
      item.product.scientificName || '-',
      item.product.barcode,
      item.product.category,
      item.supplier,
      item.currentStock,
      item.minStock,
      item.suggestedQty,
      item.costPrice,
      item.estimatedCost,
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
    link.setAttribute('download', `طلب_شراء_نواقص_المخزون_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('تم تصدير أمر الشراء بنجاح إلى ملف Excel', 'success');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden text-slate-800">
      {/* 1. Reorder Hub Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-teal-950 text-white rounded-lg p-2 sm:p-2.5 border border-amber-800/40 shadow-2xs space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs sm:text-sm text-white">
                  مركز النواقص وأوامر الشراء الذكية (Shortages & Reorder Forecast)
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  {allReorderItems.length} صنف مطلوب
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                حساب آلي للأصناف النافذة ودون حد الأمان لتجهيز طلبيات الموردين وتفادي نفاذ الأدوية
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyWhatsAppOrder}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="نسخ نص الطلبية لمشاركته مع المندوبين والموردين"
            >
              {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'تم النسخ بنجاح ✓' : 'نسخ للواتساب'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-md bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
              title="تصدير أمر الشراء إلى ملف Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير إكسل</span>
            </button>
          </div>
        </div>

        {/* Financial Reorder Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">الأصناف النافذة تماماً (0):</span>
            <span className="font-mono font-black text-rose-400 text-sm">{outOfStockCount} صنف</span>
          </div>

          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">دون حد الأمان الأدنى:</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {allReorderItems.length - outOfStockCount} صنف
            </span>
          </div>

          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">إجمالي العبوات المطلوبة:</span>
            <span className="font-mono font-black text-teal-300 text-sm">
              {totalOrderUnits.toLocaleString('ar-YE')} عبوة
            </span>
          </div>

          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">الميزانية التقديرية للشراء:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {formatCurrency(totalEstimatedCost)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white rounded-lg p-1 border border-teal-100 shadow-2xs flex items-center justify-between gap-1 shrink-0 flex-wrap">
        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-slate-400 absolute right-2 top-1.5" />
            <input
              type="text"
              placeholder="بحث بالدواء أو المورد أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded pr-6 pl-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Supplier Selector */}
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

        {/* Urgency and selection buttons */}
        <div className="flex items-center gap-1 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setUrgencyFilter('all')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              urgencyFilter === 'all'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            الكل ({allReorderItems.length})
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('out')}
            className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
              urgencyFilter === 'out'
                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <PackageX className="w-2.5 h-2.5 text-rose-600" />
            <span>نافد (0)</span>
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('low')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              urgencyFilter === 'low'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            رصيد حرج
          </button>

          <div className="w-px h-3 bg-slate-200" />

          <button
            type="button"
            onClick={selectedProductIds.size === filteredItems.length ? handleDeselectAll : handleSelectAll}
            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          >
            {selectedProductIds.size === filteredItems.length ? 'إلغاء التحديد' : 'تحديد الكل'}
          </button>
        </div>
      </div>

      {/* 3. Reorder Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
              <tr>
                <th className="py-1.5 px-2 w-8 text-center">✓</th>
                <th className="py-1.5 px-2">اسم الصنف الدوائي</th>
                <th className="py-1.5 px-1.5">المجموعة / المورد</th>
                <th className="py-1.5 px-1.5 text-center">الرصيد الحالي</th>
                <th className="py-1.5 px-1.5 text-center">حد الأمان</th>
                <th className="py-1.5 px-1.5 text-center min-w-[130px]">الكمية المطلوبة (عبوة)</th>
                <th className="py-1.5 px-1.5 text-left">سعر الشراء</th>
                <th className="py-1.5 px-1.5 text-left">إجمالي التكلفة</th>
                <th className="py-1.5 px-1.5 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Check className="w-8 h-8 mx-auto text-emerald-400 mb-1" />
                    <p className="font-bold text-slate-700 text-xs">مستويات المخزون ممتازة! لا توجد نواقص حالياً</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedProductIds.has(item.product.id);
                  const isOut = item.currentStock === 0;

                  return (
                    <tr
                      key={item.product.id}
                      onClick={() => handleToggleSelect(item.product.id)}
                      className={`hover:bg-teal-50/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-teal-50/70' : isOut ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.product.id)}
                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-50 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Product Name */}
                      <td className="py-1 px-2">
                        <div className="font-bold text-slate-900 text-xs leading-tight">{item.product.name}</div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-0.2">
                          {item.product.scientificName && <span>{item.product.scientificName} • </span>}
                          <span>باركود: {item.product.barcode || '-'}</span>
                        </div>
                      </td>

                      {/* Category & Supplier */}
                      <td className="py-1 px-1.5 text-[10px] text-slate-700">
                        <span className="font-medium">{item.product.category}</span>
                        <span className="block text-[9px] text-slate-500 font-mono">مورد: {item.supplier}</span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-1 px-1.5 text-center">
                        <span
                          className={`font-mono font-black text-xs px-1.5 py-0.2 rounded ${
                            isOut ? 'bg-rose-100 text-rose-900 font-black' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {item.currentStock} عبوة
                        </span>
                      </td>

                      {/* Min Safety Stock */}
                      <td className="py-1 px-1.5 text-center font-mono text-[11px] text-slate-600 font-bold">
                        {item.minStock}
                      </td>

                      {/* Suggested / Custom Reorder Qty */}
                      <td className="py-1 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.product.id, item.suggestedQty - 5)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={item.suggestedQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleQtyChange(item.product.id, isNaN(val) ? 1 : val);
                            }}
                            className="w-14 text-center font-mono font-black text-xs py-0.5 rounded bg-white border border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-500 text-teal-900"
                          />

                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.product.id, item.suggestedQty + 5)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-1 px-1.5 text-left font-mono text-[11px] text-slate-700">
                        {formatCurrency(item.costPrice)}
                      </td>

                      {/* Total Cost */}
                      <td className="py-1 px-1.5 text-left font-mono font-black text-[11px] text-emerald-700">
                        {formatCurrency(item.estimatedCost)}
                      </td>

                      {/* Status */}
                      <td className="py-1 px-1.5 text-center">
                        {isOut ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">
                            نافد عاجل
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            دون الأمان
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
