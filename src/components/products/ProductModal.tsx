import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Sparkles,
  Pill,
  DollarSign,
  Layers,
  MapPin,
  ShieldAlert,
  Search,
  Camera,
  Loader2,
  Globe,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Product, Batch } from '../../types';
import { db } from '../../database/db';
import { onlineDrugService, EnrichedOnlineDrugItem } from '../../services/onlineDrugService';
import { CameraBarcodeModal } from '../pos/CameraBarcodeModal';

interface ProductModalProps {
  isOpen: boolean;
  product?: Product | null;
  initialBarcode?: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const CATEGORIES = [
  'مسكنات وخافضات حرارة',
  'مضادات حيوية',
  'الجهاز الهضمي والمعدة',
  'القلب والضغط والدهون',
  'السكري والغدد الصماء',
  'الجهاز التنفسي والحساسية',
  'فيتامينات ومكملات غذائية',
  'جلدية وعيون',
  'أدوية أطفال',
  'مستلزمات وإسعافات',
];

const FORMS = [
  'أقراص',
  'كبسولات',
  'شراب',
  'حقن',
  'مرهم',
  'كريم',
  'قطرة',
  'بخاخ',
  'فوار',
  'تحاميل',
  'أكياس بودرة',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  product,
  initialBarcode,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    scientificName: '',
    barcode: '',
    category: 'مسكنات وخافضات حرارة',
    form: 'أقراص',
    strength: '',
    manufacturer: '',
    country: '',
    costPrice: 1000,
    price: 1400,
    stripPrice: 700,
    piecePrice: 70,
    stripsPerPackage: 2,
    piecesPerStrip: 10,
    minStock: 5,
    maxStock: 50,
    locationRack: '',
    requiresPrescription: false,
    vatRate: 0,
    active: true,
  });

  // Initial batch details for new products
  const [initialQty, setInitialQty] = useState('10');
  const [initialExpiry, setInitialExpiry] = useState('2027-12-31');
  const [initialBatchNum, setInitialBatchNum] = useState(`BAT-${new Date().getFullYear()}-01`);

  // Online / Barcode Search State
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiLookupResult, setAiLookupResult] = useState<{
    status: 'idle' | 'found' | 'not_found' | 'error';
    source?: string;
    message?: string;
  }>({ status: 'idle' });
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
      setAiLookupResult({ status: 'idle' });
    } else {
      const autoBarcode = initialBarcode || `${Math.floor(6290000000000 + Math.random() * 999999999)}`;
      setFormData({
        name: '',
        scientificName: '',
        barcode: autoBarcode,
        category: 'مسكنات وخافضات حرارة',
        form: 'أقراص',
        strength: '',
        manufacturer: '',
        country: '',
        costPrice: 1000,
        price: 1400,
        stripPrice: 700,
        piecePrice: 70,
        stripsPerPackage: 2,
        piecesPerStrip: 10,
        minStock: 5,
        maxStock: 50,
        locationRack: 'A-101',
        requiresPrescription: false,
        vatRate: 0,
        active: true,
      });
      setInitialQty('10');
      setInitialBatchNum(`BAT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 89)}`);
      setAiLookupResult({ status: 'idle' });

      // If an initial barcode was passed, trigger search
      if (initialBarcode && initialBarcode.trim()) {
        handleSearchOnlineDrug(initialBarcode.trim());
      }
    }
  }, [product, isOpen, initialBarcode]);

  if (!isOpen) return null;

  const generateBarcode = () => {
    const randomEAN = `629${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    setFormData((prev) => ({ ...prev, barcode: randomEAN }));
    setAiLookupResult({ status: 'idle' });
  };

  const handlePriceChange = (
    cost: number,
    sell: number,
    strips = formData.stripsPerPackage || 1,
    pieces = formData.piecesPerStrip || 10
  ) => {
    const sPrice = strips > 1 ? Math.round(sell / strips) : undefined;
    const pPrice = strips > 0 && pieces > 0 ? Math.round(sell / (strips * pieces)) : undefined;

    setFormData((prev) => ({
      ...prev,
      costPrice: cost,
      price: sell,
      stripPrice: sPrice,
      piecePrice: pPrice,
    }));
  };

  // Perform Online/AI drug lookup by Barcode or Drug Name
  const handleSearchOnlineDrug = async (queryTerm?: string) => {
    const term = (queryTerm || formData.barcode || formData.name || '').trim();
    if (!term) return;

    setIsAiSearching(true);
    setAiLookupResult({ status: 'idle' });

    try {
      // 1. Search hybrid combined database (AI Gemini + Catalog Directory + OpenFDA + RxNorm)
      const res = await onlineDrugService.searchCombined({
        query: term,
      });

      if (res.results && res.results.length > 0) {
        // Find best match (exact barcode match or first item)
        const matched =
          res.results.find((i) => i.barcode === term) ||
          res.results[0];

        // Map Category to one in our list if close
        let matchedCategory = formData.category || 'مسكنات وخافضات حرارة';
        for (const cat of CATEGORIES) {
          if (matched.category.includes(cat) || cat.includes(matched.category)) {
            matchedCategory = cat;
            break;
          }
        }

        // Map Form to one in our list
        let matchedForm = formData.form || 'أقراص';
        for (const f of FORMS) {
          if (matched.form.includes(f) || f.includes(matched.form)) {
            matchedForm = f;
            break;
          }
        }

        const cost = matched.standardCost > 0 ? matched.standardCost : formData.costPrice || 1000;
        const sellPrice = matched.standardPrice > 0 ? matched.standardPrice : Math.round(cost * 1.35);

        const strips = matched.stripsPerPackage || 2;
        const pieces = matched.piecesPerStrip || 10;
        const stripPrice = strips > 1 ? Math.round(sellPrice / strips) : undefined;
        const piecePrice = strips > 0 && pieces > 0 ? Math.round(sellPrice / (strips * pieces)) : undefined;

        setFormData((prev) => ({
          ...prev,
          barcode: matched.barcode || prev.barcode || term,
          name: matched.name || prev.name,
          scientificName: matched.scientificName || prev.scientificName,
          category: matchedCategory,
          form: matchedForm,
          strength: matched.strength || prev.strength,
          manufacturer: matched.manufacturer || prev.manufacturer,
          country: matched.country || prev.country,
          locationRack: matched.locationRack || prev.locationRack || 'A-101',
          costPrice: cost,
          price: sellPrice,
          stripPrice,
          piecePrice,
          stripsPerPackage: strips,
          piecesPerStrip: pieces,
          requiresPrescription: matched.requiresPrescription ?? prev.requiresPrescription ?? false,
        }));

        setAiLookupResult({
          status: 'found',
          source: matched.sourceLabel || 'سجل الأدوية المعتمد عبر الإنترنت',
          message: `تم جلب بيانات الصنف بنجاح: "${matched.name}" - الشركة: "${matched.manufacturer}"`,
        });
      } else {
        setAiLookupResult({
          status: 'not_found',
          message: 'لم يتم العثور على صنف مطابق بالباركود في السجلات المتاحة، يمكنك إدخال البيانات يدوياً.',
        });
      }
    } catch (err: any) {
      setAiLookupResult({
        status: 'error',
        message: err.message || 'تعذر الاتصال بخدمة البحث عبر الإنترنت.',
      });
    } finally {
      setIsAiSearching(false);
    }
  };

  // When camera scans a barcode inside the modal
  const handleCameraScan = (scannedCode: string): boolean => {
    const code = scannedCode.trim();
    if (!code) return false;

    setFormData((prev) => ({ ...prev, barcode: code }));
    setIsCameraOpen(false);
    handleSearchOnlineDrug(code);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.barcode) return;

    const initialBatch: Partial<Batch> | undefined =
      !product && parseInt(initialQty, 10) > 0
        ? {
            batchNumber: initialBatchNum,
            expiryDate: initialExpiry,
            quantity: parseInt(initialQty, 10),
            costPrice: formData.costPrice || 1000,
            sellingPrice: formData.price || 1400,
          }
        : undefined;

    const saved = db.saveProduct(formData as Product, initialBatch);
    onSaved(saved);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">
                  {product ? 'تعديل بيانات الدواء / المنتج' : 'إضافة دواء / صنف عبر الباركود والإنترنت'}
                </h2>
                <p className="text-xs text-slate-400">
                  قراءة الباركود، البحث التلقائي عبر الإنترنت، استخراج الاسم والشركة المصنعة والأسعار
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick AI & Barcode Scanner Banner */}
          <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-sky-950/70 p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-300 block">
                  البحث الذكي والاستيراد الفوري عبر الباركود
                </span>
                <span className="text-[11px] text-slate-400">
                  امسح بالكاميرا أو الصق الباركود ليتم جلب اسم المنتج والشركة المصنعة والبيانات كاملة
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-teal-900/30 cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>مسح بالكاميرا</span>
              </button>

              <button
                type="button"
                disabled={isAiSearching || (!formData.barcode && !formData.name)}
                onClick={() => handleSearchOnlineDrug()}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-sky-900/30 cursor-pointer active:scale-95"
              >
                {isAiSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري البحث...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>بحث بالإنترنت بالباركود / الاسم</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Search Notification Banner */}
          {aiLookupResult.status !== 'idle' && (
            <div
              className={`p-3 text-xs border-b flex items-start gap-2.5 ${
                aiLookupResult.status === 'found'
                  ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                  : aiLookupResult.status === 'not_found'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}
            >
              {aiLookupResult.status === 'found' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {aiLookupResult.status === 'not_found' && (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              {aiLookupResult.status === 'error' && (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}

              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">
                  <span>{aiLookupResult.message}</span>
                  {aiLookupResult.source && (
                    <span className="text-[10px] font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300">
                      المصدر: {aiLookupResult.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Section 1: Basic Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                المعلومات الأساسية والدوائية والشركة
              </h3>

              {/* Barcode Row with direct search button */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>الباركود الدولي للصنف (Barcode) *</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>مسح عبر الكاميرا</span>
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      توليد عشوائي
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="امسح الباركود أو الصقه هنا..."
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={isAiSearching || !formData.barcode}
                    onClick={() => handleSearchOnlineDrug(formData.barcode)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-sky-500 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="البحث في الإنترنت عن بيانات هذا الباركود"
                  >
                    {isAiSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    ) : (
                      <Search className="w-4 h-4 text-sky-400" />
                    )}
                    <span>جلب البيانات</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم الدواء التجاري *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بنادول إكسترا 500 ملجم"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    الاسم العلمي (التركيبة)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: Paracetamol + Caffeine"
                    value={formData.scientificName || ''}
                    onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Manufacturer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    الشركة المصنعة
                  </label>
                  <input
                    type="text"
                    placeholder="GSK, Novartis, Julphar, Sanofi..."
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">بلد المنشأ</label>
                  <input
                    type="text"
                    placeholder="بريطانيا، فرنسا، السعودية، مصر..."
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Strength */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">التركيز</label>
                  <input
                    type="text"
                    placeholder="500mg, 10mg/5ml..."
                    value={formData.strength || ''}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">المجموعة العلاجية</label>
                  <select
                    value={formData.category || 'مسكنات وخافضات حرارة'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الشكل الصيدلاني</label>
                  <select
                    value={formData.form || 'أقراص'}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Rack */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    موقع الرف / الدرج
                  </label>
                  <input
                    type="text"
                    placeholder="A-101, رف 2..."
                    value={formData.locationRack || ''}
                    onChange={(e) => setFormData({ ...formData, locationRack: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Packaging Units */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                التسعير وتجزئة الوحدات (عبوة / شريط / حبة)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">سعر الشراء (عبوة) *</label>
                  <input
                    type="number"
                    required
                    value={formData.costPrice || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handlePriceChange(val, formData.price || Math.round(val * 1.3));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">سعر البيع (عبوة) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handlePriceChange(formData.costPrice || 0, val);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">أشرطة بالعبوة</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.stripsPerPackage || 1}
                    onChange={(e) => {
                      const strips = parseInt(e.target.value, 10) || 1;
                      setFormData({ ...formData, stripsPerPackage: strips });
                      handlePriceChange(
                        formData.costPrice || 0,
                        formData.price || 0,
                        strips,
                        formData.piecesPerStrip || 10
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">حبات بالشريط</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.piecesPerStrip || 10}
                    onChange={(e) => {
                      const pieces = parseInt(e.target.value, 10) || 10;
                      setFormData({ ...formData, piecesPerStrip: pieces });
                      handlePriceChange(
                        formData.costPrice || 0,
                        formData.price || 0,
                        formData.stripsPerPackage || 1,
                        pieces
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">سعر بيع الشريط</label>
                  <input
                    type="number"
                    value={formData.stripPrice || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, stripPrice: parseFloat(e.target.value) || undefined })
                    }
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">سعر بيع الحبة</label>
                  <input
                    type="number"
                    value={formData.piecePrice || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, piecePrice: parseFloat(e.target.value) || undefined })
                    }
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">الحد الأدنى للتنبيه</label>
                  <input
                    type="number"
                    value={formData.minStock || 5}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 5 })
                    }
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.requiresPrescription || false}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresPrescription: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-0 w-4 h-4"
                    />
                    <span>يتطلب وصفة طبية (℞)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Initial Stock Batch for New Product */}
            {!product && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  رصيد المخزون الافتتاحي وتاريخ الصلاحية
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-950/20 p-3 rounded-xl border border-amber-800/40">
                  <div>
                    <label className="block text-xs text-amber-200 mb-1">الكمية الافتتاحية (عبوات)</label>
                    <input
                      type="number"
                      min="0"
                      value={initialQty}
                      onChange={(e) => setInitialQty(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-amber-200 mb-1">رقم التشغيلة (Batch Number)</label>
                    <input
                      type="text"
                      value={initialBatchNum}
                      onChange={(e) => setInitialBatchNum(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-amber-200 mb-1">تاريخ انتهاء الصلاحية</label>
                    <input
                      type="date"
                      value={initialExpiry}
                      onChange={(e) => setInitialExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                {formData.name && formData.manufacturer ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    ✓ الصنف: <b>{formData.name}</b> ({formData.manufacturer})
                  </span>
                ) : (
                  <span>يرجى استكمال الحقول الإلزامية لحفظ الدواء</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-700/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  حفظ وإضافة للمخزون
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Barcode Scanner Camera Modal for adding/filling product */}
      {isCameraOpen && (
        <CameraBarcodeModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onScan={handleCameraScan}
          allProducts={db.getProducts()}
        />
      )}
    </>
  );
};
