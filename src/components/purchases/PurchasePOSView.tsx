import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Truck,
  Trash2,
  Plus,
  Minus,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  Package,
  ChevronDown,
  X,
  UserCheck,
  Calendar,
  Layers,
  Barcode,
  Building2,
  Printer
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../database/db';
import { Product, Supplier, PurchaseItem, PurchaseInvoice } from '../../types';
import { ManualItemModal } from '../pos/ManualItemModal';
import { ThermalReceiptModal } from '../pos/ThermalReceiptModal';
import confetti from 'canvas-confetti';

const CATEGORIES = [
  'الكل',
  'أقراص وكبسولات',
  'شراب ومعلقات',
  'مضادات حيوية',
  'مسكنات وخافضات',
  'قطرات وبخاخات',
  'كريمات ومراهم',
  'فيتامينات ومكملات',
  'مستلزمات طبية',
];

interface PurchasePOSItem {
  productId: string;
  productName: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  total: number;
}

export const PurchasePOSView: React.FC = () => {
  const { settings, formatCurrency, setPurchasesSubTab } = useSettingsStore();
  const { currentUser } = useAuthStore();

  // Suppliers & Products
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [notes, setNotes] = useState('');

  // Dropdown states
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Search & Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Purchase Items (Cart)
  const [purchaseItems, setPurchaseItems] = useState<PurchasePOSItem[]>([]);
  const [paidInput, setPaidInput] = useState<string>('');

  // Modals & Feedback
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<PurchaseInvoice | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const refreshData = () => {
    const sups = db.getSuppliers();
    const prods = db.getProducts();
    setAllSuppliers(sups);
    setAllProducts(prods);

    if (sups.length > 0 && !selectedSupplier) {
      setSelectedSupplier(sups[0]);
      setSupplierNameInput(sups[0].name);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter Suppliers
  const filteredSuppliers = allSuppliers.filter((s) => {
    if (!supplierNameInput.trim()) return true;
    return (
      s.name.toLowerCase().includes(supplierNameInput.toLowerCase()) ||
      s.phone.includes(supplierNameInput) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(supplierNameInput.toLowerCase()))
    );
  });

  // Filter Catalog Products
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.scientificName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery);

    const matchesCategory =
      selectedCategory === 'الكل' ||
      (selectedCategory === 'أقراص وكبسولات' && (product.form?.includes('أقراص') || product.form?.includes('كبسول'))) ||
      (selectedCategory === 'شراب ومعلقات' && product.form?.includes('شراب')) ||
      (selectedCategory === 'مضادات حيوية' && product.category?.includes('مضاد')) ||
      (selectedCategory === 'مسكنات وخافضات' && (product.category?.includes('مسكن') || product.name?.includes('بندول') || product.name?.includes('بروفين'))) ||
      (selectedCategory === 'قطرات وبخاخات' && (product.form?.includes('قطرة') || product.form?.includes('بخاخ'))) ||
      (selectedCategory === 'كريمات ومراهم' && (product.form?.includes('مرهم') || product.form?.includes('كريم') || product.form?.includes('جل'))) ||
      (selectedCategory === 'فيتامينات ومكملات' && (product.category?.includes('فيتامين') || product.category?.includes('مكمل'))) ||
      (selectedCategory === 'مستلزمات طبية' && product.category?.includes('مستلزم'));

    return matchesSearch && matchesCategory;
  });

  // Financial Calculations
  const getSubtotal = () => {
    return purchaseItems.reduce((acc, item) => acc + item.total, 0);
  };

  const getGrandTotal = () => {
    return getSubtotal();
  };

  // Add Product to Purchase invoice
  const addProductToPurchase = (product: Product) => {
    const defaultBatch = `BAT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 89)}`;
    const defaultExpiry = '2028-12-31';

    const existingIndex = purchaseItems.findIndex((item) => item.productId === product.id);

    if (existingIndex >= 0) {
      const updated = [...purchaseItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].costPrice;
      setPurchaseItems(updated);
    } else {
      const newItem: PurchasePOSItem = {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        batchNumber: defaultBatch,
        expiryDate: defaultExpiry,
        quantity: 10,
        costPrice: product.costPrice || Math.round(product.price * 0.75),
        sellingPrice: product.price,
        total: 10 * (product.costPrice || Math.round(product.price * 0.75)),
      };
      setPurchaseItems((prev) => [newItem, ...prev]);
    }
    showToast(`تمت إضافة: ${product.name}`);
  };

  // Stepper handlers
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    const updated = [...purchaseItems];
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].costPrice;
    setPurchaseItems(updated);
  };

  const updateCostPrice = (index: number, cost: number) => {
    const updated = [...purchaseItems];
    updated[index].costPrice = cost;
    updated[index].total = updated[index].quantity * cost;
    setPurchaseItems(updated);
  };

  const updateSellingPrice = (index: number, sell: number) => {
    const updated = [...purchaseItems];
    updated[index].sellingPrice = sell;
    setPurchaseItems(updated);
  };

  const updateBatchNumber = (index: number, batch: string) => {
    const updated = [...purchaseItems];
    updated[index].batchNumber = batch;
    setPurchaseItems(updated);
  };

  const updateExpiryDate = (index: number, expiry: string) => {
    const updated = [...purchaseItems];
    updated[index].expiryDate = expiry;
    setPurchaseItems(updated);
  };

  const removeItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearPurchaseCart = () => {
    setPurchaseItems([]);
    setPaidInput('');
    setSupplierInvoiceNumber('');
  };

  // Search submission (Barcode / Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Try exact barcode match first
    const exactBarcode = allProducts.find((p) => p.barcode === searchQuery.trim());
    if (exactBarcode) {
      addProductToPurchase(exactBarcode);
      setSearchQuery('');
      return;
    }

    // Try name match
    if (filteredProducts.length > 0) {
      addProductToPurchase(filteredProducts[0]);
      setSearchQuery('');
    }
  };

  // Save Purchase Invoice
  const handleSavePurchaseInvoice = () => {
    if (purchaseItems.length === 0) {
      showToast('فاتورة الشراء فارغة! أضف أصنافاً أولاً');
      return;
    }

    const grandTotal = getGrandTotal();
    const currentPaid = paidInput !== '' ? (parseFloat(paidInput) || 0) : (paymentType === 'cash' ? grandTotal : 0);
    const remaining = Math.max(0, grandTotal - currentPaid);

    const items: PurchaseItem[] = purchaseItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      barcode: item.barcode,
      batchNumber: item.batchNumber || `BAT-${new Date().getFullYear()}-01`,
      expiryDate: item.expiryDate || '2028-12-31',
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      discount: 0,
      tax: 0,
      total: item.total,
    }));

    const invoice = db.createPurchaseInvoice({
      supplierInvoiceNumber: supplierInvoiceNumber || undefined,
      supplierId: selectedSupplier?.id || 'sup-cash',
      supplierName: selectedSupplier?.name || supplierNameInput || 'توريد نقدي مباشر',
      date: new Date().toISOString().split('T')[0],
      items,
      subtotal: grandTotal,
      discount: 0,
      tax: 0,
      grandTotal: grandTotal,
      paidAmount: currentPaid,
      remainingAmount: remaining,
      status: 'received',
      paymentStatus: currentPaid >= grandTotal ? 'paid' : currentPaid > 0 ? 'partial' : 'unpaid',
      notes: notes || undefined,
      createdBy: currentUser?.name || 'مدير الصيدلية',
    });

    setLastSavedInvoice(invoice);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {}

    showToast(`تم حفظ وتوريد الفاتورة #${invoice.invoiceNumber} بنجاح ✅`);
    clearPurchaseCart();
  };

  const handleClearSupplier = () => {
    setSelectedSupplier(null);
    setSupplierNameInput('');
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierNameInput(supplier.name);
    setIsSupplierDropdownOpen(false);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 text-slate-800 select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-3 py-1.5 rounded-lg shadow-lg border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 animate-fadeIn backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area (Compact spacing for mobile & desktop) */}
      <div className="flex-1 p-1.5 sm:p-2.5 max-w-7xl mx-auto w-full space-y-1.5">
        
        {/* ======================================================== */}
        {/* 1. Unified Row: Supplier Selector + Invoice # + Cash/Credit Buttons */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs flex items-center gap-1.5 relative flex-wrap sm:flex-nowrap">
          {/* Supplier Search and Select Input with Dropdown */}
          <div className="relative flex-1 min-w-[200px]" ref={supplierDropdownRef}>
            <Building2 className="w-3.5 h-3.5 text-teal-600 absolute right-2 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="اسم المورد أو شركة الأدوية..."
              value={supplierNameInput}
              onFocus={() => setIsSupplierDropdownOpen(true)}
              onChange={(e) => {
                setSupplierNameInput(e.target.value);
                setIsSupplierDropdownOpen(true);
                const matched = allSuppliers.find((s) => s.name === e.target.value);
                if (matched) setSelectedSupplier(matched);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pr-7 pl-6 py-1 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {supplierNameInput && (
              <button
                type="button"
                onClick={handleClearSupplier}
                className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px]"
                title="مسح"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Interactive Dropdown Results */}
            {isSupplierDropdownOpen && (
              <div className="absolute top-full right-0 left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-teal-200 divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fadeIn">
                <div className="px-2.5 py-1 bg-teal-50/90 flex items-center justify-between text-[10px] font-bold text-teal-900 sticky top-0 z-10">
                  <span>الموردون والشركات المسجلة ({filteredSuppliers.length})</span>
                  {selectedSupplier && (
                    <button
                      type="button"
                      onClick={handleClearSupplier}
                      className="text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      إلغاء التحديد ✕
                    </button>
                  )}
                </div>

                {filteredSuppliers.length === 0 ? (
                  <div className="p-3 text-center space-y-1">
                    <p className="text-xs text-slate-700 font-bold">
                      لا يوجد مورد مسجل بهذا الاسم
                    </p>
                    <p className="text-[10px] text-teal-700">
                      سيتم حفظ الفاتورة باسم &quot;{supplierNameInput || 'توريد نقدي'}&quot;
                    </p>
                  </div>
                ) : (
                  filteredSuppliers.map((sup) => {
                    const isSelected = selectedSupplier?.id === sup.id;
                    return (
                      <div
                        key={sup.id}
                        onClick={() => handleSelectSupplier(sup)}
                        className={`p-2 hover:bg-teal-50 active:bg-teal-100 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-teal-50/80 font-bold border-r-2 border-teal-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {isSelected ? <UserCheck className="w-3.5 h-3.5" /> : sup.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 leading-tight truncate">
                              {sup.name}
                            </div>
                            {sup.phone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sup.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left shrink-0 mr-1">
                          {sup.currentBalance > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              مستحقات للمورد: {formatCurrency(sup.currentBalance)}
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-medium">خالص الحساب</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Supplier Invoice # Input */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-1 shrink-0 w-32 sm:w-36 focus-within:border-teal-500">
            <span className="text-[10px] text-slate-500 font-bold ml-1">رقم الفاتورة:</span>
            <input
              type="text"
              placeholder="INV-123"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Cash / Credit Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => setPaymentType('cash')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer ${
                paymentType === 'cash'
                  ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>كاش</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('credit')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer ${
                paymentType === 'credit'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>آجل (ذمة)</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. Unified Product Search & Dropdown Category in the Same Row */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs flex items-center gap-1.5">
          {/* Single Unified Product Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-teal-600 absolute right-2.5 top-2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ابحث باسم الدواء، المادة، أو الباركود لإضافته لفاتورة الشراء..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pr-7 pl-2 py-1 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </form>

          {/* Dropdown Category Filter */}
          <div className="relative shrink-0 w-28 sm:w-36">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-md pr-2 pl-6 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
          </div>

          {/* Quick Actions (Add Manual Product) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="p-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 px-1.5"
              title="إضافة صنف جديد لقاعدة البيانات"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">صنف جديد</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. Drug Search Results Table (تظهر فقط عند البحث أو التصفية) */}
        {/* ======================================================== */}
        {(searchQuery.trim().length > 0 || selectedCategory !== 'الكل') && (
          <div className="bg-white rounded-lg border border-teal-200 shadow-xs overflow-hidden space-y-0 animate-fadeIn">
            <div className="px-2.5 py-1 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span className="text-xs font-bold text-teal-900">
                  الأصناف المتوفرة في النظام ({filteredProducts.length} صنف)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('الكل');
                }}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-1.5 py-0.5 rounded active:scale-95 cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-4 text-center text-slate-400 space-y-0.5">
                <p className="text-xs font-bold text-slate-600">لم يتم العثور على دواء مطابق</p>
                <p className="text-[10px] text-slate-400">انقر على &quot;صنف جديد&quot; لإضافته للمخزن مباشرة</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-1 px-2">اسم الصنف</th>
                      <th className="py-1 px-1.5 text-center">الشكل</th>
                      <th className="py-1 px-1.5 text-center">المخزون الحالي</th>
                      <th className="py-1 px-2 text-left">سعر الشراء الحالي</th>
                      <th className="py-1 px-2 text-left">سعر البيع</th>
                      <th className="py-1 px-1 text-center w-8">إضافة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.slice(0, 50).map((product) => {
                      return (
                        <tr
                          key={product.id}
                          onClick={() => addProductToPurchase(product)}
                          className="hover:bg-teal-50/60 active:bg-teal-100/60 cursor-pointer transition-colors"
                        >
                          <td className="py-1.5 px-2">
                            <div className="font-bold text-slate-800 text-xs leading-tight">{product.name}</div>
                            {product.scientificName && (
                              <div className="text-[9px] text-slate-400 truncate max-w-[150px] sm:max-w-xs">
                                {product.scientificName}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-1.5 text-center">
                            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                              {product.form || 'عبوة'}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5 text-center">
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700">
                              {product.totalQuantity}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-left">
                            <span className="font-mono font-bold text-xs text-slate-700">
                              {formatCurrency(product.costPrice || 0)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-left">
                            <span className="font-mono font-black text-xs text-teal-700">
                              {formatCurrency(product.price)}
                            </span>
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addProductToPurchase(product);
                              }}
                              className="w-5 h-5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold inline-flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                              title="إضافة لفاتورة الشراء"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. Purchase Cart Box (محتويات فاتورة الشراء) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg border-2 border-teal-200/80 shadow-2xs overflow-hidden">
          <div className="px-2.5 py-1.5 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-teal-600 text-white">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-800">محتويات وأصناف فاتورة الشراء</h2>
              <span className="bg-teal-700 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {purchaseItems.length}
              </span>
            </div>

            {purchaseItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل تريد إفراغ فاتورة الشراء الحالية؟')) {
                    clearPurchaseCart();
                    showToast('تم إفراغ فاتورة الشراء');
                  }
                }}
                className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded transition-colors active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                مسح
              </button>
            )}
          </div>

          <div className="p-1.5 divide-y divide-slate-100 max-h-[calc(100vh-270px)] overflow-y-auto">
            {purchaseItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Truck className="w-7 h-7 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-medium">فاتورة الشراء فارغة حالياً</p>
                <p className="text-[10px] text-slate-400">ابحث باسم الصنف أو امسح الباركود لإدراجه في الفاتورة</p>
              </div>
            ) : (
              purchaseItems.map((item, index) => (
                <div key={`${item.productId}-${index}`} className="py-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        باركود: {item.barcode}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">الإجمالي:</span>
                        <span className="font-mono font-black text-xs sm:text-sm text-teal-800">
                          {formatCurrency(item.total)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-6 h-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                        title="حذف الصنف من الفاتورة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Item inputs row: Batch, Expiry, Qty, Cost, Selling */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-50/80 p-1.5 rounded-lg border border-slate-200 text-xs">
                    {/* Batch Number */}
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-0.5">رقم التشغيلة (Batch):</span>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={(e) => updateBatchNumber(index, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                        placeholder="BAT-2026-01"
                      />
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-0.5">تاريخ الانتهاء:</span>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => updateExpiryDate(index, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[11px] font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Quantity Stepper */}
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-0.5">الكمية الواردة:</span>
                      <div className="flex items-center bg-white border border-slate-200 rounded p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="w-4 h-4 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value, 10) || 1)}
                          className="w-full text-center font-mono font-bold text-xs text-slate-900 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="w-4 h-4 rounded bg-teal-600 text-white font-bold flex items-center justify-center hover:bg-teal-700 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Cost Price */}
                    <div>
                      <span className="text-[9px] text-teal-800 font-bold block mb-0.5">سعر الشراء (التكلفة):</span>
                      <input
                        type="number"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => updateCostPrice(index, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-teal-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-teal-900 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Selling Price */}
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-0.5">سعر البيع المقترح:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.sellingPrice}
                        onChange={(e) => updateSellingPrice(index, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. Sticky High-Contrast Checkout Bar (شريط التثبيت السفلي فوق شريط التنقل) */}
      {/* ======================================================== */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-teal-200 shadow-[0_-8px_25px_rgba(15,23,42,0.1)] p-2 sm:p-3 space-y-2 max-w-7xl mx-auto w-full rounded-t-2xl">
        {(() => {
          const grandTotal = getGrandTotal();
          const currentPaid = paidInput !== '' ? (parseFloat(paidInput) || 0) : (paymentType === 'cash' ? grandTotal : 0);
          const remaining = currentPaid - grandTotal;

          return (
            <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50/90 border border-slate-200/80 rounded-xl p-2">
              {/* Grand Total */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-500">إجمالي المشتريات:</span>
                <span className="font-mono font-black text-sm sm:text-base text-slate-950 bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Paid Amount Field (المدفوع للمورد) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-teal-800">المدفوع للمورد:</span>
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-0.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 shadow-2xs">
                  <input
                    type="number"
                    min="0"
                    placeholder={paymentType === 'cash' ? grandTotal.toString() : '0'}
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="w-20 sm:w-24 bg-transparent text-xs sm:text-sm font-mono font-black text-teal-950 text-center focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold mr-1">{settings.currencySymbol}</span>
                </div>
                {grandTotal > 0 && paidInput !== grandTotal.toString() && (
                  <button
                    type="button"
                    onClick={() => setPaidInput(grandTotal.toString())}
                    className="text-[10px] bg-teal-100/70 hover:bg-teal-200 text-teal-800 font-bold px-1.5 py-1 rounded-md transition-colors"
                    title="دفع كامل قيمة الفاتورة نقداً"
                  >
                    بالضبط
                  </button>
                )}
              </div>

              {/* Remaining Amount (المتبقي للمورد) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-500">المتبقي:</span>
                <span
                  className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border shadow-2xs ${
                    remaining < 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : remaining > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {formatCurrency(Math.abs(remaining))}
                  {remaining < 0 && <span className="text-[10px] font-sans font-bold mr-1">(آجل على الصيدلية)</span>}
                  {remaining > 0 && <span className="text-[10px] font-sans font-bold mr-1">(مسترد للصيدلية)</span>}
                  {remaining === 0 && <span className="text-[10px] font-sans font-bold mr-1">(خالص)</span>}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPurchasesSubTab('invoices')}
            className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
            <span>سجل فواتير المشتريات</span>
          </button>

          <button
            type="button"
            onClick={handleSavePurchaseInvoice}
            disabled={purchaseItems.length === 0}
            className={`flex-2 min-h-[40px] py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
              purchaseItems.length > 0
                ? 'bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white shadow-teal-700/25 font-black'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ وتوريد الفاتورة للمخزون</span>
          </button>
        </div>
      </div>

      {/* Manual Item Add Modal */}
      <ManualItemModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
};
