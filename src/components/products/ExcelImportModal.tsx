import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clipboard,
  Download,
  Layers,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  DollarSign,
  Package,
  Boxes,
  HelpCircle,
  Plus,
  Trash2,
  Tag,
  MapPin,
  Truck,
  Eye,
  Edit3,
  Globe,
  Building2,
  CheckSquare,
  Square,
  HeartPulse,
  ShieldAlert,
  Activity,
  Flame,
  Wind,
  Crosshair,
  Pill,
  ExternalLink,
  SlidersHorizontal,
  Bookmark,
  Bot,
  Loader2,
  Info,
  Copy,
  Stethoscope,
  Wand2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product } from '../../types';
import {
  smartImportService,
  ImportMode,
  ExistingStrategy,
  ColumnMapping,
  ParsedMedicineRow,
  SmartImportResult
} from '../../services/smartImportService';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';
import { RAW_100_MEDICINES_TSV, RAW_100_MEDICINES_CATALOG_TSV } from '../../database/essential100Medicines';
import {
  onlineDrugService,
  CURATED_DRUG_PACKS,
  CuratedDrugPack,
  EnrichedOnlineDrugItem,
  ALL_COMBINED_ONLINE_DRUGS
} from '../../services/onlineDrugService';
import {
  ONLINE_DRUG_CATEGORIES,
  ONLINE_DRUG_MANUFACTURERS,
  ONLINE_DRUG_DIRECTORY,
  OnlineDrugItem
} from '../../database/onlineDrugDirectory';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  initialTab?: 'upload' | 'paste' | 'online';
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  initialTab = 'upload',
}) => {
  const { formatCurrency, showToast } = useSettingsStore();

  // Wizard Steps: 1: Input | 2: Mapping & Config | 3: Review & Edit | 4: Summary Result
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputTab, setInputTab] = useState<'upload' | 'paste' | 'online'>(initialTab);

  // Online Drug Directory & Smart Search state
  const [onlineSearch, setOnlineSearch] = useState<string>('');
  const [onlineCategory, setOnlineCategory] = useState<string>('الكل');
  const [onlineManufacturer, setOnlineManufacturer] = useState<string>('الكل');
  const [onlineForm, setOnlineForm] = useState<string>('الكل');
  const [onlineSourceFilter, setOnlineSourceFilter] = useState<'all' | 'ai' | 'cloud' | 'fda_rxnorm'>('all');
  const [isOnlineSearching, setIsOnlineSearching] = useState<boolean>(false);
  const [onlineItemsList, setOnlineItemsList] = useState<EnrichedOnlineDrugItem[]>(() => [...ALL_COMBINED_ONLINE_DRUGS]);
  const [onlineFromAiCount, setOnlineFromAiCount] = useState<number>(0);
  const [onlineFromLiveApiCount, setOnlineFromLiveApiCount] = useState<number>(0);
  const [selectedDrugDetailsModal, setSelectedDrugDetailsModal] = useState<EnrichedOnlineDrugItem | null>(null);

  const [onlineSelectedBarcodes, setOnlineSelectedBarcodes] = useState<Set<string>>(() => {
    return new Set(ONLINE_DRUG_DIRECTORY.map(d => d.barcode));
  });
  const [onlinePricingMode, setOnlinePricingMode] = useState<'catalog_only' | 'with_pricing'>('catalog_only');
  const [activePackId, setActivePackId] = useState<string | null>('all_catalog');

  // Step 1: Input state
  const [fileName, setFileName] = useState<string>('');
  const [clipboardText, setClipboardText] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Mapping & Config
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    scientificName: '',
    barcode: '',
    category: '',
    form: '',
    strength: '',
    manufacturer: '',
    country: '',
    costPrice: '',
    price: '',
    stripPrice: '',
    piecePrice: '',
    stripsPerPackage: '',
    piecesPerStrip: '',
    minStock: '',
    locationRack: '',
    quantity: '',
    batchNumber: '',
    expiryDate: '',
    supplierName: '',
    requiresPrescription: '',
  });
  const [importMode, setImportMode] = useState<ImportMode>('full_inventory');
  const [existingStrategy, setExistingStrategy] = useState<ExistingStrategy>('update_and_add_batch');
  const [defaultProfitMargin, setDefaultProfitMargin] = useState<number>(25);
  const [defaultSupplier, setDefaultSupplier] = useState<string>('مورد عام');
  const [defaultRack, setDefaultRack] = useState<string>('A-101');
  const [strictFilePricing, setStrictFilePricing] = useState<boolean>(true);
  const [autoCalculateMarginIfPriceMissing, setAutoCalculateMarginIfPriceMissing] = useState<boolean>(false);

  // Step 3: Review Grid & In-line editing
  const [parsedItems, setParsedItems] = useState<ParsedMedicineRow[]>([]);
  const [reviewSearch, setReviewSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid_new' | 'valid_update' | 'warning'>('all');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Step 4: Result summary
  const [importResult, setImportResult] = useState<SmartImportResult | null>(null);

  // Debounced multi-source hybrid search (Local Cloud + OpenFDA + RxNorm + Gemini AI)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsOnlineSearching(true);
      try {
        const { results, fromLiveApiCount, fromAiCount } = await onlineDrugService.searchCombined({
          query: onlineSearch,
          category: onlineCategory,
          manufacturer: onlineManufacturer,
          form: onlineForm,
          sourceFilter: onlineSourceFilter,
        });

        if (isMounted) {
          setOnlineItemsList(results);
          setOnlineFromAiCount(fromAiCount);
          setOnlineFromLiveApiCount(fromLiveApiCount);
          setIsOnlineSearching(false);
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to local synchronous filter
          const fallback = onlineDrugService.search({
            query: onlineSearch,
            category: onlineCategory,
            manufacturer: onlineManufacturer,
            form: onlineForm,
          });
          setOnlineItemsList(fallback);
          setIsOnlineSearching(false);
        }
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [onlineSearch, onlineCategory, onlineManufacturer, onlineForm, onlineSourceFilter]);

  // Master map of all known drugs (both catalog and dynamic search results)
  const masterOnlineDrugsMap = useMemo(() => {
    const map = new Map<string, EnrichedOnlineDrugItem>();
    ALL_COMBINED_ONLINE_DRUGS.forEach(d => map.set(d.barcode, d));
    onlineItemsList.forEach(d => map.set(d.barcode, d));
    return map;
  }, [onlineItemsList]);

  const handleToggleOnlineBarcode = (barcode: string) => {
    setOnlineSelectedBarcodes((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) {
        next.delete(barcode);
      } else {
        next.add(barcode);
      }
      return next;
    });
  };

  const handleSelectAllFilteredOnline = () => {
    setOnlineSelectedBarcodes((prev) => {
      const next = new Set(prev);
      onlineItemsList.forEach((d) => next.add(d.barcode));
      return next;
    });
  };

  const handleDeselectAllFilteredOnline = () => {
    setOnlineSelectedBarcodes((prev) => {
      const next = new Set(prev);
      onlineItemsList.forEach((d) => next.delete(d.barcode));
      return next;
    });
  };

  const handleApplyCuratedPack = (pack: CuratedDrugPack) => {
    setActivePackId(pack.id);
    const matchingItems = ALL_COMBINED_ONLINE_DRUGS.filter(pack.filterFn);
    const newSelected = new Set<string>();
    matchingItems.forEach((d) => newSelected.add(d.barcode));
    setOnlineSelectedBarcodes(newSelected);
    if (pack.id === 'all_catalog') {
      setOnlineCategory('الكل');
    }
    showToast(`تم اختيار حزمة (${pack.title}) وتحديد ${matchingItems.length} صنف دوائي ✨`, 'info');
  };

  const handleProceedWithOnlineImport = (modeOverride?: 'catalog_only' | 'with_pricing') => {
    const modeToUse = modeOverride || onlinePricingMode;
    const selectedItems: EnrichedOnlineDrugItem[] = [];
    onlineSelectedBarcodes.forEach(b => {
      const item = masterOnlineDrugsMap.get(b);
      if (item) selectedItems.push(item);
    });

    if (selectedItems.length === 0) {
      showToast('يرجى اختيار دواء واحد على الأقل من نتائج البحث السحابي', 'warning');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setFileName(`دليل الأدوية والشركات السحابي (${selectedItems.length} صنف)`);
    setImportMode(modeToUse === 'catalog_only' ? 'catalog_only' : 'full_inventory');
    setDefaultProfitMargin(modeToUse === 'catalog_only' ? 0 : 25);

    try {
      const tsvData = onlineDrugService.exportToTSV(selectedItems, modeToUse);
      const { headers, rows } = smartImportService.parseClipboardText(tsvData);
      setRawHeaders(headers);
      setRawRows(rows);
      setClipboardText(tsvData);

      const autoMapping = smartImportService.detectColumnMapping(headers);
      setColumnMapping(autoMapping);

      setIsParsing(false);
      setStep(2);
      showToast(`تم تجهيز ومطابقة ${selectedItems.length} دواء من دليل الأدوية بنجاح 🌐`, 'success');
    } catch (err: any) {
      setIsParsing(false);
      setParseError(err.message || 'حدث خطأ أثناء معالجة بيانات الأدوية السحابية.');
    }
  };

  const handleDirectOneClickOnlineImport = (modeOverride?: 'catalog_only' | 'with_pricing') => {
    const modeToUse = modeOverride || onlinePricingMode;
    const selectedItems: EnrichedOnlineDrugItem[] = [];
    onlineSelectedBarcodes.forEach(b => {
      const item = masterOnlineDrugsMap.get(b);
      if (item) selectedItems.push(item);
    });

    if (selectedItems.length === 0) {
      showToast('يرجى اختيار دواء واحد على الأقل من نتائج البحث السحابي', 'warning');
      return;
    }

    setIsExecuting(true);
    try {
      const tsvData = onlineDrugService.exportToTSV(selectedItems, modeToUse);
      const { headers, rows } = smartImportService.parseClipboardText(tsvData);
      const mapping = smartImportService.detectColumnMapping(headers);
      const chosenMode: ImportMode = modeToUse === 'catalog_only' ? 'catalog_only' : 'full_inventory';

      const processedRows = smartImportService.processRows(
        headers,
        rows,
        mapping,
        modeToUse === 'catalog_only' ? 0 : 25,
        defaultSupplier,
        defaultRack,
        { strictFilePricing: true, autoCalculateMarginIfPriceMissing: false }
      );

      const result = smartImportService.executeImport(processedRows, chosenMode, existingStrategy);
      setImportResult(result);
      setIsExecuting(false);
      setStep(4);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onImportComplete();
      showToast(`تم استيراد ${result.totalProcessed} دواء من دليل الأدوية السحابي بنجاح 🌐🎉`, 'success');
    } catch (err: any) {
      setIsExecuting(false);
      showToast('حدث خطأ أثناء الحفظ المباشر للأدوية في قاعدة البيانات', 'error');
    }
  };

  // Reset all states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFileName('');
      setClipboardText('');
      setRawHeaders([]);
      setRawRows([]);
      setParsedItems([]);
      setParseError('');
      setImportResult(null);
    } else {
      if (initialTab) {
        setInputTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // --- Handlers for Step 1: Ingestion ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError('');
    setFileName(file.name);

    try {
      const { headers, rows } = await smartImportService.parseExcelFile(file);
      if (rows.length === 0) {
        setParseError('لم يتم العثور على أسطر بيانات صالحة في هذا الملف.');
        setIsParsing(false);
        return;
      }
      setRawHeaders(headers);
      setRawRows(rows);

      // Auto-detect columns
      const autoMapping = smartImportService.detectColumnMapping(headers);
      setColumnMapping(autoMapping);

      setIsParsing(false);
      setStep(2);
    } catch (err: any) {
      setIsParsing(false);
      setParseError(err.message || 'فشل في قراءة ملف الإكسل. يرجى التأكد من سلامة الملف.');
    }
  };

  const handleClipboardParse = () => {
    if (!clipboardText.trim()) {
      setParseError('يرجى لصق نص أو جدول من Excel أولاً.');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setFileName('بيانات منسوخة من الحافظة');

    try {
      const { headers, rows } = smartImportService.parseClipboardText(clipboardText);
      if (rows.length === 0) {
        setParseError('لم يتم العثور على بيانات صالحة.');
        setIsParsing(false);
        return;
      }
      setRawHeaders(headers);
      setRawRows(rows);

      // Auto-detect columns
      const autoMapping = smartImportService.detectColumnMapping(headers);
      setColumnMapping(autoMapping);

      setIsParsing(false);
      setStep(2);
    } catch (err: any) {
      setIsParsing(false);
      setParseError(err.message || 'حدث خطأ أثناء تحليل البيانات المنسوخة.');
    }
  };

  const handleLoadDemoData = () => {
    const demoData = `الباركود\tاسم الدواء التجاري\tالاسم العلمي\tالمجموعة الدوائية\tالشكل\tسعر الشراء\tسعر البيع\tسعر الشريط\tالكمية\tرقم التشغيلة\tتاريخ الانتهاء\tالمورد\tموقع الرف
6291100998811\tأموكسيل 500 ملجم\tAmoxicillin 500mg\tمضادات حيوية\tكبسولات\t2500\t3400\t1700\t30\tBAT-2025-01\t2027-12-31\tالشركة العالمية للأدوية\tA-102
6291100998822\tأومول شراب أطفال 100 مل\tParacetamol 120mg/5ml\tمسكنات وخافضات حرارة\tشراب\t1200\t1800\t\t20\tBAT-2025-02\t2027-08-31\tمستودع الأمل\tB-201
6291100998833\tبروفين 400 ملجم أقراص\tIbuprofen 400mg\tمسكنات ومضادات التهاب\tأقراص\t2000\t2800\t950\t45\tBAT-2025-03\t2028-05-31\tشركة سبأ الطبية\tA-105
6291100998844\tأوجمنتين 1 جم أقراص\tAmoxicillin + Clavulanate 1g\tمضادات حيوية\tأقراص\t4800\t6200\t3100\t15\tBAT-2025-04\t2027-11-30\tالشركة العالمية للأدوية\tC-302
6291100998855\tكونجستال أقراص للبرد\tParacetamol + Pseudoephedrine\tأدوية البرد والإنفلونزا\tأقراص\t1800\t2500\t1250\t50\tBAT-2025-05\t2028-01-31\tمستودع الأمل\tA-104`;

    setClipboardText(demoData);
    setInputTab('paste');
    showToast('تم تحميل بيانات صيدلانية نموذجية للتجربة السريعة ✨', 'info');
  };

  const handleLoadEssential100CatalogData = () => {
    setClipboardText(RAW_100_MEDICINES_CATALOG_TSV);
    setInputTab('paste');
    setFileName('دليل الـ 100 دواء الأساسية (كتالوج فقط - بدون أسعار أو كميات)');
    setImportMode('catalog_only');
    setDefaultProfitMargin(0);
    showToast('تم تحميل دليل الـ 100 دواء بباركوداتها ومجموعاتها (بدون أسعار أو كميات) 📋', 'success');

    try {
      const { headers, rows } = smartImportService.parseClipboardText(RAW_100_MEDICINES_CATALOG_TSV);
      setRawHeaders(headers);
      setRawRows(rows);
      const autoMapping = smartImportService.detectColumnMapping(headers);
      setColumnMapping(autoMapping);
      setStep(2);
    } catch {
      // Fallback stays on paste tab
    }
  };

  const handleLoadEssential100Data = () => {
    setClipboardText(RAW_100_MEDICINES_TSV);
    setInputTab('paste');
    setFileName('قائمة الـ 100 دواء الأساسية مع أسعار وأرصدة نموذجية');
    setImportMode('full_inventory');
    showToast('تم تحميل قائمة الـ 100 دواء الأساسية بالكامل للتحليل والمراجعة ✨', 'success');

    try {
      const { headers, rows } = smartImportService.parseClipboardText(RAW_100_MEDICINES_TSV);
      setRawHeaders(headers);
      setRawRows(rows);
      const autoMapping = smartImportService.detectColumnMapping(headers);
      setColumnMapping(autoMapping);
      setStep(2);
    } catch {
      // Fallback stays on paste tab
    }
  };

  // --- Handlers for Step 2: Mapping & Processing ---
  const handleProceedToReview = () => {
    if (!columnMapping.name) {
      showToast('يرجى تحديد العمود الخاص بـ (اسم الدواء) لمتابعة الاستيراد', 'error');
      return;
    }

    const processed = smartImportService.processRows(
      rawHeaders,
      rawRows,
      columnMapping,
      defaultProfitMargin,
      defaultSupplier,
      defaultRack,
      {
        strictFilePricing,
        autoCalculateMarginIfPriceMissing,
      }
    );

    setParsedItems(processed);
    setStep(3);
  };

  // --- In-grid Row Updates for Step 3 ---
  const handleUpdateRowField = (id: string, field: keyof ParsedMedicineRow, value: any) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selectedForImport: checked })));
  };

  const handleBatchApplyProfitMargin = () => {
    const marginStr = prompt('أدخل نسبة هامش الربح % لتطبيقها على أسعار البيع للأصناف المحددة:', defaultProfitMargin.toString());
    if (marginStr === null) return;
    const margin = parseFloat(marginStr);
    if (isNaN(margin) || margin < 0) {
      showToast('يرجى إدخال نسبة هامش ربح صحيحة', 'error');
      return;
    }

    setParsedItems((prev) =>
      prev.map((item) => {
        if (!item.selectedForImport || item.costPrice <= 0) return item;
        const newPrice = Math.round(item.costPrice * (1 + margin / 100));
        const newStripPrice = item.stripsPerPackage > 1 ? Math.round(newPrice / item.stripsPerPackage) : item.stripPrice;
        return {
          ...item,
          price: newPrice,
          stripPrice: newStripPrice,
        };
      })
    );
    showToast(`تم تطبيق هامش الربح (${margin}%) على الأصناف المحددة بنجاح`, 'success');
  };

  const handleBatchCalculateStripPrices = () => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (!item.selectedForImport || item.price <= 0 || item.stripsPerPackage <= 1) return item;
        return {
          ...item,
          stripPrice: Math.round(item.price / item.stripsPerPackage),
        };
      })
    );
    showToast('تم احتساب أسعار الشرائط بناءً على سعر البيع وعدد الأشرطة بنجاح', 'success');
  };

  const handleGenerateMissingBarcodes = () => {
    setParsedItems((prev) =>
      prev.map((item, idx) => {
        if (!item.barcode || item.barcode.startsWith('6291') || item.isDuplicateInBatch) {
          const newCode = `6291${Date.now().toString().slice(-8)}${String(idx + 1).padStart(3, '0')}`;
          return { ...item, barcode: newCode, isDuplicateInBatch: false };
        }
        return item;
      })
    );
    showToast('تم توليد باركودات تسلسلية فريدة لكافة الأصناف بنجاح 🏷️', 'success');
  };

  const handleBatchSetRack = () => {
    const rack = prompt('أدخل موقع الرف الموحد لتطبيقه على جميع الأصناف المختارة:', defaultRack);
    if (!rack) return;
    setParsedItems((prev) =>
      prev.map((item) => (item.selectedForImport ? { ...item, locationRack: rack } : item))
    );
    showToast(`تم تطبيق موقع الرف (${rack}) على الأصناف المحددة`, 'success');
  };

  const handleBatchSetSupplier = () => {
    const sup = prompt('أدخل اسم المورد الموحد لتطبيقه على جميع الأصناف المختارة:', defaultSupplier);
    if (!sup) return;
    setParsedItems((prev) =>
      prev.map((item) => (item.selectedForImport ? { ...item, supplierName: sup } : item))
    );
    showToast(`تم تطبيق المورد (${sup}) على الأصناف المحددة`, 'success');
  };

  const handleDeleteRow = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // --- Step 3 -> Step 4: Execution ---
  const handleExecuteImport = () => {
    const selectedCount = parsedItems.filter((i) => i.selectedForImport && i.name).length;
    if (selectedCount === 0) {
      showToast('يرجى اختيار صنف واحد على الأقل للاستيراد', 'warning');
      return;
    }

    setIsExecuting(true);

    setTimeout(() => {
      try {
        const result = smartImportService.executeImport(parsedItems, importMode, existingStrategy);
        setImportResult(result);
        setIsExecuting(false);
        setStep(4);

        // Confetti celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        onImportComplete();
        showToast(`تم استيراد ${result.totalProcessed} دواء بنجاح إلى المخزون 🎉`, 'success');
      } catch (err: any) {
        setIsExecuting(false);
        showToast('حدث خطأ أثناء حفظ الأدوية في قاعدة البيانات', 'error');
      }
    }, 400);
  };

  // Filtered rows in review grid
  const filteredReviewItems = parsedItems.filter((item) => {
    const matchesSearch =
      !reviewSearch ||
      item.name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      item.scientificName.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      item.barcode.includes(reviewSearch) ||
      item.supplierName.toLowerCase().includes(reviewSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'valid_new'
        ? item.status === 'valid_new'
        : statusFilter === 'valid_update'
        ? item.status === 'valid_update'
        : item.status === 'warning' || item.status === 'error';

    return matchesSearch && matchesStatus;
  });

  // Calculate live statistics
  const selectedRows = parsedItems.filter((i) => i.selectedForImport);
  const totalSelectedCount = selectedRows.length;
  const newItemsCount = parsedItems.filter((i) => i.status === 'valid_new').length;
  const updateItemsCount = parsedItems.filter((i) => i.status === 'valid_update').length;
  const warningItemsCount = parsedItems.filter((i) => i.status === 'warning' || i.status === 'error').length;
  const totalSelectedQuantity = selectedRows.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalSelectedCostValuation = selectedRows.reduce((sum, i) => sum + (i.quantity || 0) * (i.costPrice || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">الاستيراد الذكي للأدوية والمخزون</h2>
                <span className="bg-teal-500/20 text-teal-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-teal-500/30">
                  Smart AI Mapper & Normalizer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                استيراد كتالوج الأدوية والأرصدة الافتتاحية مع الكشف الآلي للأعمدة والتواريخ والباركود
              </p>
            </div>
          </div>

          {/* Stepper badges */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <div className={`flex items-center gap-1 font-bold ${step === 1 ? 'text-teal-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                1
              </span>
              <span>المصدر</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            <div className={`flex items-center gap-1 font-bold ${step === 2 ? 'text-teal-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                2
              </span>
              <span>المطابقة الذكية</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            <div className={`flex items-center gap-1 font-bold ${step === 3 ? 'text-teal-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                3
              </span>
              <span>المعاينة والتدقيق</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            <div className={`flex items-center gap-1 font-bold ${step === 4 ? 'text-teal-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 4 ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                4
              </span>
              <span>النتيجة</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* ================= STEP 1: INPUT SOURCE ================= */}
          {step === 1 && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Template download & Quick demo banners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">نموذج المخزون مع الكميات والتشغيلات</div>
                      <div className="text-[10px] text-slate-400">ملف جاهز مع تاريخ الصلاحية والأسعار والموردين</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => smartImportService.downloadSmartTemplate('inventory')}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-teal-700 text-teal-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                    title="تحميل نموذج المخزون الكامل"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل</span>
                  </button>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">نموذج كتالوج الأدوية فقط</div>
                      <div className="text-[10px] text-slate-400">بطاقات الأصناف والباركود والمواصفات</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => smartImportService.downloadSmartTemplate('catalog')}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-indigo-700 text-indigo-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                    title="تحميل نموذج كتالوج الأدوية"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل</span>
                  </button>
                </div>
              </div>

              {/* Source Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInputTab('online')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    inputTab === 'online'
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30 scale-[1.02]'
                      : 'bg-sky-950/40 text-sky-300 hover:text-white border border-sky-800/40 hover:bg-sky-900/50'
                  }`}
                >
                  <Globe className="w-4 h-4 text-sky-300" />
                  <span>🌐 استيراد أدوية من الإنترنت (دليل الأدوية والشركات)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    inputTab === 'upload'
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                      : 'bg-slate-800/70 text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع ملف Excel أو CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    inputTab === 'paste'
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                      : 'bg-slate-800/70 text-slate-400 hover:text-white'
                  }`}
                >
                  <Clipboard className="w-4 h-4" />
                  <span>نسخ ولصق مباشر</span>
                </button>

                <div className="mr-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputTab('online');
                      handleApplyCuratedPack(CURATED_DRUG_PACKS[0]);
                    }}
                    className="text-xs text-sky-300 hover:text-sky-200 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 transition-all shadow-xs"
                    title="تصفح كافة الأدوية المعتمدة والشركات عبر الإنترنت"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>دليل الشركات السحابي ({ONLINE_DRUG_DIRECTORY.length} صنف) 🌐</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadEssential100CatalogData}
                    className="text-xs text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-xs"
                    title="تسجيل كافة الأدوية المئة بباركوداتها ومجموعاتها والشركات بدون أسعار أو كميات"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>الـ 100 دواء (كتالوج) 📋</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemoData}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20"
                  >
                    <span>تجربة سريعة</span>
                  </button>
                </div>
              </div>

              {/* Tab Content: Online Smart Drug Directory */}
              {inputTab === 'online' && (
                <div className="space-y-4">
                  {/* Smart Search Header & Source Switcher */}
                  <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-800/40 p-4 rounded-2xl space-y-3 shadow-lg shadow-sky-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          <Bot className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">
                              البحث الذكي في أدوية الإنترنت (قواعد البيانات الدوائية والذكاء الاصطناعي)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Smart Live Hybrid
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            ابحث بأي اسم تجاري أو علمي أو مادة فعالة أو مرض أو باركود - يبحث فوراً في الدليل السحابي، OpenFDA، RxNorm، والذكاء الاصطناعي
                          </p>
                        </div>
                      </div>

                      {/* Source filter tabs */}
                      <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setOnlineSourceFilter('all')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                            onlineSourceFilter === 'all'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🌐 الكل (شامل)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineSourceFilter('ai')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                            onlineSourceFilter === 'ai'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>ذكاء اصطناعي (AI)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineSourceFilter('cloud')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                            onlineSourceFilter === 'cloud'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ☁️ الدليل السحابي ({ALL_COMBINED_ONLINE_DRUGS.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineSourceFilter('fda_rxnorm')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                            onlineSourceFilter === 'fda_rxnorm'
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🏥 OpenFDA & RxNorm
                        </button>
                      </div>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-sky-400 absolute right-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="اكتب اسم الدواء (عربي أو إنجليزي)، المادة الفعالة، الاستخدام الطبي، مثل: أوجمنتين، بانادول إكسترا، مضاد حيوي لالتهاب الحلق، أدوية الضغط، 629100... إلخ"
                        value={onlineSearch}
                        onChange={(e) => setOnlineSearch(e.target.value)}
                        className="w-full bg-slate-950 border-2 border-sky-700/50 hover:border-sky-500 focus:border-sky-400 rounded-xl pr-10 pl-28 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none shadow-inner"
                      />
                      <div className="absolute left-3 top-2 flex items-center gap-2">
                        {isOnlineSearching && (
                          <div className="flex items-center gap-1 text-[11px] text-sky-300 font-bold bg-sky-950/80 px-2 py-1 rounded-md border border-sky-800 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                            <span>جاري البحث...</span>
                          </div>
                        )}
                        {onlineSearch && (
                          <button
                            type="button"
                            onClick={() => setOnlineSearch('')}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
                            title="مسح البحث"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Search Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        اقتراحات سريعة:
                      </span>
                      {[
                        { label: 'أوجمنتين ومضادات حيوية', query: 'أوجمنتين' },
                        { label: 'بانادول ومسكنات', query: 'بنادول' },
                        { label: 'كونكور وأدوية الضغط', query: 'كونكور' },
                        { label: 'جلوكوفاج وأدوية السكر', query: 'جلوكوفاج' },
                        { label: 'نيكسيوم وقرحة المعدة', query: 'نيكسيوم' },
                        { label: 'فينتولين وأدوية الصدر', query: 'فينتولين' },
                        { label: 'أوميجا 3 وفيتامينات', query: 'أوميجا' },
                        { label: 'فيوسيدين ومراهم', query: 'فيوسيدين' },
                        { label: 'أدوية طوارئ ومحاليل', query: 'سلاين' },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setOnlineSearch(chip.query);
                            setOnlineCategory('الكل');
                          }}
                          className={`px-2.5 py-1 rounded-lg border transition-all ${
                            onlineSearch === chip.query
                              ? 'bg-sky-600 text-white border-sky-400 shadow-xs font-bold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-sky-700 hover:text-white hover:bg-sky-950/40'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Curated Packs Bar */}
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-white">حزم الأدوية السحابية المعتمدة (استيراد فوري بنقرة واحدة):</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        متاح {ALL_COMBINED_ONLINE_DRUGS.length} صنف دوائي مسجل بالباركود والشركات
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CURATED_DRUG_PACKS.map((pack) => {
                        const isSelected = activePackId === pack.id;
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            onClick={() => handleApplyCuratedPack(pack)}
                            className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between text-xs ${
                              isSelected
                                ? 'bg-sky-950/80 border-sky-500 text-sky-200 shadow-md shadow-sky-950/40 ring-1 ring-sky-500/50'
                                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                            }`}
                          >
                            <div className="font-bold text-white leading-snug line-clamp-1">{pack.title}</div>
                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                              <span>{pack.itemCount} صنف</span>
                              {isSelected ? (
                                <span className="text-sky-400 font-bold flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> محددة
                                </span>
                              ) : (
                                <span className="text-slate-500">اختر</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filter Dropdowns Controls */}
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">المجموعة الدوائية:</label>
                      <select
                        value={onlineCategory}
                        onChange={(e) => {
                          setOnlineCategory(e.target.value);
                          setActivePackId(null);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        {ONLINE_DRUG_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat === 'الكل' ? 'جميع المجموعات الدوائية' : cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">الشركة المصنعة:</label>
                      <select
                        value={onlineManufacturer}
                        onChange={(e) => setOnlineManufacturer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        {ONLINE_DRUG_MANUFACTURERS.map((mfg) => (
                          <option key={mfg} value={mfg}>
                            {mfg === 'الكل' ? 'جميع الشركات والمصانع' : mfg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">الشكل الصيدلاني:</label>
                      <select
                        value={onlineForm}
                        onChange={(e) => setOnlineForm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="الكل">جميع الأشكال الصيدلانية</option>
                        <option value="أقراص">أقراص (Tablets)</option>
                        <option value="كبسولات">كبسولات (Capsules)</option>
                        <option value="شراب">شراب (Syrup)</option>
                        <option value="حقن">حقن (Injections)</option>
                        <option value="مرهم">مرهم (Ointment)</option>
                        <option value="كريم">كريم (Cream)</option>
                        <option value="قطرة">قطرة (Drops)</option>
                        <option value="بخاخ">بخاخ (Inhaler/Spray)</option>
                        <option value="فوار">فوار (Effervescent)</option>
                        <option value="تحاميل">تحاميل (Suppositories)</option>
                        <option value="أكياس بودرة">أكياس بودرة (Sachets)</option>
                      </select>
                    </div>
                  </div>

                  {/* Mode & Action Bar */}
                  <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAllFilteredOnline}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>تحديد المعروض ({onlineItemsList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeselectAllFilteredOnline}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                      >
                        إلغاء التحديد
                      </button>

                      <span className="text-slate-400 font-mono text-xs mr-2">
                        المحدد: <strong className="text-sky-400">{onlineSelectedBarcodes.size}</strong> دواء
                      </span>

                      {onlineFromAiCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Bot className="w-3 h-3 text-indigo-400" />
                          <span>{onlineFromAiCount} من الذكاء الاصطناعي</span>
                        </span>
                      )}

                      {onlineFromLiveApiCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                          {onlineFromLiveApiCount} من السجلات العالمية
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setOnlinePricingMode('catalog_only')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                            onlinePricingMode === 'catalog_only'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="استيراد كتالوج فقط بدون أسعار ليتم تسعيرها وجردها لاحقاً"
                        >
                          📋 كتالوج فقط (بدون أسعار)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlinePricingMode('with_pricing')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                            onlinePricingMode === 'with_pricing'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="استيراد متضمن الأسعار الاسترشادية والتكلفة المعيارية"
                        >
                          💰 مع أسعار استرشادية
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleProceedWithOnlineImport()}
                        disabled={onlineSelectedBarcodes.size === 0}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-900/30 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>نقل إلى المعاينة الذكية والتسعير ({onlineSelectedBarcodes.size})</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDirectOneClickOnlineImport()}
                        disabled={onlineSelectedBarcodes.size === 0 || isExecuting}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                        title="حفظ الأدوية المحددة مباشرة في قاعدة بيانات الصيدلية"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حفظ مباشر في الصيدلية 🚀</span>
                      </button>
                    </div>
                  </div>

                  {/* Online Drugs Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80 max-h-[420px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 w-10 text-center">اختيار</th>
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">اسم الدواء التجاري</th>
                          <th className="p-2.5">الاسم العلمي والمادة الفعالة</th>
                          <th className="p-2.5">المجموعة العلاجية</th>
                          <th className="p-2.5">الشكل والتركيز</th>
                          <th className="p-2.5">الشركة المصنعة والمنشأ</th>
                          <th className="p-2.5">الباركود</th>
                          <th className="p-2.5 text-center">التقسيم</th>
                          <th className="p-2.5 text-center">التفاصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {onlineItemsList.map((drug) => {
                          const isSelected = onlineSelectedBarcodes.has(drug.barcode);
                          return (
                            <tr
                              key={drug.barcode}
                              onClick={() => handleToggleOnlineBarcode(drug.barcode)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-sky-950/30 hover:bg-sky-950/50' : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleOnlineBarcode(drug.barcode)}
                                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5">
                                {drug.source === 'ai_gemini' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    <Bot className="w-3 h-3 text-indigo-400" />
                                    <span>Gemini AI</span>
                                  </span>
                                ) : drug.source === 'open_fda' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    <span>OpenFDA</span>
                                  </span>
                                ) : drug.source === 'rxnorm' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                    <span>RxNorm</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    <span>سحابي</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-bold text-white">
                                <div className="flex flex-col">
                                  <span>{drug.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{drug.nameEn}</span>
                                </div>
                              </td>
                              <td className="p-2.5 text-sky-300 font-mono text-[11px]">
                                {drug.scientificName}
                              </td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                                  {drug.category}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="text-white font-medium">{drug.form}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">{drug.strength}</span>
                              </td>
                              <td className="p-2.5">
                                <div className="text-xs text-slate-200">{drug.manufacturer}</div>
                                <div className="text-[10px] text-slate-400">{drug.country}</div>
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-400">
                                {drug.barcode}
                              </td>
                              <td className="p-2.5 text-center text-[10px] font-mono text-slate-300">
                                {drug.stripsPerPackage} شريط × {drug.piecesPerStrip} حبة
                              </td>
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDrugDetailsModal(drug)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition-colors"
                                  title="معاينة التفاصيل الدوائية والسريرية"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {onlineItemsList.length === 0 && !isOnlineSearching && (
                          <tr>
                            <td colSpan={10} className="p-10 text-center text-slate-400 text-xs">
                              <div className="max-w-md mx-auto space-y-2">
                                <p className="font-bold text-white">لم يتم العثور على أدوية مطابقة للبحث</p>
                                <p className="text-[11px] text-slate-400">
                                  جرب كتابة الاسم العلمي أو المادة الفعالة أو استخدام أحد الاقتراحات السريعة بالأعلى.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                        {isOnlineSearching && onlineItemsList.length === 0 && (
                          <tr>
                            <td colSpan={10} className="p-12 text-center text-slate-400 text-xs">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                                <span className="font-bold text-sky-300">جاري فحص وتدقيق قواعد البيانات السحابية والذكاء الاصطناعي...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Clinical Drug Details Modal */}
                  {selectedDrugDetailsModal && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                              <Stethoscope className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-base text-white">{selectedDrugDetailsModal.name}</h4>
                              <p className="text-xs text-slate-400 font-mono">{selectedDrugDetailsModal.nameEn}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedDrugDetailsModal(null)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">التركيبة والاسم العلمي:</span>
                            <span className="font-bold text-sky-300 font-mono">{selectedDrugDetailsModal.scientificName}</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">المجموعة العلاجية:</span>
                            <span className="font-bold text-white">{selectedDrugDetailsModal.category}</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">الشكل والتركيز:</span>
                            <span className="font-bold text-white">{selectedDrugDetailsModal.form} - {selectedDrugDetailsModal.strength}</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">الشركة المصنعة والمنشأ:</span>
                            <span className="font-bold text-white">{selectedDrugDetailsModal.manufacturer} ({selectedDrugDetailsModal.country})</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">الباركود الدولي:</span>
                            <span className="font-mono text-amber-300 font-bold">{selectedDrugDetailsModal.barcode}</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">تقسيم العبوة:</span>
                            <span className="font-mono text-white font-bold">{selectedDrugDetailsModal.stripsPerPackage} شريط × {selectedDrugDetailsModal.piecesPerStrip} حبة</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">التسعير الاسترشادي:</span>
                            <span className="font-bold text-emerald-400">{formatCurrency(selectedDrugDetailsModal.standardPrice)} (تكلفة: {formatCurrency(selectedDrugDetailsModal.standardCost)})</span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">حالة الوصفة وموقع الرف:</span>
                            <span className="font-bold text-white">
                              {selectedDrugDetailsModal.requiresPrescription ? '🔴 يحتاج وصفة طبية (Rx)' : '🟢 بدون وصفة (OTC)'} • رف: {selectedDrugDetailsModal.locationRack}
                            </span>
                          </div>
                        </div>

                        {selectedDrugDetailsModal.indications && (
                          <div className="bg-sky-950/30 border border-sky-800/40 p-3 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-sky-300 block">دواعي الاستعمال والإرشادات السريرية:</span>
                            <p className="text-slate-300 leading-relaxed">{selectedDrugDetailsModal.indications}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleOnlineBarcode(selectedDrugDetailsModal.barcode);
                              setSelectedDrugDetailsModal(null);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                              onlineSelectedBarcodes.has(selectedDrugDetailsModal.barcode)
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-sky-600 hover:bg-sky-500 text-white'
                            }`}
                          >
                            {onlineSelectedBarcodes.has(selectedDrugDetailsModal.barcode)
                              ? 'إلغاء تحديد هذا الدواء'
                              : 'تحديد هذا الدواء للاستيراد ✓'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDrugDetailsModal(null)}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            إغلاق
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Upload */}
              {inputTab === 'upload' && (
                <div className="space-y-3">
                  <label
                    className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/60 transition-all group"
                  >
                    <div className="p-4 rounded-full bg-slate-800 group-hover:bg-teal-500/20 text-slate-400 group-hover:text-teal-400 mb-3 transition-colors">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors">
                      انقر لاختيار أو إسقاط ملف Excel (.xlsx, .xls) أو ملف CSV
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      النظام الذكي يدعم أي ترتيب للأعمدة وسيتعرف عليها تلقائياً
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv, .txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Tab Content: Clipboard Paste */}
              {inputTab === 'paste' && (
                <div className="space-y-3">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>انسخ الأسطر من أي جدول Excel واضغط Ctrl+V هنا مباشرة</span>
                    <span className="text-[11px] text-teal-400 font-mono">
                      {clipboardText.split(/\r?\n/).filter((l) => l.trim()).length} سطر مسجل
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={clipboardText}
                    onChange={(e) => setClipboardText(e.target.value)}
                    placeholder="الصق بيانات جدول الأكسل هنا مباشرة... (الباركود، اسم الدواء، الشراء، البيع، الكمية، الصلاحية...)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none resize-none leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleClipboardParse}
                    disabled={!clipboardText.trim() || isParsing}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>تحليل ومطابقة البيانات المنسوخة</span>
                  </button>
                </div>
              )}

              {/* Error Message */}
              {parseError && (
                <div className="bg-rose-950/50 border border-rose-800/80 p-3 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: SMART MAPPING & CONFIG ================= */}
          {step === 2 && (
            <div className="space-y-5 max-w-5xl mx-auto">
              {/* File stats banner */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <span className="text-slate-400">الملف:</span>
                  <span className="font-mono text-white font-bold">{fileName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    الأعمدة المكتشفة: <strong className="text-white font-mono">{rawHeaders.length}</strong>
                  </span>
                  <span className="text-slate-400">
                    عدد الأدوية المرصودة: <strong className="text-teal-400 font-mono">{rawRows.length}</strong>
                  </span>
                </div>
              </div>

              {/* Configuration Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode Selector */}
                <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
                  <label className="font-bold text-xs text-white block">نوع وعمق الاستيراد (Import Mode)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('full_inventory')}
                      className={`p-2.5 rounded-xl border text-right transition-colors ${
                        importMode === 'full_inventory'
                          ? 'bg-teal-950/80 border-teal-500 text-teal-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-teal-400" />
                        <span>أدوية ومخزون كامل</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        إضافة الأصناف مع كميات التشغيلات وتواريخ الانتهاء
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode('catalog_only')}
                      className={`p-2.5 rounded-xl border text-right transition-colors ${
                        importMode === 'catalog_only'
                          ? 'bg-teal-950/80 border-teal-500 text-teal-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>كتالوج فقط (بدون كميات)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        إضافة وتحديث بيانات وبطاقات الأدوية دون المساس بالمخزون
                      </div>
                    </button>
                  </div>
                </div>

                {/* Conflict Strategy Selector */}
                <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
                  <label className="font-bold text-xs text-white block">
                    التعامل مع الأدوية المسجلة مسبقاً (Matching Strategy)
                  </label>
                  <select
                    value={existingStrategy}
                    onChange={(e) => setExistingStrategy(e.target.value as ExistingStrategy)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-xl p-2 text-xs font-bold text-slate-200 outline-none"
                  >
                    <option value="update_and_add_batch">
                      تحديث بيانات الصنف + إضافة رصيد تشغيلة جديدة (موصى به)
                    </option>
                    <option value="update_catalog_only">تحديث بيانات الصنف فقط مع الإبقاء على رصيد المخزون الحالي</option>
                    <option value="skip_existing">تخطي الصنف المسجل مسبقاً واستيراد الأصناف الجديدة فقط</option>
                    <option value="overwrite_stock">استبدال كامل لرصيد الصنف بالكمية المستوردة</option>
                  </select>
                  <div className="text-[10px] text-slate-400">
                    يتم التحقق من تطابق الصنف عبر الباركود أو الاسم التجاري بدقة
                  </div>
                </div>
              </div>

              {/* Strict Pricing Policy & Fallbacks */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">الاعتماد الصارم على أسعار ملف Excel</h4>
                      <p className="text-[11px] text-slate-400">
                        استيراد القيم والأسعار المسجلة في الملف حرفياً ومطابقتها دون فرض أسعار بيع أو هوامش افتراضية
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={strictFilePricing}
                      onChange={(e) => {
                        setStrictFilePricing(e.target.checked);
                        if (e.target.checked) setAutoCalculateMarginIfPriceMissing(false);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>القيم الافتراضية للحقول الفارغة وغير المحددة بالملف</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      هامش ربح البيع الافتراضي %
                      <span className="text-[10px] text-slate-500 mr-1">(يستخدم فقط عند الطلب)</span>
                    </label>
                    <input
                      type="number"
                      value={defaultProfitMargin}
                      onChange={(e) => setDefaultProfitMargin(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">المورد الافتراضي</label>
                    <input
                      type="text"
                      value={defaultSupplier}
                      onChange={(e) => setDefaultSupplier(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      placeholder="مورد عام"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">موقع الرف الافتراضي</label>
                    <input
                      type="text"
                      value={defaultRack}
                      onChange={(e) => setDefaultRack(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      placeholder="A-101"
                    />
                  </div>
                </div>
              </div>

              {/* Column Mapping Grid */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-teal-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>مطابقة أعمدة الملف مع حقول النظام (Auto Column Mapping)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    تمت المطابقة الذكية تلقائياً، ويمكنك تعديل أي عمود يدوياً
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Name (Required) */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-emerald-400 flex items-center justify-between mb-1">
                      <span>اسم الدواء التجاري *</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">إلزامي</span>
                    </label>
                    <select
                      value={columnMapping.name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- اختر العمود --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barcode */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">الباركود (Barcode)</label>
                    <select
                      value={columnMapping.barcode}
                      onChange={(e) => setColumnMapping({ ...columnMapping, barcode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- توليد تلقائي في حال عدم وجوده --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scientific Name */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">الاسم العلمي / الفعالة</label>
                    <select
                      value={columnMapping.scientificName}
                      onChange={(e) => setColumnMapping({ ...columnMapping, scientificName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Price */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-teal-400 block mb-1">سعر الشراء (عبوة)</label>
                    <select
                      value={columnMapping.costPrice}
                      onChange={(e) => setColumnMapping({ ...columnMapping, costPrice: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selling Price */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-emerald-400 block mb-1">سعر البيع للجمهور</label>
                    <select
                      value={columnMapping.price}
                      onChange={(e) => setColumnMapping({ ...columnMapping, price: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- احتساب تلقائي من الشراء + الهامش --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-amber-400 block mb-1">الكمية المتوفرة (عبوات)</label>
                    <select
                      value={columnMapping.quantity}
                      onChange={(e) => setColumnMapping({ ...columnMapping, quantity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- 0 عبوة في حال عدم التحديد --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expiry Date */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-rose-400 block mb-1">تاريخ الانتهاء (الصلاحية)</label>
                    <select
                      value={columnMapping.expiryDate}
                      onChange={(e) => setColumnMapping({ ...columnMapping, expiryDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- بعد سنتين افتراضياً --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Number */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">رقم التشغيلة (Batch #)</label>
                    <select
                      value={columnMapping.batchNumber}
                      onChange={(e) => setColumnMapping({ ...columnMapping, batchNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- توليد تلقائي BAT-2025 --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">المجموعة الدوائية</label>
                    <select
                      value={columnMapping.category}
                      onChange={(e) => setColumnMapping({ ...columnMapping, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- أدوية عامة --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Form */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">الشكل الصيدلاني</label>
                    <select
                      value={columnMapping.form}
                      onChange={(e) => setColumnMapping({ ...columnMapping, form: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- استنتاج تلقائي من الاسم --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">المورد / الشركة</label>
                    <select
                      value={columnMapping.supplierName}
                      onChange={(e) => setColumnMapping({ ...columnMapping, supplierName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Rack */}
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">موقع الرف</label>
                    <select
                      value={columnMapping.locationRack}
                      onChange={(e) => setColumnMapping({ ...columnMapping, locationRack: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: INTERACTIVE REVIEW & EDIT ================= */}
          {step === 3 && (
            <div className="space-y-3.5">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">إجمالي الأصناف المرصودة</span>
                    <strong className="text-base font-mono text-white font-black">{parsedItems.length}</strong>
                  </div>
                  <Package className="w-5 h-5 text-teal-400 opacity-60" />
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">أصناف جديدة بالكامل</span>
                    <strong className="text-base font-mono text-teal-400 font-black">{newItemsCount}</strong>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-teal-400 opacity-60" />
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">أصناف موجودة سيتم تحديثها</span>
                    <strong className="text-base font-mono text-indigo-400 font-black">{updateItemsCount}</strong>
                  </div>
                  <RefreshCw className="w-5 h-5 text-indigo-400 opacity-60" />
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">إجمالي العبوات المحددة</span>
                    <strong className="text-base font-mono text-amber-400 font-black">
                      {totalSelectedQuantity.toLocaleString('ar-YE')}
                    </strong>
                  </div>
                  <Boxes className="w-5 h-5 text-amber-400 opacity-60" />
                </div>

                <div className="col-span-2 sm:col-span-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">القيمة التقديرية للتكلفة</span>
                    <strong className="text-xs font-mono text-emerald-400 font-black">
                      {formatCurrency(totalSelectedCostValuation)}
                    </strong>
                  </div>
                  <DollarSign className="w-5 h-5 text-emerald-400 opacity-60" />
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Search & Filter */}
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      placeholder="بحث في أسماء الأدوية أو الباركود..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg pr-8 pl-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        statusFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الكل ({parsedItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('valid_new')}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        statusFilter === 'valid_new' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      جديد ({newItemsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('valid_update')}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        statusFilter === 'valid_update' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      تحديث ({updateItemsCount})
                    </button>
                    {warningItemsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('warning')}
                        className={`px-2 py-1 rounded text-[11px] font-bold ${
                          statusFilter === 'warning' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-white'
                        }`}
                      >
                        تنبيهات ({warningItemsCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk tools */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleBatchApplyProfitMargin}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 hover:text-teal-200 text-xs flex items-center gap-1 font-bold active:scale-95"
                    title="تطبيق هامش ربح محدد على سعر الشراء لحساب سعر البيع للأصناف المحددة"
                  >
                    <DollarSign className="w-3 h-3 text-teal-400" />
                    <span>تطبيق هامش ربح %</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchCalculateStripPrices}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 hover:text-emerald-200 text-xs flex items-center gap-1 font-bold active:scale-95"
                    title="احتساب أسعار أشرطة الأدوية بناءً على سعر البيع وعدد الأشرطة"
                  >
                    <Boxes className="w-3 h-3 text-emerald-400" />
                    <span>احتساب سعر الشريط</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateMissingBarcodes}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 font-bold active:scale-95"
                    title="توليد باركودات تلقائية لجميع الأصناف"
                  >
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>توليد باركودات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchSetRack}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 font-bold active:scale-95"
                    title="تعيين موقع رف موحد"
                  >
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span>رف موحد</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchSetSupplier}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 font-bold active:scale-95"
                    title="تعيين مورد موحد"
                  >
                    <Truck className="w-3 h-3 text-amber-400" />
                    <span>مورد موحد</span>
                  </button>
                </div>
              </div>

              {/* Editable Data Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="max-h-[380px] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="p-2 text-center w-8">
                          <input
                            type="checkbox"
                            checked={parsedItems.length > 0 && parsedItems.every((i) => i.selectedForImport)}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="rounded accent-teal-600 cursor-pointer"
                          />
                        </th>
                        <th className="p-2 w-12 text-center">#</th>
                        <th className="p-2 min-w-[200px]">اسم الدواء التجاري</th>
                        <th className="p-2 min-w-[130px]">الباركود</th>
                        <th className="p-2 min-w-[90px]">الشكل</th>
                        <th className="p-2 min-w-[90px]">سعر الشراء</th>
                        <th className="p-2 min-w-[90px]">سعر البيع</th>
                        <th className="p-2 min-w-[80px]">الكمية</th>
                        <th className="p-2 min-w-[100px]">التشغيلة</th>
                        <th className="p-2 min-w-[110px]">تاريخ الانتهاء</th>
                        <th className="p-2 min-w-[120px]">المورد</th>
                        <th className="p-2 min-w-[80px]">الرف</th>
                        <th className="p-2 w-10 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-medium text-slate-200">
                      {filteredReviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-slate-500">
                            لا توجد أدوية مطابقة للبحث أو التصفية الحالية
                          </td>
                        </tr>
                      ) : (
                        filteredReviewItems.map((item, idx) => {
                          const isWarning = item.status === 'warning';
                          const isUpdate = item.status === 'valid_update';

                          return (
                            <tr
                              key={item.id}
                              className={`hover:bg-slate-900/60 transition-colors ${
                                !item.selectedForImport ? 'opacity-40 bg-slate-950/40' : ''
                              }`}
                            >
                              {/* Selection checkbox */}
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selectedForImport}
                                  onChange={(e) => handleUpdateRowField(item.id, 'selectedForImport', e.target.checked)}
                                  className="rounded accent-teal-600 cursor-pointer"
                                />
                              </td>

                              {/* Row Index & status icon */}
                              <td className="p-2 text-center font-mono text-[10px] text-slate-500">
                                <div className="flex items-center justify-center gap-1">
                                  {isUpdate ? (
                                    <span
                                      className="w-2 h-2 rounded-full bg-indigo-500"
                                      title={item.statusMessages.join(' | ')}
                                    />
                                  ) : isWarning ? (
                                    <span
                                      className="w-2 h-2 rounded-full bg-rose-500"
                                      title={item.statusMessages.join(' | ')}
                                    />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-teal-500" title="صنف جديد" />
                                  )}
                                  <span>{idx + 1}</span>
                                </div>
                              </td>

                              {/* Product Name */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateRowField(item.id, 'name', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs text-white font-bold"
                                />
                                {item.matchedExistingProduct && (
                                  <span className="text-[9px] text-indigo-400 block mt-0.5 truncate max-w-[200px]">
                                    مطابق لـ: {item.matchedExistingProduct.name}
                                  </span>
                                )}
                              </td>

                              {/* Barcode */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.barcode}
                                  onChange={(e) => handleUpdateRowField(item.id, 'barcode', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs font-mono text-teal-300"
                                />
                              </td>

                              {/* Form */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.form}
                                  onChange={(e) => handleUpdateRowField(item.id, 'form', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs text-slate-300"
                                />
                              </td>

                              {/* Cost Price */}
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  value={item.costPrice}
                                  onChange={(e) =>
                                    handleUpdateRowField(item.id, 'costPrice', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs font-mono text-teal-400 font-bold"
                                />
                              </td>

                              {/* Selling Price */}
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateRowField(item.id, 'price', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs font-mono text-emerald-400 font-bold"
                                />
                              </td>

                              {/* Quantity */}
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateRowField(item.id, 'quantity', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs font-mono text-amber-300 font-bold"
                                />
                              </td>

                              {/* Batch Number */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.batchNumber}
                                  onChange={(e) => handleUpdateRowField(item.id, 'batchNumber', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs font-mono text-slate-300"
                                />
                              </td>

                              {/* Expiry Date */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.expiryDate}
                                  onChange={(e) => handleUpdateRowField(item.id, 'expiryDate', e.target.value)}
                                  className={`w-full bg-slate-900 border focus:border-teal-500 rounded px-2 py-1 text-xs font-mono ${
                                    isWarning ? 'border-rose-700 text-rose-300 font-bold' : 'border-slate-800 text-slate-200'
                                  }`}
                                  placeholder="YYYY-MM-DD"
                                />
                              </td>

                              {/* Supplier */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.supplierName}
                                  onChange={(e) => handleUpdateRowField(item.id, 'supplierName', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs text-slate-300"
                                />
                              </td>

                              {/* Rack */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.locationRack}
                                  onChange={(e) => handleUpdateRowField(item.id, 'locationRack', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded px-2 py-1 text-xs font-mono text-slate-300"
                                />
                              </td>

                              {/* Delete row */}
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(item.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                                  title="استبعاد هذا الصنف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          )}

          {/* ================= STEP 4: IMPORT COMPLETED SUMMARY ================= */}
          {step === 4 && importResult && (
            <div className="py-6 max-w-2xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">تم استيراد بيانات الأدوية بنجاح إلى المخزون!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  تم تحديث كتالوج الأدوية وقاعدة بيانات الصيدلية، وأصبحت كافة الأصناف والتشغيلات جاهزة للبيع
                </p>
              </div>

              {/* Metrics result grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">أدوية جديدة أُضيفت</span>
                  <span className="text-lg font-mono font-black text-teal-400">
                    {importResult.addedProducts} صنف
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">أصناف تم تحديثها</span>
                  <span className="text-lg font-mono font-black text-indigo-400">
                    {importResult.updatedProducts} صنف
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">دفعات وتشغيلات أنشئت</span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    {importResult.createdBatches} تشغيلة
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">قيمة المخزون المضاف</span>
                  <span className="text-sm font-mono font-black text-emerald-400">
                    {formatCurrency(importResult.totalValuationAdded)}
                  </span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-right bg-rose-950/40 p-3 rounded-xl border border-rose-800 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>ملاحظات أثناء الاستيراد:</span>
                  </div>
                  {importResult.errors.map((e, idx) => (
                    <div key={idx} className="text-[11px] text-rose-400">
                      • {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                إلغاء
              </button>
              <div className="text-xs text-slate-500">اختر ملف أو الصق بيانات جدول Excel للمتابعة</div>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الرجوع لاختيار الملف</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToReview}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-900/30 transition-all active:scale-95"
              >
                <span>متابعة للمعاينة والتدقيق ({rawRows.length} صنف)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الرجوع للمطابقة</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  سيتم استيراد <strong className="text-teal-400 font-mono">{totalSelectedCount}</strong> صنف
                </span>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={totalSelectedCount === 0 || isExecuting}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ الأدوية في قاعدة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تنفيذ الاستيراد إلى المخزون ({totalSelectedCount})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setParsedItems([]);
                  setRawRows([]);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>استيراد ملف آخر</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-900/30"
              >
                إغلاق والعودة للمخزون
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
