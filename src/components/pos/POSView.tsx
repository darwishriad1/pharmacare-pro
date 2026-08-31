import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Pause,
  Play,
  User,
  Plus,
  Minus,
  FileText,
  MessageSquare,
  DollarSign,
  Clock,
  CheckCircle2,
  Package,
  ChevronDown,
  X,
  UserCheck,
  CreditCard,
  ScanLine,
  Camera,
  Zap,
  Sparkles,
  Barcode
} from 'lucide-react';
import { usePOSStore } from '../../stores/usePOSStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../database/db';
import { Product, SaleInvoice, UnitType } from '../../types';
import { getCustomerColor } from '../../utils/customerColors';
import { PaymentModal } from './PaymentModal';
import { CustomerSelectorModal } from './CustomerSelectorModal';
import { HeldInvoicesModal } from './HeldInvoicesModal';
import { ManualItemModal } from './ManualItemModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { CameraBarcodeModal } from './CameraBarcodeModal';
import { BarcodeScannerHUD } from './BarcodeScannerHUD';
import { BarcodeScannerConfigModal } from './BarcodeScannerConfigModal';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { decodeBarcodeInput, findProductByBarcode } from '../../utils/barcodeDecoder';
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

export const POSView: React.FC = () => {
  const {
    cart,
    selectedCustomer,
    overallDiscount,
    overallDiscountType,
    heldInvoices,
    lastCompletedInvoice,
    addItem,
    updateItemQuantity,
    updateItemUnit,
    removeItem,
    clearCart,
    setCustomer,
    setOverallDiscount,
    setHeldInvoicesModalOpen,
    setPaymentModalOpen,
    holdCurrentInvoice,
    checkout,
    getSubtotal,
    getTotalDiscount,
    getGrandTotal,
    playBeep,
  } = usePOSStore();

  const { settings, formatCurrency } = useSettingsStore();
  const { currentUser } = useAuthStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  // Barcode Scanner states
  const [activeScanUnit, setActiveScanUnit] = useState<UnitType>('package');
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isBarcodeConfigModalOpen, setIsBarcodeConfigModalOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<{
    name: string;
    barcode: string;
    price: number;
    unitName: string;
    timestamp: number;
  } | null>(null);

  // Patient & Payment
  const [patientName, setPatientName] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [paidInput, setPaidInput] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptToPreview, setReceiptToPreview] = useState<SaleInvoice | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync data from DB
  const refreshData = () => {
    setAllProducts(db.getProducts());
    setAllCustomers(db.getCustomers());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, []);

  // Hardware Barcode Scanner (Keyboard Wedge) Hook with full decoding, GS1 parsing & Arabic layout auto-fix
  const {
    isScanning,
    lastScannedResult,
    lastScanTime,
    scanSpeedAvg,
    simulateScan,
  } = useHardwareBarcodeScanner({
    activeUnit: activeScanUnit,
    products: allProducts,
    enabled: true,
    onProductScanned: (product, decoded, wasIncremented) => {
      const unitLabel = activeScanUnit === 'package' ? 'عبوة' : activeScanUnit === 'strip' ? 'شريط' : 'حبة';
      const price = activeScanUnit === 'strip' ? (product.stripPrice || product.price) : activeScanUnit === 'piece' ? (product.piecePrice || product.price) : product.price;
      setLastScannedItem({
        name: product.name,
        barcode: decoded.normalizedCode,
        price,
        unitName: unitLabel,
        timestamp: Date.now(),
      });
      if (wasIncremented) {
        showToast(`⚡ تم زيادة كمية: ${product.name} (+1) 🛒`);
      } else {
        showToast(`🟢 تم مسح الباركود: ${product.name} (${unitLabel}) [${decoded.format}]`);
      }
      if (document.activeElement === searchInputRef.current) {
        setSearchQuery('');
      }
    },
    onUnrecognizedBarcode: (decoded) => {
      showToast(`⚠️ باركود غير مقيد في النظام: [${decoded.normalizedCode}]`);
    },
  });

  // Hotkey [F4] or [F2] to focus search/barcode input
  useEffect(() => {
    const handleFocusHotkey = (e: KeyboardEvent) => {
      if (e.key === 'F4' || e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        showToast('تم تركيز حقل الباركود 🔍');
      }
    };
    window.addEventListener('keydown', handleFocusHotkey);
    return () => window.removeEventListener('keydown', handleFocusHotkey);
  }, []);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Update customer name sync
  useEffect(() => {
    if (selectedCustomer) {
      setPatientName(selectedCustomer.name);
    }
  }, [selectedCustomer]);

  const handleSelectCustomer = (customer: any) => {
    setCustomer(customer);
    setPatientName(customer.name);
    setIsCustomerDropdownOpen(false);
    showToast(`تم اختيار العميل: ${customer.name}`);
  };

  const handleClearCustomer = () => {
    setCustomer(null);
    setPatientName('');
    setIsCustomerDropdownOpen(false);
  };

  // Handle Search Input Submission (Supports typing name, manual barcode, or scanned input)
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Use smart barcode decoder (resolves Arabic layout, digits, GS1, GTIN)
    const decoded = decodeBarcodeInput(query, settings.barcodeScannerSettings);
    const matchedBarcode = findProductByBarcode(decoded, allProducts);

    if (matchedBarcode) {
      addItem(matchedBarcode, activeScanUnit, 1);
      const unitLabel = activeScanUnit === 'package' ? 'عبوة' : activeScanUnit === 'strip' ? 'شريط' : 'حبة';
      const price = activeScanUnit === 'strip' ? (matchedBarcode.stripPrice || matchedBarcode.price) : activeScanUnit === 'piece' ? (matchedBarcode.piecePrice || matchedBarcode.price) : matchedBarcode.price;
      setLastScannedItem({
        name: matchedBarcode.name,
        barcode: decoded.normalizedCode,
        price,
        unitName: unitLabel,
        timestamp: Date.now(),
      });
      showToast(`🟢 تم إدخال الصنف: ${matchedBarcode.name} (${unitLabel})`);
      setSearchQuery('');
      searchInputRef.current?.focus();
      return;
    }

    // Exact or partial name/scientificName/barcode match
    const filtered = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.scientificName?.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query)
    );

    if (filtered.length === 1) {
      addItem(filtered[0], activeScanUnit, 1);
      const unitLabel = activeScanUnit === 'package' ? 'عبوة' : activeScanUnit === 'strip' ? 'شريط' : 'حبة';
      const price = activeScanUnit === 'strip' ? (filtered[0].stripPrice || filtered[0].price) : activeScanUnit === 'piece' ? (filtered[0].piecePrice || filtered[0].price) : filtered[0].price;
      setLastScannedItem({
        name: filtered[0].name,
        barcode: filtered[0].barcode,
        price,
        unitName: unitLabel,
        timestamp: Date.now(),
      });
      showToast(`تمت إضافة: ${filtered[0].name}`);
      setSearchQuery('');
      searchInputRef.current?.focus();
    } else if (filtered.length === 0) {
      playBeep('error');
      showToast(`⚠️ لا يوجد دواء أو باركود مطابق لـ "${query}"`);
    }
  };

  // Callback from Camera Barcode Scanner
  const handleCameraBarcodeScan = (scannedCode: string): boolean => {
    const code = scannedCode.trim();
    if (!code) return false;

    const decoded = decodeBarcodeInput(code, settings.barcodeScannerSettings);
    const matched = findProductByBarcode(decoded, allProducts);

    if (matched) {
      addItem(matched, activeScanUnit, 1);
      const unitLabel = activeScanUnit === 'package' ? 'عبوة' : activeScanUnit === 'strip' ? 'شريط' : 'حبة';
      const price = activeScanUnit === 'strip' ? (matched.stripPrice || matched.price) : activeScanUnit === 'piece' ? (matched.piecePrice || matched.price) : matched.price;
      setLastScannedItem({
        name: matched.name,
        barcode: decoded.normalizedCode,
        price,
        unitName: unitLabel,
        timestamp: Date.now(),
      });
      showToast(`🟢 مسح ناجح: ${matched.name} (${unitLabel})`);
      return true;
    } else {
      playBeep('error');
      showToast(`⚠️ الباركود [${code}] غير مسجل`);
      return false;
    }
  };

  // Direct Save & Commit Invoice
  const handleSaveInvoice = () => {
    if (cart.length === 0) {
      showToast('الفاتورة فارغة، أضف أصنافاً أولاً');
      return;
    }

    const grandTotal = getGrandTotal();
    const isCreditMode = paymentType === 'credit';
    const currentPaid = isCreditMode
      ? (paidInput !== '' ? (parseFloat(paidInput) || 0) : 0)
      : (paidInput !== '' ? (parseFloat(paidInput) || 0) : grandTotal);

    const isActualCredit = isCreditMode || (currentPaid < grandTotal);
    let targetCustomer = selectedCustomer;
    const cleanPatientName = patientName.trim();

    if (isActualCredit) {
      if (!targetCustomer) {
        if (!cleanPatientName || cleanPatientName === 'عميل نقدي') {
          showToast('⚠️ يرجى تحديد أو كتابة اسم العميل لتقييد المبلغ الآجل في كشف حسابه');
          setIsCustomerDropdownOpen(true);
          return;
        }

        // Search in existing customers
        const existing = allCustomers.find(
          (c) => c.name.trim().toLowerCase() === cleanPatientName.toLowerCase()
        );

        if (existing) {
          targetCustomer = existing;
          setCustomer(existing);
        } else {
          // Auto-create customer so the ledger statement and debt record are immediately created!
          const newCust = db.saveCustomer({
            name: cleanPatientName,
            phone: '',
            address: '',
            currentBalance: 0,
            totalPurchases: 0,
            maxCreditLimit: 0,
            notes: 'تم إنشاؤه تلقائياً عند إجراء مبيعات آجلة',
          });
          targetCustomer = newCust;
          setCustomer(newCust);
        }
      }
    }

    const invoice = checkout(
      isActualCredit ? 'credit' : 'cash',
      currentPaid,
      undefined,
      currentPaid > 0 ? currentPaid : undefined,
      currentUser?.id || 'usr-1',
      currentUser?.name || 'الصيدلي',
      isActualCredit
        ? `بيع آجل - العميل: ${targetCustomer?.name || cleanPatientName}`
        : `المريض: ${cleanPatientName || 'عميل نقدي'}`,
      targetCustomer
    );

    if (invoice) {
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.85 },
        });
      } catch {}

      const unpaid = Math.max(0, grandTotal - currentPaid);
      if (isActualCredit && unpaid > 0) {
        showToast(`تم حفظ الفاتورة وتقييد مبلغ (${formatCurrency(unpaid)}) كدين معلق على العميل "${targetCustomer?.name || cleanPatientName}" ✅`);
      } else {
        showToast(`تم حفظ الفاتورة #${invoice.invoiceNumber} بنجاح ✅`);
      }
      setPaidInput('');
    }
  };

  // Open Preview Receipt
  const handlePreviewReceipt = () => {
    if (cart.length === 0 && !lastCompletedInvoice) {
      showToast('لا توجد أصناف لمعاينتها في الإيصال');
      return;
    }

    const grandTotal = getGrandTotal();
    const isCreditMode = paymentType === 'credit';
    const currentPaid = isCreditMode
      ? (paidInput !== '' ? (parseFloat(paidInput) || 0) : 0)
      : (paidInput !== '' ? (parseFloat(paidInput) || 0) : grandTotal);

    if (cart.length > 0) {
      const tempInvoice: SaleInvoice = {
        id: `temp-${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-معاينة`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        customerId: selectedCustomer?.id,
        customerName: patientName || selectedCustomer?.name || 'عميل نقدي',
        patientName: patientName || selectedCustomer?.name || 'عميل نقدي',
        pharmacistName: currentUser?.name || 'الصيدلي',
        items: cart,
        subtotal: getSubtotal(),
        totalDiscount: 0,
        vatTotal: 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        changeAmount: isCreditMode ? 0 : Math.max(0, currentPaid - grandTotal),
        paymentMethod: isCreditMode ? 'credit' : 'cash',
        status: 'completed',
        cashierId: currentUser?.id || 'usr-1',
        cashierName: currentUser?.name || 'الصيدلي',
        createdAt: new Date().toISOString(),
      };
      setReceiptToPreview(tempInvoice);
    } else if (lastCompletedInvoice) {
      setReceiptToPreview(lastCompletedInvoice);
    }
    setIsReceiptModalOpen(true);
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    if (cart.length === 0 && !lastCompletedInvoice) {
      showToast('الفاتورة فارغة حالياً للمشاركة');
      return;
    }

    const items = cart.length > 0 ? cart : lastCompletedInvoice?.items || [];
    const invNum = lastCompletedInvoice?.invoiceNumber || 'فاتورة جديدة';
    const total = cart.length > 0 ? getGrandTotal() : lastCompletedInvoice?.grandTotal || 0;

    const itemsText = items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product.name} (${it.unitName} × ${it.quantity}) = ${(it.total || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}`
      )
      .join('\n');

    const message = `*صيدلية الشفاء الذكية* 🏥
رقم الفاتورة: ${invNum}
التاريخ: ${new Date().toLocaleDateString('ar-YE')}
المريض: ${patientName || 'عميل نقدي'}
-------------------------
*الأصناف:*
${itemsText}
-------------------------
*الصافي النهائي: ${total.toLocaleString('ar-YE')} ${settings.currencySymbol}*
طريقة الدفع: ${paymentType === 'cash' ? 'نقداً' : 'آجل'}
-------------------------
نتمنى لكم دوام الصحة والعافية`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Filter Customers
  const filteredCustomers = allCustomers.filter((c) => {
    if (!patientName.trim()) return true;
    return (
      c.name.toLowerCase().includes(patientName.toLowerCase()) ||
      (c.phone && c.phone.includes(patientName))
    );
  });

  // Filter Catalog
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

  return (
    <div className="flex flex-col min-h-full bg-slate-50 text-slate-800 select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-3 py-1.5 rounded-lg shadow-lg border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 animate-fadeIn backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area (Compact spacing for mobile) */}
      <div className="flex-1 p-1.5 sm:p-2.5 max-w-7xl mx-auto w-full space-y-1.5">
        
        {/* ======================================================== */}
        {/* 1. Unified Row: Patient/Customer Search + Cash/Credit Buttons */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs flex items-center gap-1.5 relative">
          {/* Patient/Customer Search and Select Input with Floating Dropdown */}
          <div className="relative flex-1 min-w-0" ref={customerDropdownRef}>
            <User className="w-3.5 h-3.5 text-teal-600 absolute right-2 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="اسم المريض أو العميل..."
              value={patientName}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              onChange={(e) => {
                setPatientName(e.target.value);
                setIsCustomerDropdownOpen(true);
                const matchedCustomer = allCustomers.find((c) => c.name === e.target.value);
                if (matchedCustomer) setCustomer(matchedCustomer);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pr-7 pl-6 py-1 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {patientName && (
              <button
                type="button"
                onClick={handleClearCustomer}
                className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px]"
                title="مسح"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Interactive Dropdown Results */}
            {isCustomerDropdownOpen && (
              <div className="absolute top-full right-0 left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-teal-200 divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fadeIn">
                <div className="px-2.5 py-1 bg-teal-50/90 flex items-center justify-between text-[10px] font-bold text-teal-900 sticky top-0 z-10">
                  <span>العملاء المسجلون ({filteredCustomers.length})</span>
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      إلغاء التحديد ✕
                    </button>
                  )}
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-center space-y-1">
                    <p className="text-xs text-slate-700 font-bold">
                      لا يوجد عميل مسجل بهذا الاسم
                    </p>
                    <p className="text-[10px] text-teal-700">
                      سيتم حفظ الفاتورة مباشرة باسم &quot;{patientName || 'عميل نقدي'}&quot;
                    </p>
                  </div>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = selectedCustomer?.id === cust.id;
                    const theme = getCustomerColor(cust);
                    return (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className={`p-2 cursor-pointer flex items-center justify-between transition-colors border-r-4 ${theme.borderAccent.split(' ')[1]} ${
                          isSelected ? theme.activeCardBg : `${theme.cardBg} ${theme.cardHover}`
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                              isSelected
                                ? 'bg-slate-900 text-white'
                                : theme.avatarBg
                            }`}
                          >
                            {isSelected ? <UserCheck className="w-3.5 h-3.5" /> : cust.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                                {cust.name}
                              </span>
                              <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${theme.badge}`}>
                                {theme.nameAr}
                              </span>
                            </div>
                            {cust.phone && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {cust.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left shrink-0 mr-1">
                          {cust.currentBalance > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              مديونية: {formatCurrency(cust.currentBalance)}
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-medium">سليم</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Cash / Credit Switcher in the exact same line */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => {
                setPaymentType('cash');
                setPaidInput('');
              }}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5 ${
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
              onClick={() => {
                setPaymentType('credit');
                setPaidInput('');
                if (!selectedCustomer && patientName.trim()) {
                  const matched = allCustomers.find(
                    (c) => c.name.trim().toLowerCase() === patientName.trim().toLowerCase()
                  );
                  if (matched) setCustomer(matched);
                }
              }}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-all active:scale-95 flex items-center gap-0.5 ${
                paymentType === 'credit'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>آجل</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. Unified Product Search, Barcode Scanner & Dropdown Category */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg p-1.5 border border-teal-100 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-1.5">
            {/* Single Unified Product Search & Barcode Scan Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
              <div className="absolute right-2.5 top-2 flex items-center gap-1 pointer-events-none text-teal-600">
                <ScanLine className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث بالاسم، أو امسح الباركود مباشرة بالماسح (F4)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md pr-8 pl-16 py-1 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute left-8 top-1.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] cursor-pointer"
                  title="مسح"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute left-1 top-1 px-1.5 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold shadow-2xs active:scale-95 cursor-pointer"
                title="إدخال أو بحث"
              >
                إدخال
              </button>
            </form>

            {/* Quick Camera Barcode Scanner Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-[11px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer"
              title="فتح قارئ الباركود عبر كاميرا الهاتف أو الحاسوب"
            >
              <Camera className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">كاميرا</span>
            </button>

            {/* Dropdown Category Filter */}
            <div className="relative shrink-0 w-24 sm:w-32">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-md pr-2 pl-5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute left-1.5 top-2 pointer-events-none" />
            </div>

            {/* Quick Actions (Add Manual / Hold / Held List) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="p-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-2xs active:scale-95 cursor-pointer"
                title="إضافة صنف يدوي"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cart.length === 0) {
                    showToast('الفاتورة فارغة حالياً لتعليقها');
                    return;
                  }
                  const success = holdCurrentInvoice();
                  if (success) showToast('تم تعليق الفاتورة مؤقتاً ⏸️');
                }}
                className="p-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 shadow-2xs active:scale-95 cursor-pointer"
                title="تعليق الفاتورة"
              >
                <Pause className="w-3.5 h-3.5 text-amber-700" />
              </button>
              {heldInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHeldInvoicesModalOpen(true)}
                  className="px-1.5 py-1 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 font-bold text-[10px] flex items-center gap-0.5 shadow-2xs active:scale-95 cursor-pointer"
                  title="الفواتير المعلقة"
                >
                  <Play className="w-2.5 h-2.5 text-purple-700 fill-current" />
                  <span>{heldInvoices.length}</span>
                </button>
              )}
            </div>
          </div>

          {/* Barcode Scanner Quick Toolbar: Unit Selector & Scanner Status & Last Scan & Settings */}
          <BarcodeScannerHUD
            activeUnit={activeScanUnit}
            onSelectUnit={(unit) => {
              setActiveScanUnit(unit);
              const label = unit === 'package' ? 'عبوة' : unit === 'strip' ? 'شريط' : 'حبة';
              showToast(`تم ضبط وحدة المسح: ${label}`);
            }}
            isScanning={isScanning}
            lastScannedResult={lastScannedResult}
            lastScanTime={lastScanTime}
            onOpenConfigModal={() => setIsBarcodeConfigModalOpen(true)}
            onOpenCameraModal={() => setIsCameraModalOpen(true)}
          />
        </div>

        {/* ======================================================== */}
        {/* 3. Drug Search Results Table (تظهر فقط عند البحث أو التصفية كجدول) */}
        {/* ======================================================== */}
        {(searchQuery.trim().length > 0 || selectedCategory !== 'الكل') && (
          <div className="bg-white rounded-lg border border-teal-200 shadow-xs overflow-hidden space-y-0 animate-fadeIn">
            <div className="px-2.5 py-1 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span className="text-xs font-bold text-teal-900">
                  نتائج البحث ({filteredProducts.length} صنف)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('الكل');
                }}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-1.5 py-0.5 rounded active:scale-95"
              >
                إغلاق ✕
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-4 text-center text-slate-400 space-y-0.5">
                <p className="text-xs font-bold text-slate-600">لم يتم العثور على صنف مطابق</p>
                <p className="text-[10px] text-slate-400">تأكد من كتابة الاسم أو أضف صنفاً جديداً</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-1 px-2">اسم الصنف</th>
                      <th className="py-1 px-1.5 text-center">الشكل</th>
                      <th className="py-1 px-1.5 text-center">المخزون</th>
                      <th className="py-1 px-2 text-left">السعر</th>
                      <th className="py-1 px-1 text-center w-8">إضافة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.slice(0, 50).map((product) => {
                      const inStock = product.totalQuantity > 0;
                      return (
                        <tr
                          key={product.id}
                          onClick={() => {
                            addItem(product);
                            showToast(`تمت إضافة: ${product.name}`);
                          }}
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
                            <span
                              className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                                inStock
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {inStock ? `${product.totalQuantity}` : 'نفد'}
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
                                addItem(product);
                                showToast(`تمت إضافة: ${product.name}`);
                              }}
                              className="w-5 h-5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold inline-flex items-center justify-center shadow-2xs active:scale-90"
                              title="إضافة للفاتورة"
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
        {/* 4. Cart Box (محتويات الفاتورة) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg border-2 border-teal-200/80 shadow-2xs overflow-hidden">
          <div className="px-2.5 py-1.5 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-teal-600 text-white">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-800">محتويات الفاتورة</h2>
              <span className="bg-rose-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {cart.length}
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل تريد إفراغ الفاتورة؟')) {
                    clearCart();
                    showToast('تم إفراغ الفاتورة');
                  }
                }}
                className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded transition-colors active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                مسح
              </button>
            )}
          </div>

          <div className="p-1.5 divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <ShoppingCart className="w-7 h-7 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-medium">الفاتورة فارغة حالياً</p>
                <p className="text-[10px] text-slate-400">ابحث باسم الدواء أو امسح الباركود لإضافته</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-1.5 flex items-center justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-800 truncate">
                      {item.product.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="inline-flex rounded bg-slate-100 p-0.5 text-[9px] font-bold">
                        <button
                          type="button"
                          onClick={() => updateItemUnit(item.id, 'package')}
                          className={`px-1 py-0.2 rounded ${
                            item.unitType === 'package' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          عبوة
                        </button>
                        {item.product.stripsPerPackage && item.product.stripsPerPackage > 1 && (
                          <button
                            type="button"
                            onClick={() => updateItemUnit(item.id, 'strip')}
                            className={`px-1 py-0.2 rounded ${
                              item.unitType === 'strip' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500'
                            }`}
                          >
                            شريط
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => updateItemUnit(item.id, 'piece')}
                          className={`px-1 py-0.2 rounded ${
                            item.unitType === 'piece' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          حبة
                        </button>
                      </div>

                      <span className="font-mono font-bold text-xs text-teal-700">
                        = {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded p-0.5">
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        className="w-5 h-5 rounded bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95 shadow-2xs"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        className="w-5 h-5 rounded bg-teal-600 text-white font-bold flex items-center justify-center hover:bg-teal-700 active:scale-95 shadow-2xs"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="w-6 h-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors active:scale-95"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
          const isCreditMode = paymentType === 'credit';
          const currentPaid = isCreditMode
            ? (paidInput !== '' ? (parseFloat(paidInput) || 0) : 0)
            : (paidInput !== '' ? (parseFloat(paidInput) || 0) : grandTotal);

          const changeOrDebt = isCreditMode
            ? grandTotal - currentPaid
            : currentPaid - grandTotal;

          return (
            <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50/90 border border-slate-200/80 rounded-xl p-2">
              {/* Grand Total */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono font-black text-sm sm:text-base text-slate-950 bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Paid Amount Field (المدفوع / الدفعة المقدمة) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-xs font-bold ${isCreditMode ? 'text-amber-800' : 'text-teal-800'}`}>
                  {isCreditMode ? 'الدفعة المقدمة:' : 'المدفوع:'}
                </span>
                <div className={`flex items-center bg-white border rounded-lg px-2 py-0.5 shadow-2xs ${
                  isCreditMode
                    ? 'border-amber-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
                    : 'border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20'
                }`}>
                  <input
                    type="number"
                    min="0"
                    placeholder={isCreditMode ? '0' : (grandTotal > 0 ? grandTotal.toString() : '0')}
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="w-20 sm:w-24 bg-transparent text-xs sm:text-sm font-mono font-black text-slate-950 text-center focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold mr-1">{settings.currencySymbol}</span>
                </div>
                {!isCreditMode && grandTotal > 0 && paidInput !== grandTotal.toString() && (
                  <button
                    type="button"
                    onClick={() => setPaidInput(grandTotal.toString())}
                    className="text-[10px] bg-teal-100/70 hover:bg-teal-200 text-teal-800 font-bold px-1.5 py-1 rounded-md transition-colors"
                    title="دفع كامل المبلغ بالضبط"
                  >
                    بالضبط
                  </button>
                )}
                {isCreditMode && paidInput !== '' && paidInput !== '0' && (
                  <button
                    type="button"
                    onClick={() => setPaidInput('0')}
                    className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-1.5 py-1 rounded-md transition-colors"
                    title="آجل بالكامل بدون دفعة مقدمة"
                  >
                    تصفير
                  </button>
                )}
              </div>

              {/* Remaining Amount (المتبقي كدين أو فكة) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-500">
                  {isCreditMode ? 'المسجل كدين آجل:' : 'المتبقي:'}
                </span>
                {isCreditMode ? (
                  <span className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border shadow-2xs ${
                    changeOrDebt > 0
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {formatCurrency(Math.max(0, changeOrDebt))}
                    {changeOrDebt > 0 ? (
                      <span className="text-[10px] font-sans font-bold mr-1">
                        (دين معلق على العميل)
                      </span>
                    ) : (
                      <span className="text-[10px] font-sans font-bold mr-1">(مسدد بالكامل)</span>
                    )}
                  </span>
                ) : (
                  <span
                    className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border shadow-2xs ${
                      changeOrDebt > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : changeOrDebt < 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {formatCurrency(Math.abs(changeOrDebt))}
                    {changeOrDebt > 0 && <span className="text-[10px] font-sans font-bold mr-1">(فكة للعميل)</span>}
                    {changeOrDebt < 0 && <span className="text-[10px] font-sans font-bold mr-1">(آجل/ذمة)</span>}
                    {changeOrDebt === 0 && <span className="text-[10px] font-sans font-bold mr-1">(خالص)</span>}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Preview / Confirm Receipt */}
          <button
            type="button"
            onClick={handlePreviewReceipt}
            className="flex-1 min-h-[40px] py-2 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            title="معاينة إيصال الفاتورة قبل الحفظ"
          >
            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
            <span>معاينة وتأكيد</span>
          </button>

          {/* Detailed Payment Options Modal */}
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            disabled={cart.length === 0}
            className={`min-h-[40px] py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all ${
              cart.length > 0
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title="طرق دفع متعددة (شبكة، آجل، مختلط، طباعة)"
          >
            <CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">دفع مفصل</span>
          </button>

          {/* Quick Direct Save */}
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={cart.length === 0}
            className={`flex-2 min-h-[40px] py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
              cart.length > 0
                ? paymentType === 'credit'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-600/25 font-black'
                  : 'bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white shadow-teal-700/25 font-black'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{paymentType === 'credit' ? 'حفظ كفاتورة آجلة (دين)' : 'حفظ الفاتورة'}</span>
          </button>

          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-10 min-h-[40px] py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center shadow-md shadow-emerald-700/20 active:scale-95 transition-all shrink-0"
            title="مشاركة الفاتورة عبر واتساب"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <BarcodeScannerConfigModal
        isOpen={isBarcodeConfigModalOpen}
        onClose={() => setIsBarcodeConfigModalOpen(false)}
      />

      <CameraBarcodeModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScan={handleCameraBarcodeScan}
        allProducts={allProducts}
        activeUnit={activeScanUnit}
        onSelectUnit={(unit) => setActiveScanUnit(unit)}
      />

      <ManualItemModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        invoice={receiptToPreview}
      />

      <PaymentModal />
      <CustomerSelectorModal />
      <HeldInvoicesModal />
    </div>
  );
};
