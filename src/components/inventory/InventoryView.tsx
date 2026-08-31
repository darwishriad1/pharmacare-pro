import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Scale,
  Trash2,
  Layers,
  DollarSign,
  TrendingUp,
  Download,
  Printer,
  RefreshCw,
  Eye,
  History,
  Pill,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
  MapPin,
  Barcode,
  X,
  ArrowUpDown,
  Plus,
  FileSpreadsheet,
  Edit2,
  ShoppingCart,
  ShieldAlert,
  Check,
  CheckSquare,
  Square,
  Building2
} from 'lucide-react';
import { Batch, Product } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { BatchHistoryModal } from './BatchHistoryModal';
import { BatchDetailModal } from './BatchDetailModal';
import { ProductModal } from '../products/ProductModal';
import { BarcodePrintModal } from '../products/BarcodePrintModal';
import { ExcelImportModal } from '../products/ExcelImportModal';
import { BulkLocationModal } from './BulkLocationModal';
import { InventoryAuditTab } from './InventoryAuditTab';
import { InventoryReorderTab } from './InventoryReorderTab';
import { InventoryExpiryRiskTab } from './InventoryExpiryRiskTab';
import { excelService } from '../../services/excelService';
import { printerService } from '../../services/printerService';
import { useAuthStore } from '../../stores/useAuthStore';

type InventoryTab = 'batches' | 'products' | 'audit' | 'reorder' | 'expiry_hub' | 'valuation';
type ExpiryFilterType = 'all' | 'expired' | '30days' | '90days' | 'healthy' | 'low' | 'out';
type SortOption = 'expiry_asc' | 'expiry_desc' | 'qty_desc' | 'cost_desc' | 'retail_desc' | 'name_asc';
type ViewMode = 'table' | 'cards';

