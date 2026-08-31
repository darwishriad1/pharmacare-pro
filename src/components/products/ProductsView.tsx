import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Barcode,
  Edit2,
  Trash2,
  Filter,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  Globe,
  Camera
} from 'lucide-react';
import { Product } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProductModal } from './ProductModal';
import { BarcodePrintModal } from './BarcodePrintModal';
import { ExcelImportModal } from './ExcelImportModal';
import { excelService } from '../../services/excelService';

export const ProductsView: React.FC = () => {
  const { formatCurrency, settings, showToast } = useSettingsStore();
  const { hasPermission, hasRole } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const canEditProducts = hasPermission('inventory_edit') || hasRole(['admin', 'pharmacist']);
  const canViewCost = hasPermission('inventory_edit') || hasPermission('reports_view') || hasRole(['admin', 'pharmacist', 'accountant']);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<'upload' | 'paste' | 'online'>('upload');

  const refreshProducts = () => {
    setProducts(db.getProducts());
  };

  useEffect(() => {
    refreshProducts();
    const unsub = db.subscribe(refreshProducts);
    return unsub;
  }, []);

  const categories = ['الكل', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'الكل' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scientificName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStock =
      stockFilter === 'all'
        ? true
        : stockFilter === 'low'
        ? p.totalQuantity <= p.minStock && p.totalQuantity > 0
        : p.totalQuantity === 0;

    return matchesCat && matchesSearch && matchesStock;
  });

  const handleDelete = (product: Product) => {
    if (confirm(`هل أنت متأكد من حذف الدواء (${product.name}) وجميع الدفعات المرتبطة به؟`)) {
      db.deleteProduct(product.id);
    }
  };

  const handleExportCSV = () => {
    excelService.exportProductsToCSV(products);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto select-none">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">دليل الأدوية والمنتجات</h1>
            <p className="text-xs text-slate-400">
              إدارة كتالوج الأدوية، بطاقات الأصناف، الأسعار، ومستويات المخزون ({products.length} صنف مسجل)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEditProducts && (
            <>
              <button
                onClick={() => {
                  setImportInitialTab('online');
                  setIsImportModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="استيراد أدوية من الإنترنت من دليل الأدوية السحابي وقواعد الشركات المصنعة"
              >
                <Globe className="w-4 h-4 text-sky-400" />
                <span>🌐 استيراد أدوية من الإنترنت (دليل الأدوية)</span>
              </button>

              <button
                onClick={() => {
                  setImportInitialTab('upload');
                  setIsImportModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="استيراد ذكي للأدوية والمخزون من ملفات Excel أو عبر النسخ واللصق المباشر"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>استيراد ذكي من Excel</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-400" />
                تصدير CSV
              </button>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-700/30 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة دواء جديد
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="ابحث بالاسم التجاري، الاسم العلمي، الباركود، الشركة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pr-10 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category select */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'الكل' ? 'جميع المجموعات الدوائية' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Filter */}
        <div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">كافة مستويات المخزون</option>
            <option value="low">تنبيه نواقص وشيكة (أقل من الحد)</option>
            <option value="out">أصناف منتهية من المخزون (0)</option>
          </select>
        </div>
      </div>

      {/* Mobile Drug Cards List (Visible only on mobile < md) */}
      <div className="md:hidden space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
            <Pill className="w-10 h-10 mx-auto text-slate-700 mb-2" />
            <p className="font-bold text-slate-400 text-sm">لا توجد أدوية مطابقة للبحث</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isOut = product.totalQuantity === 0;
            const isLow = product.totalQuantity <= product.minStock && !isOut;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md space-y-2.5"
              >
                {/* Top row: Name & Stock badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-white text-sm leading-tight">{product.name}</h3>
                      {product.requiresPrescription && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          ℞
                        </span>
                      )}
                    </div>
                    {product.scientificName && (
                      <p className="text-[11px] text-slate-400 font-sans truncate mt-0.5">{product.scientificName}</p>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 ${
                      isOut
                        ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        : isLow
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {product.totalQuantity} عبوة
                  </span>
                </div>

                {/* Middle row: Category, Form & Barcode */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {product.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{product.form}</span>
                  </div>
                  <span className="font-mono text-amber-300 text-[11px] font-bold">{product.barcode}</span>
                </div>

                {/* Bottom row: Prices & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-sm font-black font-mono text-emerald-400 block leading-tight">
                      {formatCurrency(product.price)}
                    </span>
                    {product.stripPrice && (
                      <span className="text-[10px] text-slate-400">شريط: {formatCurrency(product.stripPrice)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setBarcodeProduct(product);
                        setIsBarcodeModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 text-amber-400 active:scale-95 transition-transform cursor-pointer"
                      title="طباعة باركود"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>

                    {canEditProducts && (
                      <>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsProductModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 text-sky-400 active:scale-95 transition-transform cursor-pointer"
                          title="تعديل بيانات الصنف"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 rounded-xl bg-slate-800 text-rose-400 hover:bg-rose-950/40 active:scale-95 transition-transform cursor-pointer"
                          title="حذف الصنف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Products Table (Visible on md and larger) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">الباركود</th>
                <th className="p-3.5">اسم الدواء والتركيبة</th>
                <th className="p-3.5">المجموعة والشكل</th>
                {canViewCost && <th className="p-3.5">سعر الشراء</th>}
                <th className="p-3.5">سعر البيع (عبوة)</th>
                <th className="p-3.5">سعر الشريط</th>
                <th className="p-3.5 text-center">المخزون المتوفر</th>
                <th className="p-3.5">موقع الرف</th>
                <th className="p-3.5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={canViewCost ? 9 : 8} className="p-12 text-center text-slate-500">
                    <Pill className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                    <p className="font-bold text-slate-400 text-sm">لا توجد أدوية مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isOut = product.totalQuantity === 0;
                  const isLow = product.totalQuantity <= product.minStock && !isOut;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/50 transition-colors">
                      {/* Barcode */}
                      <td className="p-3.5 font-mono text-[11px] text-amber-300 font-bold">
                        {product.barcode}
                      </td>

                      {/* Name & Scientific */}
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {product.name}
                          {product.requiresPrescription && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              ℞
                            </span>
                          )}
                        </div>
                        {product.scientificName && (
                          <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                            {product.scientificName}
                          </div>
                        )}
                        {product.manufacturer && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {product.manufacturer} {product.country ? `(${product.country})` : ''}
                          </div>
                        )}
                      </td>

                      {/* Category & Form */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] block w-fit mb-1">
                          {product.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {product.form} {product.strength ? `• ${product.strength}` : ''}
                        </span>
                      </td>

                      {/* Cost Price */}
                      {canViewCost && (
                        <td className="p-3.5 font-mono text-slate-400">
                          {formatCurrency(product.costPrice)}
                        </td>
                      )}

                      {/* Sell Price */}
                      <td className="p-3.5 font-mono font-bold text-emerald-400 text-sm">
                        {formatCurrency(product.price)}
                      </td>

                      {/* Strip Price */}
                      <td className="p-3.5 font-mono text-slate-300">
                        {product.stripPrice ? formatCurrency(product.stripPrice) : '-'}
                      </td>

                      {/* Stock Quantity */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold inline-flex items-center gap-1 ${
                            isOut
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                              : isLow
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {product.totalQuantity} عبوة
                        </span>
                      </td>

                      {/* Location Rack */}
                      <td className="p-3.5 font-mono text-slate-400">
                        {product.locationRack || '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Barcode */}
                          <button
                            onClick={() => {
                              setBarcodeProduct(product);
                              setIsBarcodeModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                            title="طباعة باركود"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>

                          {canEditProducts && (
                            <>
                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors cursor-pointer"
                                title="تعديل بيانات الصنف"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(product)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="حذف الدواء"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        onClose={() => setIsProductModalOpen(false)}
        onSaved={refreshProducts}
      />

      <BarcodePrintModal
        isOpen={isBarcodeModalOpen}
        product={barcodeProduct}
        onClose={() => setIsBarcodeModalOpen(false)}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={refreshProducts}
        initialTab={importInitialTab}
      />
    </div>
  );
};