export const InventoryView: React.FC = () => {
  const { formatCurrency, settings, showToast, inventorySubTab, setInventorySubTab } = useSettingsStore();
  const { hasPermission, hasRole } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedRack, setSelectedRack] = useState('الكل');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('expiry_asc');
  const [activeTab, setActiveTab] = useState<InventoryTab>(inventorySubTab || 'batches');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  useEffect(() => {
    if (inventorySubTab) {
      setActiveTab(inventorySubTab);
    }
  }, [inventorySubTab]);

  // Bulk Selection States
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(() => new Set());
  const [isBulkLocationOpen, setIsBulkLocationOpen] = useState<boolean>(false);

  const canViewValuation = hasPermission('reports_view') || hasRole(['admin', 'accountant']);
  const canEditInventory = hasPermission('inventory_edit') || hasRole(['admin', 'pharmacist']);
  const canViewCost =
    hasPermission('inventory_edit') || hasPermission('reports_view') || hasRole(['admin', 'pharmacist', 'accountant']);

  // Modals state for Batches
  const [selectedBatchForAdjustment, setSelectedBatchForAdjustment] = useState<Batch | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const [selectedBatchForHistory, setSelectedBatchForHistory] = useState<Batch | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<Batch | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modals state for Products
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const refreshData = () => {
    setBatches(db.getBatches());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, []);

  const now = new Date();
  const dateIn30Days = new Date();
  dateIn30Days.setDate(now.getDate() + 30);
  const dateIn90Days = new Date();
  dateIn90Days.setDate(now.getDate() + 90);

  const categories = useMemo(() => ['الكل', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const availableRacks = useMemo(() => {
    const racks = new Set<string>();
    products.forEach((p) => {
      if (p.locationRack && p.locationRack.trim()) {
        racks.add(p.locationRack.trim());
      }
    });
    return ['الكل', ...Array.from(racks).sort()];
  }, [products]);

  // Helper for batch status
  const getBatchStatus = (batch: Batch) => {
    if (batch.quantity <= 0) {
      return {
        label: 'نفد (0)',
        color: 'slate',
        bgClass: 'bg-slate-100 text-slate-700 border border-slate-300 font-bold',
        icon: Layers,
        daysText: 'الكمية نافدة',
        isCritical: false,
      };
    }
    const exp = new Date(batch.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (exp <= now) {
      return {
        label: 'منتهي الصلاحية',
        color: 'rose',
        bgClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-black',
        icon: AlertCircle,
        daysText: `منتهي منذ ${Math.abs(diffDays)} يوم`,
        isCritical: true,
      };
    }
    if (exp <= dateIn30Days) {
      return {
        label: 'ينتهي ≤ 30 يوم',
        color: 'orange',
        bgClass: 'bg-orange-100 text-orange-900 border border-orange-300 font-black',
        icon: AlertTriangle,
        daysText: `متبقي ${diffDays} يوم`,
        isCritical: true,
      };
    }
    if (exp <= dateIn90Days) {
      return {
        label: 'ينتهي ≤ 90 يوم',
        color: 'amber',
        bgClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
        icon: Clock,
        daysText: `متبقي ${diffDays} يوم`,
        isCritical: true,
      };
    }
    return {
      label: 'سليم وصالح',
      color: 'emerald',
      bgClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold',
      icon: CheckCircle2,
      daysText: `متبقي ${diffDays} يوم (~${Math.round(diffDays / 30)} شهر)`,
      isCritical: false,
    };
  };

  // Filter and sort batches
  const filteredBatches = useMemo(() => {
    return batches
      .filter((b) => {
        const prod = products.find((p) => p.id === b.productId);
        const prodName = prod?.name || b.productName || '';
        const scientificName = prod?.scientificName || '';
        const barcode = prod?.barcode || '';
        const q = searchQuery.toLowerCase().trim();

        const matchesSearch =
          !q ||
          prodName.toLowerCase().includes(q) ||
          scientificName.toLowerCase().includes(q) ||
          barcode.toLowerCase().includes(q) ||
          b.batchNumber.toLowerCase().includes(q) ||
          (b.supplierName && b.supplierName.toLowerCase().includes(q)) ||
          (prod?.locationRack && prod.locationRack.toLowerCase().includes(q));

        const matchesCategory = selectedCategory === 'الكل' || prod?.category === selectedCategory;
        const matchesRack = selectedRack === 'الكل' || prod?.locationRack === selectedRack;

        const exp = new Date(b.expiryDate);

        let matchesFilter = true;
        if (expiryFilter === 'expired') {
          matchesFilter = exp <= now && b.quantity > 0;
        } else if (expiryFilter === '30days') {
          matchesFilter = exp > now && exp <= dateIn30Days && b.quantity > 0;
        } else if (expiryFilter === '90days') {
          matchesFilter = exp > now && exp <= dateIn90Days && b.quantity > 0;
        } else if (expiryFilter === 'healthy') {
          matchesFilter = exp > dateIn90Days && b.quantity > 0;
        } else if (expiryFilter === 'out') {
          matchesFilter = b.quantity <= 0;
        }

        return matchesSearch && matchesCategory && matchesRack && matchesFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry_asc') {
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        if (sortBy === 'expiry_desc') {
          return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
        }
        if (sortBy === 'qty_desc') {
          return b.quantity - a.quantity;
        }
        if (sortBy === 'cost_desc') {
          return b.costPrice * b.quantity - a.costPrice * a.quantity;
        }
        if (sortBy === 'retail_desc') {
          return b.sellingPrice * b.quantity - a.sellingPrice * a.quantity;
        }
        if (sortBy === 'name_asc') {
          const nameA = products.find((p) => p.id === a.productId)?.name || a.productName || '';
          const nameB = products.find((p) => p.id === b.productId)?.name || b.productName || '';
          return nameA.localeCompare(nameB, 'ar');
        }
        return 0;
      });
  }, [batches, products, searchQuery, selectedCategory, selectedRack, expiryFilter, sortBy]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.scientificName?.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.manufacturer?.toLowerCase().includes(q) ||
          p.locationRack?.toLowerCase().includes(q);

        const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
        const matchesRack = selectedRack === 'الكل' || p.locationRack === selectedRack;

        let matchesStock = true;
        if (expiryFilter === 'low') {
          matchesStock = p.totalQuantity <= p.minStock && p.totalQuantity > 0;
        } else if (expiryFilter === 'out') {
          matchesStock = p.totalQuantity === 0;
        }

        return matchesSearch && matchesCategory && matchesRack && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'qty_desc') return b.totalQuantity - a.totalQuantity;
        if (sortBy === 'cost_desc') return b.costPrice * b.totalQuantity - a.costPrice * a.totalQuantity;
        if (sortBy === 'retail_desc') return b.price * b.totalQuantity - a.price * a.totalQuantity;
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [products, searchQuery, selectedCategory, selectedRack, expiryFilter, sortBy]);

  // Statistics
  const totalCostValue = useMemo(
    () => batches.reduce((acc, b) => acc + (b.quantity > 0 ? b.costPrice * b.quantity : 0), 0),
    [batches]
  );
  const totalRetailValue = useMemo(
    () => batches.reduce((acc, b) => acc + (b.quantity > 0 ? b.sellingPrice * b.quantity : 0), 0),
    [batches]
  );
  const totalActivePackages = useMemo(
    () => batches.reduce((acc, b) => acc + (b.quantity > 0 ? b.quantity : 0), 0),
    [batches]
  );

  const expiredCount = useMemo(
    () => batches.filter((b) => new Date(b.expiryDate) <= now && b.quantity > 0).length,
    [batches]
  );
  const near90DaysCount = useMemo(
    () =>
      batches.filter(
        (b) => new Date(b.expiryDate) > now && new Date(b.expiryDate) <= dateIn90Days && b.quantity > 0
      ).length,
    [batches]
  );
  const near30DaysCount = useMemo(
    () =>
      batches.filter(
        (b) => new Date(b.expiryDate) > now && new Date(b.expiryDate) <= dateIn30Days && b.quantity > 0
      ).length,
    [batches]
  );
  const healthyCount = useMemo(
    () => batches.filter((b) => new Date(b.expiryDate) > dateIn90Days && b.quantity > 0).length,
    [batches]
  );
  const outOfStockCount = useMemo(() => batches.filter((b) => b.quantity <= 0).length, [batches]);
  const lowStockProductsCount = useMemo(
    () => products.filter((p) => p.totalQuantity <= p.minStock && p.totalQuantity > 0).length,
    [products]
  );

  // Value of expired stock
  const expiredStockCost = useMemo(
    () =>
      batches
        .filter((b) => new Date(b.expiryDate) <= now && b.quantity > 0)
        .reduce((acc, b) => acc + b.costPrice * b.quantity, 0),
    [batches]
  );

  // Value of near 90 days stock
  const near90StockCost = useMemo(
    () =>
      batches
        .filter((b) => new Date(b.expiryDate) > now && new Date(b.expiryDate) <= dateIn90Days && b.quantity > 0)
        .reduce((acc, b) => acc + b.costPrice * b.quantity, 0),
    [batches]
  );

  // Delete product
  const handleDeleteProduct = (product: Product) => {
    if (confirm(`هل أنت متأكد من حذف الدواء (${product.name}) وجميع الدفعات المرتبطة به من النظام نهائياً؟`)) {
      db.deleteProduct(product.id);
      refreshData();
      showToast(`تم حذف الصنف (${product.name}) بنجاح`, 'info');
    }
  };

  // Handle Dispose Expired
  const handleDisposeExpired = (batch: Batch) => {
    const prod = db.getProductById(batch.productId);
    if (
      confirm(
        `هل تريد تسجيل إتلاف وهالك للدفعة (${batch.batchNumber}) الخاصة بـ (${
          prod?.name || 'الصنف'
        }) لانتهاء صلاحيتها؟ سيتم تصفير رصيدها وتوثيق العملية في سجل الرقابة.`
      )
    ) {
      db.adjustBatchQuantity(batch.id, 0, 'إتلاف أدوية منتهية الصلاحية', 'usr-1', 'مدير النظام');
      refreshData();
      showToast('تم تسجيل إتلاف الدفعة المنتهية وتصفير رصيدها بنجاح', 'info');
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'products') {
      excelService.exportProductsToCSV(products);
      showToast('تم تصدير دليل الأدوية بنجاح إلى ملف Excel', 'success');
    } else {
      excelService.exportBatchesToCSV(filteredBatches, products);
      showToast('تم تصدير كشف المخزون والتشغيلات بنجاح إلى ملف Excel', 'success');
    }
  };

  const handlePrintReport = () => {
    let filterLabel = 'كافة التشغيلات والدفعات';
    if (expiryFilter === 'expired') filterLabel = 'الأدوية المنتهية الصلاحية';
    else if (expiryFilter === '30days') filterLabel = 'الأدوية التي تنتهي خلال 30 يوم';
    else if (expiryFilter === '90days') filterLabel = 'الأدوية التي تنتهي خلال 90 يوم';
    else if (expiryFilter === 'healthy') filterLabel = 'الأدوية السليمة والصالحة';
    else if (expiryFilter === 'out') filterLabel = 'الدفعات المنتهية الكمية (0)';

    printerService.printInventoryBatchesReport(filteredBatches, products, settings, filterLabel);
  };

  // Product Selection Handlers
  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  return (
    <div
      id="inventory-management-view"
      className="h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800 select-none p-1 sm:p-2 max-w-7xl mx-auto w-full gap-1 sm:gap-1.5"
    >
      {/* ======================================================== */}
      {/* 1. Header Toolbar & Sub-Tab Switcher (Pinned at Top)     */}
      {/* ======================================================== */}
      <div className="bg-white rounded-lg p-1 sm:p-1.5 border border-teal-100 shadow-2xs flex items-center justify-between gap-1 shrink-0 flex-wrap">
        {/* Subtabs Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-slate-100 rounded-md">
          {/* Batches Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('batches');
              setExpiryFilter('all');
            }}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeTab === 'batches'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الدفعات والتشغيلات</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'batches' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {batches.length}
            </span>
          </button>

          {/* Products & Medicine Directory Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('products');
              setExpiryFilter('all');
            }}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>دليل الأصناف</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'products' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* Smart Cycle Audit Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-teal-800 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-teal-300" />
            <span>الجرد ومطابقة الأرفف</span>
          </button>

          {/* Reorder Hub Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('reorder')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeTab === 'reorder'
                ? 'bg-amber-800 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-amber-300" />
            <span>النواقص وإعادة الطلب</span>
            {lowStockProductsCount + outOfStockCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded-full font-mono font-bold bg-amber-200 text-amber-900">
                {lowStockProductsCount + outOfStockCount}
              </span>
            )}
          </button>

          {/* Expiry Risk & Returns Hub */}
          <button
            type="button"
            onClick={() => setActiveTab('expiry_hub')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeTab === 'expiry_hub'
                ? 'bg-rose-800 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
            <span>إدارة الصلاحية والإرجاع</span>
            {expiredCount + near90DaysCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded-full font-mono font-bold bg-rose-200 text-rose-900">
                {expiredCount + near90DaysCount}
              </span>
            )}
          </button>

          {/* Valuation Tab */}
          {canViewValuation && (
            <button
              type="button"
              onClick={() => setActiveTab('valuation')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                activeTab === 'valuation'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>تقييم رأس المال</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Add Product Button */}
          {canEditInventory && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="إضافة صنف دوائي جديد"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إضافة دواء</span>
              </button>

              {/* Import Excel */}
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="استيراد ذكي للأدوية والمخزون والتشغيلات من Excel أو البحث السحابي"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                <span>استيراد ذكي</span>
              </button>
            </>
          )}

          {/* View Mode Toggle for Table vs Cards */}
          {(activeTab === 'batches' || activeTab === 'products') && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-500'
                }`}
                title="عرض جدول منظم مدمج"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-500'
                }`}
                title="عرض بطاقات لمسية"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={refreshData}
            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Print Report */}
          <button
            type="button"
            onClick={handlePrintReport}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="طباعة تقرير جرد المخزون"
          >
            <Printer className="w-3.5 h-3.5 text-teal-700" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2 py-1 rounded-md bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="تصدير إكسل"
          >
            <Download className="w-3.5 h-3.5 text-teal-200" />
            <span className="hidden sm:inline">إكسل</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. KPI Financial & Status Summary: Mobile Ticker / Desktop */}
      {/* ======================================================== */}
      {activeTab !== 'audit' && activeTab !== 'reorder' && activeTab !== 'expiry_hub' && (
        <>
          {/* Mobile Ultra-Compact Strip */}
          <div className="sm:hidden bg-white rounded-lg px-2 py-1 border border-teal-100 shadow-2xs flex items-center justify-between text-[11px] font-bold shrink-0 gap-1 overflow-x-auto">
            <div className="flex items-center gap-1 text-slate-800 shrink-0">
              <span className="text-[10px] text-slate-500 font-normal">رأس المال:</span>
              <span className="font-mono text-teal-800 font-black">{formatCurrency(totalCostValue)}</span>
            </div>
            <div className="w-px h-3 bg-slate-200 shrink-0" />
            <div className="flex items-center gap-1 text-emerald-900 shrink-0">
              <span className="text-[10px] text-slate-500 font-normal">البيع:</span>
              <span className="font-mono text-emerald-700 font-black">{formatCurrency(totalRetailValue)}</span>
            </div>
            <div className="w-px h-3 bg-slate-200 shrink-0" />
            <button
              type="button"
              onClick={() => {
                setActiveTab('expiry_hub');
              }}
              className="flex items-center gap-0.5 text-amber-800 shrink-0 cursor-pointer"
            >
              <span className="text-[10px] text-slate-500 font-normal">قرب انتهاء:</span>
              <span className="font-mono font-bold bg-amber-100 text-amber-900 px-1 rounded-full text-[10px]">
                {near90DaysCount}
              </span>
            </button>
          </div>

          {/* Desktop 4 Metric Cards */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-1.5 shrink-0">
            {/* Cost Value or Product Count */}
            <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>{canViewCost ? 'قيمة المخزون (سعر التكلفة)' : 'إجمالي الأصناف المسجلة'}</span>
                <DollarSign className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="text-sm font-mono font-black text-slate-900">
                {canViewCost ? formatCurrency(totalCostValue) : `${products.length} صنف`}
              </div>
              <div className="text-[10px] text-teal-800 font-medium">
                {totalActivePackages.toLocaleString('ar-YE')} عبوة متوفرة ({products.length} صنف مسجل)
              </div>
            </div>

            {/* Retail Expected Value */}
            <div className="bg-white rounded-lg p-1.5 border border-emerald-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>القيمة البيعية المتوقعة</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-sm font-mono font-black text-emerald-700">{formatCurrency(totalRetailValue)}</div>
              <div className="text-[10px] text-slate-500">
                {canViewCost ? (
                  <>
                    هامش ربح متوقع:{' '}
                    <strong className="text-emerald-700 font-mono">
                      {formatCurrency(totalRetailValue - totalCostValue)} (
                      {totalCostValue > 0
                        ? Math.round(((totalRetailValue - totalCostValue) / totalCostValue) * 100)
                        : 0}
                      %)
                    </strong>
                  </>
                ) : (
                  <span>إجمالي قيمة البيع للجمهور</span>
                )}
              </div>
            </div>

            {/* Near Expiry Warning */}
            <div
              onClick={() => {
                setActiveTab('expiry_hub');
              }}
              className={`rounded-lg p-1.5 border shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                near90DaysCount > 0
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={near90DaysCount > 0 ? 'text-amber-900' : 'text-slate-600'}>
                  قرب الانتهاء (خلال 3 أشهر)
                </span>
                <Clock className={`w-3.5 h-3.5 ${near90DaysCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-sm font-mono font-black text-amber-700">{near90DaysCount} تشغيلة</div>
              <div className="text-[10px] text-amber-900 truncate">
                {near30DaysCount > 0 ? `منها ${near30DaysCount} تنتهي خلال شهر` : 'يوصى بتقديمها في الصرف'}{' '}
                <span className="font-mono font-bold">({formatCurrency(near90StockCost)})</span>
              </div>
            </div>

            {/* Expired Stock Warning */}
            <div
              onClick={() => {
                setActiveTab('expiry_hub');
              }}
              className={`rounded-lg p-1.5 border shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                expiredCount > 0
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={expiredCount > 0 ? 'text-rose-900' : 'text-slate-600'}>أدوية منتهية الصلاحية</span>
                <AlertCircle className={`w-3.5 h-3.5 ${expiredCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-sm font-mono font-black text-rose-700">{expiredCount} تشغيلة</div>
              <div className="text-[10px] text-rose-900 truncate">
                {expiredCount > 0 ? 'يجب عزلها وإتلافها فوراً' : 'كافة الدفعات سارية الصلاحية'}{' '}
                {expiredCount > 0 && <span className="font-mono font-bold">({formatCurrency(expiredStockCost)})</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 3. Search, Filter Chips & Sorting Bar (For Batches & Prods) */}
      {/* ======================================================== */}
      {(activeTab === 'batches' || activeTab === 'products') && (
        <div className="bg-white rounded-lg p-1 border border-teal-100 shadow-2xs flex items-center gap-1 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-teal-600 absolute right-2 top-1.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'products'
                  ? 'بحث بالاسم التجاري، العلمي، الباركود أو الرف...'
                  : 'بحث بالدواء، التشغيلة، الباركود أو المورد...'
              }
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

          {/* Category Dropdown */}
          <div className="w-28 sm:w-36 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'الكل' ? 'جميع المجموعات' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Shelf / Rack Dropdown */}
          <div className="w-28 sm:w-36 shrink-0">
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {availableRacks.map((r) => (
                <option key={r} value={r}>
                  {r === 'الكل' ? 'جميع الأرفف' : `موقع: ${r}`}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Expiry / Stock Filter Chips */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setExpiryFilter('all')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                expiryFilter === 'all'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              الكل
            </button>

            {activeTab !== 'products' && (
              <>
                <button
                  type="button"
                  onClick={() => setExpiryFilter('healthy')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    expiryFilter === 'healthy'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  صالح ({healthyCount})
                </button>

                <button
                  type="button"
                  onClick={() => setExpiryFilter('90days')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    expiryFilter === '90days'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ينتهي ≤ 90 يوم ({near90DaysCount})
                </button>

                <button
                  type="button"
                  onClick={() => setExpiryFilter('expired')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    expiryFilter === 'expired'
                      ? 'bg-rose-700 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  منتهية ({expiredCount})
                </button>
              </>
            )}

            {activeTab === 'products' && (
              <button
                type="button"
                onClick={() => setExpiryFilter('low')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                  expiryFilter === 'low'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                <span>رصيد منخفض ({lowStockProductsCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setExpiryFilter('out')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                expiryFilter === 'out'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              نفدت ({outOfStockCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0 w-28 sm:w-36">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded pr-1.5 pl-5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {activeTab !== 'products' && <option value="expiry_asc">الأقرب انتهاءً</option>}
              {activeTab !== 'products' && <option value="expiry_desc">الأبعد انتهاءً</option>}
              <option value="qty_desc">الأكثر كمية</option>
              <option value="cost_desc">الأعلى تكلفة</option>
              <option value="retail_desc">الأعلى قيمة بيع</option>
              <option value="name_asc">الاسم أبجدياً</option>
            </select>
            <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 absolute left-1.5 top-1.5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Bulk Selection Operations Floating Bar for Products */}
      {activeTab === 'products' && selectedProductIds.size > 0 && (
        <div className="bg-teal-900 text-white px-3 py-1.5 rounded-lg border border-teal-700 shadow-lg flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-teal-300" />
            <span className="font-bold text-xs">تم تحديد {selectedProductIds.size} صنف دوائي</span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            {canEditInventory && (
              <button
                type="button"
                onClick={() => setIsBulkLocationOpen(true)}
                className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-600 text-white font-bold flex items-center gap-1 transition-all"
              >
                <MapPin className="w-3 h-3 text-teal-300" />
                <span>نقل موقع الرف جماعياً</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const selectedList = products.filter((p) => selectedProductIds.has(p.id));
                excelService.exportProductsToCSV(selectedList);
                showToast(`تم تصدير (${selectedList.length}) صنف محدد إلى Excel`, 'success');
              }}
              className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-600 text-white font-bold flex items-center gap-1 transition-all"
            >
              <Download className="w-3 h-3 text-teal-300" />
              <span>تصدير المحدد</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProductIds(new Set())}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-[11px]"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. NEW TAB: Smart Cycle Count & Audit Tab                */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <InventoryAuditTab
          batches={batches}
          products={products}
          onRefresh={refreshData}
          canEditInventory={canEditInventory}
        />
      )}

      {/* ======================================================== */}
      {/* 5. NEW TAB: Shortages & Smart Purchase Reordering Forecast */}
      {/* ======================================================== */}
      {activeTab === 'reorder' && (
        <InventoryReorderTab products={products} batches={batches} onRefresh={refreshData} />
      )}

      {/* ======================================================== */}
      {/* 6. NEW TAB: Expiry Risk & Return Management Hub          */}
      {/* ======================================================== */}
      {activeTab === 'expiry_hub' && (
        <InventoryExpiryRiskTab
          batches={batches}
          products={products}
          onRefresh={refreshData}
          canEditInventory={canEditInventory}
        />
      )}

      {/* ======================================================== */}
      {/* 7. Valuation Analytics Tab View                          */}
      {/* ======================================================== */}
      {activeTab === 'valuation' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
          {/* Main Financial Card */}
          <div className="bg-gradient-to-br from-teal-900 to-teal-800 text-white rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-teal-700/60 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <h2 className="font-bold text-xs sm:text-sm text-white">
                  التقرير المالي لتقييم رأس مال المخزون الدوائي
                </h2>
              </div>
              <span className="text-[10px] text-teal-200 font-mono">
                تاريخ الجرد: {new Date().toLocaleDateString('ar-YE')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
              <div className="bg-teal-950/40 border border-teal-600/30 rounded-lg p-2">
                <span className="text-teal-200 block text-[10px]">رأس المال المحبوس (التكلفة):</span>
                <div className="text-sm sm:text-base font-mono font-black text-white mt-0.5">
                  {formatCurrency(totalCostValue)}
                </div>
                <p className="text-[9px] text-teal-300 mt-0.5">إجمالي مبالغ الشراء لكافة الأصناف بالمخازن</p>
              </div>

              <div className="bg-teal-950/40 border border-teal-600/30 rounded-lg p-2">
                <span className="text-teal-200 block text-[10px]">العائد الإجمالي المتوقع (البيع):</span>
                <div className="text-sm sm:text-base font-mono font-black text-emerald-300 mt-0.5">
                  {formatCurrency(totalRetailValue)}
                </div>
                <p className="text-[9px] text-teal-300 mt-0.5">إجمالي الإيراد عند تصريف كامل العبوات بالصيدلية</p>
              </div>

              <div className="bg-teal-950/40 border border-teal-600/30 rounded-lg p-2">
                <span className="text-teal-200 block text-[10px]">هامش الربح التجاري الصافي:</span>
                <div className="text-sm sm:text-base font-mono font-black text-amber-300 mt-0.5">
                  {formatCurrency(totalRetailValue - totalCostValue)} (
                  {totalCostValue > 0
                    ? Math.round(((totalRetailValue - totalCostValue) / totalCostValue) * 100)
                    : 0}
                  %)
                </div>
                <p className="text-[9px] text-teal-300 mt-0.5">الفرق الإجمالي بين أسعار البيع والتكلفة</p>
              </div>
            </div>
          </div>

          {/* Capital Risk Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
            {/* Safe Stock */}
            <div className="bg-white rounded-lg p-2 border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between font-bold text-emerald-900 text-[11px]">
                <span>المخزون الآمن والصالح</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-sm font-mono font-black text-emerald-700 mt-1">
                {formatCurrency(
                  batches
                    .filter((b) => new Date(b.expiryDate) > dateIn90Days && b.quantity > 0)
                    .reduce((acc, b) => acc + b.costPrice * b.quantity, 0)
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                يمثل {healthyCount} تشغيلة صالحة لأكثر من 3 أشهر
              </div>
            </div>

            {/* Near Expiry Risk */}
            <div className="bg-white rounded-lg p-2 border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between font-bold text-amber-900 text-[11px]">
                <span>رأس مال معرض للخطر (≤ 90 يوم)</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-sm font-mono font-black text-amber-700 mt-1">
                {formatCurrency(near90StockCost)}
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5">
                موزعة على {near90DaysCount} تشغيلة ينصح بتسريع بيعها أو إرجاعها
              </div>
            </div>

            {/* Expired Dead Capital */}
            <div className="bg-white rounded-lg p-2 border border-rose-200 shadow-2xs">
              <div className="flex items-center justify-between font-bold text-rose-900 text-[11px]">
                <span>خسائر الهالك المنتهي الصلاحية</span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-sm font-mono font-black text-rose-700 mt-1">
                {formatCurrency(expiredStockCost)}
              </div>
              <div className="text-[10px] text-rose-800 mt-0.5">
                {expiredCount} تشغيلة منتهية يلزم عزلها وإتلافها
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. Products Catalog Tab View (`دليل الأصناف والأدوية`)     */}
      {/* ======================================================== */}
      {activeTab === 'products' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-400">
                  <Pill className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-bold text-slate-700 text-xs">لا توجد أدوية مطابقة للبحث أو التصفية</p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isOut = product.totalQuantity === 0;
                  const isLow = product.totalQuantity <= product.minStock && !isOut;
                  const isSelected = selectedProductIds.has(product.id);

                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-lg p-2 border shadow-2xs transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                          : isOut
                          ? 'border-rose-200 bg-rose-50/20'
                          : isLow
                          ? 'border-amber-200 bg-amber-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Name & Stock status */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectProduct(product.id)}
                            className="mt-0.5 w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-50 border-slate-300 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span className="bg-teal-50 text-teal-800 px-1 rounded font-bold">
                                {product.category}
                              </span>
                              {product.strength && <span>• {product.strength}</span>}
                              {product.locationRack && (
                                <span className="flex items-center gap-0.5 text-teal-700 font-semibold">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {product.locationRack}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOut ? 'نافد' : isLow ? 'منخفض' : 'متوفر'}
                        </span>
                      </div>

                      {/* Numbers */}
                      <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-1 rounded border border-slate-100 text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[9px]">الرصيد</span>
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {product.totalQuantity}{' '}
                            <span className="text-[9px] font-normal text-slate-500">عبوة</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">سعر الشراء</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatCurrency(product.costPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">سعر الجمهور</span>
                          <span className="font-mono font-black text-emerald-700">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">إجمالي القيمة</span>
                          <span className="font-mono font-black text-teal-800">
                            {formatCurrency(product.costPrice * product.totalQuantity)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className={`grid ${canEditInventory ? 'grid-cols-3' : 'grid-cols-1'} gap-1`}>
                        {canEditInventory && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(product);
                              setIsProductModalOpen(true);
                            }}
                            className="py-1 px-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeProduct(product);
                            setIsBarcodeModalOpen(true);
                          }}
                          className="py-1 px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                        >
                          <Barcode className="w-3 h-3 text-teal-700" />
                          <span>باركود</span>
                        </button>

                        {canEditInventory && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="py-1 px-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-2 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length
                          }
                          onChange={handleSelectAllProducts}
                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-50 border-slate-300 cursor-pointer"
                          title="تحديد الكل"
                        />
                      </th>
                      <th className="py-1.5 px-2">اسم الصنف الدوائي والمواصفات</th>
                      <th className="py-1.5 px-1.5">المجموعة / الشكل</th>
                      <th className="py-1.5 px-1.5">الباركود</th>
                      <th className="py-1.5 px-1.5 text-center">الكمية المتوفرة</th>
                      {canViewCost && <th className="py-1.5 px-1.5 text-left">سعر الشراء</th>}
                      <th className="py-1.5 px-1.5 text-left">سعر الجمهور</th>
                      <th className="py-1.5 px-1.5 text-left">سعر الشريط/الحبة</th>
                      <th className="py-1.5 px-1.5 text-left">موقع الرف</th>
                      <th className="py-1.5 px-1.5 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={canViewCost ? 10 : 9} className="py-8 text-center text-slate-400">
                          <Pill className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                          <p className="font-bold text-slate-700 text-xs">
                            لا توجد أدوية مطابقة للبحث أو التصفية
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const isOut = product.totalQuantity === 0;
                        const isLow = product.totalQuantity <= product.minStock && !isOut;
                        const isSelected = selectedProductIds.has(product.id);

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-teal-50/50 transition-colors ${
                              isSelected ? 'bg-teal-50/70' : isOut ? 'bg-rose-50/20' : isLow ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="py-1 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectProduct(product.id)}
                                className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-50 border-slate-300 cursor-pointer"
                              />
                            </td>

                            {/* Product Name */}
                            <td className="py-1 px-2">
                              <div className="font-bold text-slate-900 text-xs leading-tight">
                                {product.name}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-0.2">
                                <span>{product.scientificName || '-'}</span>
                                {product.strength && <span>• {product.strength}</span>}
                                {product.manufacturer && <span>• {product.manufacturer}</span>}
                              </div>
                            </td>

                            {/* Category & Form */}
                            <td className="py-1 px-1.5 text-[11px] text-slate-700">
                              <span className="font-medium">{product.category}</span>
                              <span className="block text-[9px] text-slate-400">{product.form}</span>
                            </td>

                            {/* Barcode */}
                            <td className="py-1 px-1.5 font-mono text-[10px] text-slate-600">
                              {product.barcode || '-'}
                            </td>

                            {/* Total Quantity */}
                            <td className="py-1 px-1.5 text-center">
                              <span
                                className={`font-mono font-black text-xs px-1.5 py-0.2 rounded ${
                                  isOut
                                    ? 'bg-rose-100 text-rose-900'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'text-slate-900'
                                }`}
                              >
                                {product.totalQuantity} عبوة
                              </span>
                              {product.stripsPerPackage && product.stripsPerPackage > 1 && (
                                <span className="block text-[9px] font-mono text-slate-400">
                                  ({product.totalQuantity * product.stripsPerPackage} شريط)
                                </span>
                              )}
                            </td>

                            {/* Cost Price */}
                            {canViewCost && (
                              <td className="py-1 px-1.5 text-left font-mono font-medium text-slate-700 text-[11px]">
                                {formatCurrency(product.costPrice)}
                              </td>
                            )}

                            {/* Selling Price */}
                            <td className="py-1 px-1.5 text-left font-mono font-bold text-emerald-700 text-[11px]">
                              {formatCurrency(product.price)}
                            </td>

                            {/* Strip / Piece Price */}
                            <td className="py-1 px-1.5 text-left font-mono text-[10px] text-slate-600">
                              <span>شريط: {formatCurrency(product.stripPrice || product.price)}</span>
                              {product.piecePrice && (
                                <span className="block text-[9px] text-slate-400">
                                  حبة: {formatCurrency(product.piecePrice)}
                                </span>
                              )}
                            </td>

                            {/* Location Rack */}
                            <td className="py-1 px-1.5 text-left text-[10px] text-slate-600 font-medium">
                              <span className="flex items-center gap-0.5 text-teal-800">
                                <MapPin className="w-2.5 h-2.5 text-teal-600" />
                                {product.locationRack || 'الرف العام'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-1 px-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {canEditInventory && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(product);
                                      setIsProductModalOpen(true);
                                    }}
                                    className="p-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-[10px] flex items-center gap-0.5 active:scale-95 cursor-pointer shadow-2xs"
                                    title="تعديل بيانات الصنف"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>تعديل</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setBarcodeProduct(product);
                                    setIsBarcodeModalOpen(true);
                                  }}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] active:scale-95 cursor-pointer"
                                  title="طباعة ملصق الباركود"
                                >
                                  <Barcode className="w-3 h-3 text-teal-700" />
                                </button>

                                {canEditInventory && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(product)}
                                    className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] active:scale-95 cursor-pointer"
                                    title="حذف الصنف"
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
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. Batches Table / Cards View                            */}
      {/* ======================================================== */}
      {activeTab === 'batches' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {filteredBatches.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-bold text-slate-700 text-xs">لا توجد تشغيلات مطابقة للبحث أو التصفية</p>
                </div>
              ) : (
                filteredBatches.map((batch) => {
                  const prod = products.find((p) => p.id === batch.productId);
                  const status = getBatchStatus(batch);
                  const StatusIcon = status.icon;
                  const isExp = status.color === 'rose';

                  return (
                    <div
                      key={batch.id}
                      className={`bg-white rounded-lg p-2 border shadow-2xs transition-all space-y-1.5 ${
                        isExp
                          ? 'border-rose-300 bg-rose-50/20'
                          : status.isCritical
                          ? 'border-amber-200/90'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Medicine Name + Status Badge */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
                            {prod?.name || batch.productName || 'دواء'}
                          </h3>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="bg-teal-50 text-teal-800 px-1 rounded font-bold">
                              #{batch.batchNumber}
                            </span>
                            {prod?.strength && <span>• {prod.strength}</span>}
                            {prod?.locationRack && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <MapPin className="w-2.5 h-2.5 text-teal-600" />
                                {prod.locationRack}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-0.5 ${status.bgClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{status.label}</span>
                        </span>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-1 rounded border border-slate-100 text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[9px]">الكمية</span>
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {batch.quantity}{' '}
                            <span className="text-[9px] font-normal text-slate-500">عبوة</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px]">الانتهاء</span>
                          <span
                            className={`font-mono font-bold ${
                              isExp ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {batch.expiryDate}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px]">
                            {canViewCost ? 'الشراء / البيع' : 'سعر البيع'}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {canViewCost ? `${batch.costPrice}/${batch.sellingPrice}` : batch.sellingPrice}
                          </span>
                        </div>

                        {canViewCost && (
                          <div>
                            <span className="text-slate-400 block text-[9px]">إجمالي التكلفة</span>
                            <span className="font-mono font-black text-teal-800">
                              {formatCurrency(batch.costPrice * batch.quantity)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className={`grid ${canEditInventory ? 'grid-cols-4' : 'grid-cols-2'} gap-1`}>
                        {canEditInventory && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchForAdjustment(batch);
                              setIsAdjustmentModalOpen(true);
                            }}
                            className="col-span-2 py-1 px-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Scale className="w-3 h-3" />
                            <span>تسوية</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBatchForDetail(batch);
                            setIsDetailModalOpen(true);
                          }}
                          className="col-span-1 py-1 px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                          title="تفاصيل الصنف"
                        >
                          <Eye className="w-3 h-3" />
                          <span>تفاصيل</span>
                        </button>

                        {isExp && batch.quantity > 0 && canEditInventory ? (
                          <button
                            type="button"
                            onClick={() => handleDisposeExpired(batch)}
                            className="col-span-1 py-1 px-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                            title="إتلاف الهالك"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>إتلاف</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchForHistory(batch);
                              setIsHistoryModalOpen(true);
                            }}
                            className="col-span-1 py-1 px-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                            title="سجل الحركات"
                          >
                            <History className="w-3 h-3" />
                            <span>سجل</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-teal-100 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-2">اسم الصنف الدوائي</th>
                      <th className="py-1.5 px-1.5">التشغيلة (Batch)</th>
                      <th className="py-1.5 px-1.5">تاريخ الانتهاء</th>
                      <th className="py-1.5 px-1.5">الحالة والصلاحية</th>
                      <th className="py-1.5 px-1.5 text-center">الكمية المتوفرة</th>
                      {canViewCost && <th className="py-1.5 px-1.5 text-left">سعر الشراء</th>}
                      <th className="py-1.5 px-1.5 text-left">سعر البيع</th>
                      {canViewCost && <th className="py-1.5 px-1.5 text-left">إجمالي التكلفة</th>}
                      <th className="py-1.5 px-1.5 text-left">المورد / الرف</th>
                      <th className="py-1.5 px-1.5 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan={canViewCost ? 10 : 8} className="py-8 text-center text-slate-400">
                          <Package className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                          <p className="font-bold text-slate-700 text-xs">
                            لا توجد تشغيلات مطابقة للبحث أو التصفية
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((batch) => {
                        const prod = products.find((p) => p.id === batch.productId);
                        const status = getBatchStatus(batch);
                        const StatusIcon = status.icon;
                        const isExp = status.color === 'rose';

                        return (
                          <tr
                            key={batch.id}
                            className={`hover:bg-teal-50/50 transition-colors ${
                              isExp ? 'bg-rose-50/20' : ''
                            }`}
                          >
                            {/* Product Name */}
                            <td className="py-1 px-2">
                              <div className="font-bold text-slate-900 text-xs leading-tight">
                                {prod?.name || batch.productName || 'دواء'}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-0.2">
                                <span>{prod?.category || 'عام'}</span>
                                {prod?.strength && <span>• {prod.strength}</span>}
                                {prod?.barcode && <span>• {prod.barcode}</span>}
                              </div>
                            </td>

                            {/* Batch # */}
                            <td className="py-1 px-1.5 font-mono">
                              <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[10px]">
                                {batch.batchNumber}
                              </span>
                            </td>

                            {/* Expiry Date */}
                            <td className="py-1 px-1.5 font-mono text-[11px]">
                              <span
                                className={`font-bold ${
                                  isExp ? 'text-rose-700 font-black' : 'text-slate-800'
                                }`}
                              >
                                {batch.expiryDate}
                              </span>
                              <span className="block text-[9px] text-slate-400">{status.daysText}</span>
                            </td>

                            {/* Expiry Status Badge */}
                            <td className="py-1 px-1.5">
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] ${status.bgClass}`}
                              >
                                <StatusIcon className="w-2.5 h-2.5" />
                                <span>{status.label}</span>
                              </span>
                            </td>

                            {/* Quantity */}
                            <td className="py-1 px-1.5 text-center">
                              <span className="font-mono font-black text-xs text-slate-900">
                                {batch.quantity}
                              </span>{' '}
                              <span className="text-[10px] text-slate-500">عبوة</span>
                              {prod?.stripsPerPackage && prod.stripsPerPackage > 1 && (
                                <span className="block text-[9px] font-mono text-slate-400">
                                  ({batch.quantity * prod.stripsPerPackage} شريط)
                                </span>
                              )}
                            </td>

                            {/* Cost Price */}
                            {canViewCost && (
                              <td className="py-1 px-1.5 text-left font-mono font-medium text-slate-700 text-[11px]">
                                {formatCurrency(batch.costPrice)}
                              </td>
                            )}

                            {/* Selling Price */}
                            <td className="py-1 px-1.5 text-left font-mono font-bold text-emerald-700 text-[11px]">
                              {formatCurrency(batch.sellingPrice)}
                            </td>

                            {/* Total Cost Valuation */}
                            {canViewCost && (
                              <td className="py-1 px-1.5 text-left font-mono font-black text-teal-900 text-[11px]">
                                {formatCurrency(batch.costPrice * batch.quantity)}
                                <span className="block text-[9px] text-emerald-600 font-normal">
                                  بيع: {formatCurrency(batch.sellingPrice * batch.quantity)}
                                </span>
                              </td>
                            )}

                            {/* Supplier & Rack */}
                            <td className="py-1 px-1.5 text-left text-[10px] text-slate-600">
                              <span className="font-medium text-slate-800 block truncate max-w-[90px]">
                                {batch.supplierName || 'توريد مباشر'}
                              </span>
                              <span className="text-[9px] text-teal-700 flex items-center gap-0.5 font-mono">
                                <MapPin className="w-2.5 h-2.5" />
                                {prod?.locationRack || 'الرف العام'}
                              </span>
                            </td>

                            {/* Quick Action Buttons */}
                            <td className="py-1 px-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {canEditInventory && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBatchForAdjustment(batch);
                                      setIsAdjustmentModalOpen(true);
                                    }}
                                    className="p-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-[10px] flex items-center gap-0.5 active:scale-95 cursor-pointer shadow-2xs"
                                    title="جرد وتسوية الرصيد الفعلي"
                                  >
                                    <Scale className="w-3 h-3" />
                                    <span>تسوية</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBatchForDetail(batch);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] active:scale-95 cursor-pointer"
                                  title="تفاصيل وبيانات الدفعة"
                                >
                                  <Eye className="w-3 h-3 text-teal-700" />
                                </button>

                                {isExp && batch.quantity > 0 && canEditInventory ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDisposeExpired(batch)}
                                    className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] active:scale-95 cursor-pointer"
                                    title="إتلاف وتصفير الهالك"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBatchForHistory(batch);
                                      setIsHistoryModalOpen(true);
                                    }}
                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] active:scale-95 cursor-pointer"
                                    title="سجل الحركات والتعديلات"
                                  >
                                    <History className="w-3 h-3 text-slate-600" />
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
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. All Modals                                           */}
      {/* ======================================================== */}

      {/* Bulk Location Update Modal */}
      <BulkLocationModal
        isOpen={isBulkLocationOpen}
        onClose={() => setIsBulkLocationOpen(false)}
        selectedProductIds={Array.from(selectedProductIds)}
        products={products}
        onUpdated={() => {
          refreshData();
          setSelectedProductIds(new Set());
        }}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        batch={selectedBatchForAdjustment}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setSelectedBatchForAdjustment(null);
        }}
        onSaved={() => {
          refreshData();
          showToast('تمت التسوية الجردية وتعديل رصيد الدفعة بنجاح', 'success');
        }}
      />

      {/* Batch History Timeline Modal */}
      <BatchHistoryModal
        isOpen={isHistoryModalOpen}
        batch={selectedBatchForHistory}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedBatchForHistory(null);
        }}
      />

      {/* Batch Details Card Modal */}
      <BatchDetailModal
        isOpen={isDetailModalOpen}
        batch={selectedBatchForDetail}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBatchForDetail(null);
        }}
        onOpenAdjustment={(batch) => {
          setSelectedBatchForAdjustment(batch);
          setIsAdjustmentModalOpen(true);
        }}
        onOpenHistory={(batch) => {
          setSelectedBatchForHistory(batch);
          setIsHistoryModalOpen(true);
        }}
      />

      {/* Product Add / Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={(prod) => {
          refreshData();
          showToast(
            editingProduct
              ? `تم تحديث بيانات (${prod.name}) بنجاح`
              : `تمت إضافة (${prod.name}) إلى الدليل الدوائي`,
            'success'
          );
        }}
      />

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        isOpen={isBarcodeModalOpen}
        product={barcodeProduct}
        onClose={() => {
          setIsBarcodeModalOpen(false);
          setBarcodeProduct(null);
        }}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          refreshData();
          showToast('تم استيراد قائمة الأدوية بنجاح إلى النظام', 'success');
        }}
      />
    </div>
  );
};
