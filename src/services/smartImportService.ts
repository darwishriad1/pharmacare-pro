import * as XLSX from 'xlsx';
import { Product, Batch, Supplier } from '../types';
import { db } from '../database/db';

export type ImportMode = 'full_inventory' | 'catalog_only';
export type ExistingStrategy = 'update_and_add_batch' | 'update_catalog_only' | 'skip_existing' | 'overwrite_stock';

export interface ColumnMapping {
  name: string;
  scientificName: string;
  barcode: string;
  category: string;
  form: string;
  strength: string;
  manufacturer: string;
  country: string;
  costPrice: string;
  price: string;
  stripPrice: string;
  piecePrice: string;
  stripsPerPackage: string;
  piecesPerStrip: string;
  minStock: string;
  locationRack: string;
  quantity: string;
  batchNumber: string;
  expiryDate: string;
  supplierName: string;
  requiresPrescription: string;
}

export interface ParsedMedicineRow {
  id: string;
  rowNumber: number;
  barcode: string;
  name: string;
  scientificName: string;
  category: string;
  form: string;
  strength: string;
  manufacturer: string;
  country: string;
  costPrice: number;
  price: number;
  stripPrice?: number;
  piecePrice?: number;
  stripsPerPackage: number;
  piecesPerStrip: number;
  minStock: number;
  locationRack: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  supplierName: string;
  requiresPrescription: boolean;
  
  // Status flags for UI
  status: 'valid_new' | 'valid_update' | 'warning' | 'error';
  statusMessages: string[];
  matchedExistingProduct?: Product;
  isDuplicateInBatch?: boolean;
  selectedForImport: boolean;
}

export interface SmartImportResult {
  totalProcessed: number;
  addedProducts: number;
  updatedProducts: number;
  createdBatches: number;
  totalQuantityAdded: number;
  totalValuationAdded: number;
  errors: string[];
}

// Common aliases for smart header matching
const HEADER_PATTERNS: Record<keyof ColumnMapping, (string | RegExp)[]> = {
  name: [
    'اسم الدواء', 'اسم الصنف', 'الاسم التجاري', 'الصنف', 'الدواء', 'المستحضر', 'اسم المنتج',
    'name', 'trade_name', 'trade name', 'item_name', 'item name', 'product_name', 'product', 'drug', 'medicine'
  ],
  scientificName: [
    'الاسم العلمي', 'الاسم العلمي الدقيق', 'المادة الفعالة', 'العلمي', 'المركب', 'التركيب العلمي',
    'scientific_name', 'scientific name', 'generic_name', 'generic name', 'active_ingredient', 'molecule'
  ],
  barcode: [
    'الباركود', 'باركود', 'كود الصنف', 'رمز الصنف', 'الكود', 'الرمز', 'رقم الباركود',
    'barcode', 'code', 'item_code', 'item code', 'upc', 'ean', 'sku'
  ],
  category: [
    'المجموعة الدوائية', 'المجموعات الدوائية', 'المجموعة العلاجية', 'المجموعات العلاجية', 'المجموعة', 'التصنيف العلاجي', 'التصنيف', 'القسم', 'الفئة', 'العائلة', 'العائلة الدوائية',
    'category', 'group', 'class', 'therapeutic_class', 'classification'
  ],
  form: [
    'الشكل الصيدلاني', 'الشكل', 'النوع', 'هيئة الدواء', 'الشكل الدوائي',
    'form', 'dosage_form', 'dosage form', 'type'
  ],
  strength: [
    'التركيز', 'العيار', 'القوة',
    'strength', 'concentration', 'dose', 'potency'
  ],
  manufacturer: [
    'الشركة المصنعة أو الموردة', 'الشركة المصنعة او الموردة', 'الشركه المصنعه أو المورده', 'الشركه المصنعه او المورده', 'الشركة المصنعة', 'الشركه المصنعه', 'الشركة الموردة', 'الشركه المورده', 'المصنع', 'المصنعة', 'الشركة', 'الشركه', 'الوكيل', 'الماركة',
    'manufacturer', 'company', 'brand', 'maker', 'producer'
  ],
  country: [
    'بلد الصنع', 'بلد المنشأ', 'الدولة', 'المنشأ', 'بلد المصنع',
    'country', 'origin', 'country_of_origin'
  ],
  costPrice: [
    'سعر الشراء', 'سعر شراء', 'سعر التكلفة', 'سعر تكلفة', 'سعر التكلفه', 'التكلفة', 'التكلفه', 'الشراء', 'شراء', 'تكلفة', 'تكلفه',
    'سعر الجملة', 'سعر الجمله', 'الجملة', 'الجمله', 'جملة', 'جمله', 'سعر التوريد', 'سعر الشراء (عبوة)', 'سعر الشراء من المورد', 'سعر الفاتورة', 'سعر الوحدة شراء', 'سعر الشراء الفعلي',
    'cost', 'cost_price', 'cost price', 'purchase_price', 'purchase price', 'buy_price', 'wholesale_price', 'supply_price', 'purchase'
  ],
  price: [
    'سعر البيع', 'سعر بيع', 'سعر الجمهور', 'سعر المستهلك', 'سعر الصيدلية', 'سعر العموم', 'سعر القطاعي', 'سعر العبوة', 'سعر الدواء',
    'سعر البيع للجمهور', 'سعر البيع (عبوة)', 'سعر البيع الافتراضي', 'البيع', 'الجمهور', 'المستهلك', 'القطاعي', 'قطاعي', 'السعر', 'سعر',
    'الافرادي', 'سعر الافرادي', 'سعر مفرق', 'مفرق',
    'price', 'selling_price', 'selling price', 'retail_price', 'retail price', 'sale_price', 'public_price', 'consumer_price', 'customer_price', 'rsp', 'mrp', 'unit_price'
  ],
  stripPrice: [
    'سعر الشريط', 'سعر شريط', 'سعر بيع الشريط', 'الشريط', 'بيع الشريط',
    'strip_price', 'strip price', 'strip'
  ],
  piecePrice: [
    'سعر الحبة', 'سعر حبة', 'سعر الوحدة', 'سعر بيع الحبة', 'الحبة', 'بيع الحبة', 'سعر القرص',
    'piece_price', 'piece price', 'unit_price', 'piece', 'tablet_price'
  ],
  stripsPerPackage: [
    'أشرطة بالعبوة', 'عدد الأشرطة', 'أشرطة', 'الأشرطة في البكت', 'عدد الاشرطة',
    'strips_per_package', 'strips per package', 'strips_per_pack', 'strips', 'pack_size'
  ],
  piecesPerStrip: [
    'حبات بالشريط', 'عدد الحبات', 'حبات', 'الحبات في الشريط', 'عدد الحبات بالشريط',
    'pieces_per_strip', 'pieces per strip', 'pieces', 'units_per_strip'
  ],
  minStock: [
    'الحد الأدنى', 'حد الطلب', 'الحد الادنى', 'أقل كمية',
    'min_stock', 'min stock', 'reorder_level', 'minimum'
  ],
  locationRack: [
    'موقع الرف', 'الرف', 'المكان', 'الدرج', 'مكان التخزين',
    'location', 'location_rack', 'rack', 'shelf', 'bin'
  ],
  quantity: [
    'الكمية', 'الرصيد', 'الكمية المتوفرة', 'العدد', 'المخزون', 'الرصيد الافتتاحي', 'العبوات',
    'quantity', 'qty', 'stock', 'balance', 'count', 'units'
  ],
  batchNumber: [
    'رقم التشغيلة', 'التشغيلة', 'الوجبة', 'الدفعة', 'رقم الوجبة', 'رقم الدفعة', 'اللوت',
    'batch', 'batch_number', 'batch number', 'lot', 'lot_number', 'batch_no'
  ],
  expiryDate: [
    'تاريخ الانتهاء', 'تاريخ الصلاحية', 'الانتهاء', 'الصلاحية', 'تاريخ انتهاء الصلاحية', 'تاريخ الصلاحيه',
    'expiry', 'expiry_date', 'expiry date', 'exp_date', 'exp', 'expiration'
  ],
  supplierName: [
    'المورد', 'اسم المورد', 'الشركة الموردة', 'المصدر',
    'supplier', 'supplier_name', 'supplier name', 'vendor'
  ],
  requiresPrescription: [
    'وصفة طبية', 'يحتاج وصفة', 'بروشتة', 'روشتة',
    'requires_prescription', 'prescription', 'rx'
  ],
};

export const smartImportService = {
  /**
   * Parse Raw Excel File (.xlsx, .xls, .csv) to 2D Array
   */
  async parseExcelFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Parse as array of arrays
    const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (jsonRows.length === 0) {
      throw new Error('الملف فارغ أو لا يحتوي على بيانات');
    }

    // Find the header row (first non-empty row)
    let headerIndex = -1;
    for (let i = 0; i < jsonRows.length; i++) {
      if (jsonRows[i].some((cell: any) => cell && cell.toString().trim() !== '')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error('لم يتم العثور على عناوين أعمدة صالحة في الملف');
    }

    const headers = jsonRows[headerIndex].map((h: any) => (h ? h.toString().trim() : ''));
    
    const rows = jsonRows.slice(headerIndex + 1)
      .filter((r) => r.some((cell: any) => cell && cell.toString().trim() !== ''))
      .map((r) => {
        return headers.map((_, colIdx) => {
          const val = r[colIdx];
          if (val === undefined || val === null) return '';
          if (val instanceof Date) {
            return val.toISOString().split('T')[0];
          }
          return val.toString().trim();
        });
      });

    return { headers, rows };
  },

  /**
   * Parse Clipboard or Copied Text (Tab, Comma, or Semicolon separated)
   */
  parseClipboardText(rawText: string): { headers: string[]; rows: string[][] } {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      throw new Error('النص المنسوخ فارغ');
    }

    // Detect delimiter in first line (Tabs are default when copying from Excel)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(',')) {
      delimiter = ',';
    } else if (firstLine.includes(';')) {
      delimiter = ';';
    } else if (firstLine.includes('|')) {
      delimiter = '|';
    }

    const parseLine = (line: string): string[] => {
      if (delimiter === ',') {
        // Respect quotes in CSV
        return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => v.replace(/^"|"$/g, '').trim());
      }
      return line.split(delimiter).map((v) => v.replace(/^"|"$/g, '').trim());
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);

    return { headers, rows };
  },

  /**
   * Smart Header Auto-Detection
   */
  detectColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {
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
    };

    const normalize = (str: string) => str.toLowerCase().replace(/[\s_\-()\/]/g, '').trim();

    headers.forEach((header, index) => {
      const cleanHeader = normalize(header);
      if (!cleanHeader) return;

      for (const [key, patterns] of Object.entries(HEADER_PATTERNS)) {
        const fieldKey = key as keyof ColumnMapping;
        if (mapping[fieldKey]) continue; // Already mapped

        for (const pattern of patterns) {
          if (typeof pattern === 'string') {
            const cleanPattern = normalize(pattern);
            if (cleanHeader === cleanPattern || cleanHeader.includes(cleanPattern) || cleanPattern.includes(cleanHeader)) {
              mapping[fieldKey] = header;
              break;
            }
          }
        }
      }
    });

    return mapping;
  },

  /**
   * Smart Expiry Date Parser
   */
  parseExpiryDate(rawDate: string): { formatted: string; isValid: boolean; isExpired: boolean } {
    if (!rawDate) {
      // Default fallback: 2 years from today
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      return { formatted: d.toISOString().split('T')[0], isValid: true, isExpired: false };
    }

    const clean = rawDate.trim().replace(/\s+/g, '');
    let year = 0;
    let month = 0;
    let day = 1;

    // Pattern 1: YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = clean.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10);
      day = parseInt(ymdMatch[3], 10);
    } else {
      // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = clean.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10);
        year = parseInt(dmyMatch[3], 10);
      } else {
        // Pattern 3: MM/YYYY or MM-YYYY
        const myMatch = clean.match(/^(\d{1,2})[-\/.](\d{4})$/);
        if (myMatch) {
          month = parseInt(myMatch[1], 10);
          year = parseInt(myMatch[2], 10);
          // Set to last day of the month
          day = new Date(year, month, 0).getDate();
        } else {
          // Pattern 4: YYYY/MM or YYYY-MM
          const ymMatch = clean.match(/^(\d{4})[-\/.](\d{1,2})$/);
          if (ymMatch) {
            year = parseInt(ymMatch[1], 10);
            month = parseInt(ymMatch[2], 10);
            day = new Date(year, month, 0).getDate();
          } else {
            // Pattern 5: Just year, e.g. 2027 or 2028
            const yearMatch = clean.match(/^(\d{4})$/);
            if (yearMatch) {
              year = parseInt(yearMatch[1], 10);
              month = 12;
              day = 31;
            }
          }
        }
      }
    }

    if (year >= 2000 && year <= 2099 && month >= 1 && month <= 12) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const expTime = new Date(formatted).getTime();
      const isExpired = expTime < new Date().getTime();
      return { formatted, isValid: true, isExpired };
    }

    // Unrecognized date fallback
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + 2);
    return { formatted: fallback.toISOString().split('T')[0], isValid: false, isExpired: false };
  },

  /**
   * Smart Dosage Form Extractor from Name
   */
  guessDosageForm(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('شراب') || lower.includes('syrup') || lower.includes('susp')) return 'شراب';
    if (lower.includes('كبسول') || lower.includes('cap') || lower.includes('capsule')) return 'كبسولات';
    if (lower.includes('أقراص') || lower.includes('قرص') || lower.includes('tab') || lower.includes('tablet')) return 'أقراص';
    if (lower.includes('حقن') || lower.includes('امبول') || lower.includes('inj') || lower.includes('amp')) return 'حقن';
    if (lower.includes('مرهم') || lower.includes('oint') || lower.includes('ointment')) return 'مرهم';
    if (lower.includes('كريم') || lower.includes('cream')) return 'كريم';
    if (lower.includes('قطرة') || lower.includes('drop') || lower.includes('drops')) return 'قطرات';
    if (lower.includes('بخاخ') || lower.includes('spray') || lower.includes('inhaler')) return 'بخاخ';
    if (lower.includes('فوار') || lower.includes('efferv') || lower.includes('sachet')) return 'فوار / أكياس';
    if (lower.includes('جل') || lower.includes('gel')) return 'جل';
    if (lower.includes('تحاميل') || lower.includes('لبوس') || lower.includes('supp')) return 'تحاميل';
    return 'أقراص';
  },

  /**
   * Smart Strength Extractor from Name
   */
  guessStrength(name: string): string {
    const match = name.match(/(\d+(\.\d+)?\s*(mg|g|ml|mcg|iu|%|ملجم|جم|مل))/i);
    return match ? match[0] : '';
  },

  /**
   * Smart Barcode Formatter
   */
  cleanBarcode(rawVal: string, index: number): string {
    if (!rawVal) {
      return `6291${Date.now().toString().slice(-8)}${index.toString().padStart(2, '0')}`;
    }
    let val = rawVal.trim().replace(/\s+/g, '');
    
    // Handle scientific notation e.g. 6.2911E+12
    if (/^[0-9.]+[eE]\+[0-9]+$/.test(val)) {
      try {
        val = Number(val).toLocaleString('fullwide', { useGrouping: false });
      } catch {}
    }
    
    // Remove non-digit if it was a float with trailing .0
    if (val.endsWith('.0')) {
      val = val.slice(0, -2);
    }

    return val || `6291${Date.now().toString().slice(-8)}${index.toString().padStart(2, '0')}`;
  },

  /**
   * Universal Numeric Value Parser
   * Robustly handles Eastern Arabic numerals (٠-٩), Persian numerals (۰-۹),
   * formatted numbers with currency symbols, thousands commas, and decimal separators.
   */
  parseNumericValue(val: any): number | null {
    if (val === undefined || val === null) return null;
    let str = val.toString().trim();
    if (str === '' || str === '-' || str === 'N/A' || str === 'null' || str === 'None' || str === 'غير محدد' || str === 'لا يوجد') {
      return null;
    }

    // Convert Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹) to standard Western digits
    str = str.replace(/[٠-٩]/g, (d: string) => (d.charCodeAt(0) - 1632).toString());
    str = str.replace(/[۰-۹]/g, (d: string) => (d.charCodeAt(0) - 1776).toString());

    // Strip common currency keywords and symbols
    str = str.replace(/(ر\.س|د\.ع|ج\.م|ل\.س|د\.أ|ريال|دينار|جنيه|درهم|دولار|قرش|SAR|USD|IQD|EGP|AED|EUR|\$|€|£|¥)/gi, '').trim();

    // Handle thousand vs decimal commas
    if (str.includes(',') && !str.includes('.')) {
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].replace(/[^0-9]/g, '').length <= 2) {
        // e.g. "15,50" -> 15.50
        str = str.replace(',', '.');
      } else {
        // e.g. "1,500" -> 1500
        str = str.replace(/,/g, '');
      }
    } else {
      str = str.replace(/,/g, '');
    }

    // Strip any remaining unwanted characters except digits, dot, and leading minus
    str = str.replace(/[^0-9.-]/g, '');
    if (str === '' || str === '.' || str === '-') return null;

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  },

  /**
   * Build Parsed Rows with Validation & Matching
   * Strictly respects file values without forcing arbitrary default pricing
   */
  processRows(
    headers: string[],
    rows: string[][],
    mapping: ColumnMapping,
    defaultProfitMargin = 25,
    defaultSupplier = 'مورد عام',
    defaultRack = 'A-101',
    options: {
      strictFilePricing?: boolean;
      autoCalculateMarginIfPriceMissing?: boolean;
    } = { strictFilePricing: true, autoCalculateMarginIfPriceMissing: false }
  ): ParsedMedicineRow[] {
    const existingProducts = db.getProducts();
    const barcodeMap = new Map<string, Product>();
    const nameMap = new Map<string, Product>();

    existingProducts.forEach((p) => {
      if (p.barcode) barcodeMap.set(p.barcode.trim(), p);
      if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
    });

    const getColVal = (row: string[], colName: string): string => {
      if (!colName) return '';
      const colIndex = headers.indexOf(colName);
      if (colIndex === -1 || colIndex >= row.length) return '';
      return row[colIndex]?.trim() || '';
    };

    const seenBarcodesInBatch = new Set<string>();
    const result: ParsedMedicineRow[] = [];

    rows.forEach((row, rowIdx) => {
      const name = getColVal(row, mapping.name);
      if (!name) return; // Skip empty rows

      const rawBarcode = getColVal(row, mapping.barcode);
      const barcode = this.cleanBarcode(rawBarcode, rowIdx + 1);

      const scientificName = getColVal(row, mapping.scientificName);
      const category = getColVal(row, mapping.category) || 'أدوية عامة';
      const form = getColVal(row, mapping.form) || this.guessDosageForm(name);
      const strength = getColVal(row, mapping.strength) || this.guessStrength(name);
      const manufacturer = getColVal(row, mapping.manufacturer) || '';
      const country = getColVal(row, mapping.country) || '';

      // --- 1. Cost Price (سعر الشراء) ---
      let costPrice = 0;
      if (mapping.costPrice) {
        const rawCostVal = getColVal(row, mapping.costPrice);
        const parsedCost = this.parseNumericValue(rawCostVal);
        if (parsedCost !== null) {
          costPrice = parsedCost >= 0 ? parsedCost : 0;
        }
      }

      // --- 2. Selling Price (سعر البيع) - STRICTLY RESPECT WHAT IS IN FILE ---
      let price = 0;
      if (mapping.price) {
        const rawPriceVal = getColVal(row, mapping.price);
        const parsedPrice = this.parseNumericValue(rawPriceVal);
        if (parsedPrice !== null) {
          // Exactly as recorded in the file (even if 0)
          price = parsedPrice >= 0 ? parsedPrice : 0;
        } else {
          // Empty or non-numeric cell in price column
          if (options.autoCalculateMarginIfPriceMissing && defaultProfitMargin > 0 && costPrice > 0) {
            price = Math.round(costPrice * (1 + defaultProfitMargin / 100));
          } else {
            price = 0;
          }
        }
      } else {
        // No price column mapped at all
        if (options.autoCalculateMarginIfPriceMissing && defaultProfitMargin > 0 && costPrice > 0) {
          price = Math.round(costPrice * (1 + defaultProfitMargin / 100));
        } else {
          price = 0;
        }
      }

      // --- 3. Packaging Division Units ---
      const rawStrips = this.parseNumericValue(getColVal(row, mapping.stripsPerPackage));
      const stripsPerPackage = rawStrips !== null && rawStrips > 0 ? Math.round(rawStrips) : (form === 'أقراص' || form === 'كبسولات' ? 2 : 1);

      const rawPieces = this.parseNumericValue(getColVal(row, mapping.piecesPerStrip));
      const piecesPerStrip = rawPieces !== null && rawPieces > 0 ? Math.round(rawPieces) : 10;

      // --- 4. Strip Price (سعر الشريط) ---
      let stripPrice: number | undefined = undefined;
      if (mapping.stripPrice) {
        const parsedStrip = this.parseNumericValue(getColVal(row, mapping.stripPrice));
        if (parsedStrip !== null) {
          stripPrice = parsedStrip;
        }
      }
      if (stripPrice === undefined && price > 0 && stripsPerPackage > 1 && !options.strictFilePricing) {
        stripPrice = Math.round(price / stripsPerPackage);
      }

      // --- 5. Piece Price (سعر الحبة) ---
      let piecePrice: number | undefined = undefined;
      if (mapping.piecePrice) {
        const parsedPiece = this.parseNumericValue(getColVal(row, mapping.piecePrice));
        if (parsedPiece !== null) {
          piecePrice = parsedPiece;
        }
      }
      if (piecePrice === undefined && stripPrice && stripPrice > 0 && piecesPerStrip > 1 && !options.strictFilePricing) {
        piecePrice = Math.round(stripPrice / piecesPerStrip);
      }

      const rawMinStock = this.parseNumericValue(getColVal(row, mapping.minStock));
      const minStock = rawMinStock !== null && rawMinStock >= 0 ? Math.round(rawMinStock) : 5;

      const locationRack = getColVal(row, mapping.locationRack) || defaultRack;

      const rawQty = this.parseNumericValue(getColVal(row, mapping.quantity));
      const quantity = rawQty !== null && rawQty >= 0 ? rawQty : 0;

      const rawBatch = getColVal(row, mapping.batchNumber);
      const batchNumber = rawBatch || `BAT-${new Date().getFullYear()}-${String(rowIdx + 1).padStart(3, '0')}`;

      const rawExp = getColVal(row, mapping.expiryDate);
      const parsedExp = this.parseExpiryDate(rawExp);
      const expiryDate = parsedExp.formatted;

      const supplierName = getColVal(row, mapping.supplierName) || defaultSupplier;
      const requiresPrescription = getColVal(row, mapping.requiresPrescription).toLowerCase().includes('نعم') || getColVal(row, mapping.requiresPrescription).toLowerCase().includes('yes');

      // Check match with existing products
      const matchedExistingProduct = barcodeMap.get(barcode) || nameMap.get(name.trim().toLowerCase());

      const statusMessages: string[] = [];
      let status: ParsedMedicineRow['status'] = 'valid_new';

      if (matchedExistingProduct) {
        status = 'valid_update';
        statusMessages.push(`مطابق لصنف مسجل: ${matchedExistingProduct.name} (${matchedExistingProduct.barcode})`);
      }

      if (parsedExp.isExpired) {
        status = 'warning';
        statusMessages.push('تاريخ الانتهاء منتهي الصلاحية');
      }

      if (seenBarcodesInBatch.has(barcode)) {
        status = 'warning';
        statusMessages.push('الباركود مكرر داخل هذا الملف');
      }
      seenBarcodesInBatch.add(barcode);

      result.push({
        id: `parsed-${rowIdx}-${Date.now()}`,
        rowNumber: rowIdx + 1,
        barcode,
        name,
        scientificName,
        category,
        form,
        strength,
        manufacturer,
        country,
        costPrice,
        price,
        stripPrice,
        piecePrice,
        stripsPerPackage,
        piecesPerStrip,
        minStock,
        locationRack,
        quantity,
        batchNumber,
        expiryDate,
        supplierName,
        requiresPrescription,
        status,
        statusMessages,
        matchedExistingProduct,
        isDuplicateInBatch: seenBarcodesInBatch.has(barcode),
        selectedForImport: true,
      });
    });

    return result;
  },

  /**
   * Commit the parsed data into the Pharmacy Database
   */
  executeImport(
    items: ParsedMedicineRow[],
    mode: ImportMode,
    strategy: ExistingStrategy
  ): SmartImportResult {
    let addedProducts = 0;
    let updatedProducts = 0;
    let createdBatches = 0;
    let totalQuantityAdded = 0;
    let totalValuationAdded = 0;
    const errors: string[] = [];

    const selectedItems = items.filter((item) => item.selectedForImport && item.name);
    const existingSuppliers = db.getSuppliers();

    selectedItems.forEach((item) => {
      try {
        // Ensure supplier exists if supplierName is provided
        let supplierId: string | undefined = undefined;
        if (item.supplierName && item.supplierName.trim()) {
          const supNameClean = item.supplierName.trim();
          const matchSup = existingSuppliers.find((s) => s.name.toLowerCase() === supNameClean.toLowerCase());
          if (matchSup) {
            supplierId = matchSup.id;
          } else {
            const newSup: Supplier = {
              id: `sup-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
              name: supNameClean,
              companyName: supNameClean,
              phone: '',
              totalPurchases: 0,
              currentBalance: 0,
              createdAt: new Date().toISOString().split('T')[0],
            };
            db.saveSupplier(newSup);
            existingSuppliers.push(newSup);
            supplierId = newSup.id;
          }
        }

        const existingProd = item.matchedExistingProduct || db.getProductByBarcode(item.barcode);

        if (existingProd) {
          // Handle existing product according to chosen strategy
          if (strategy === 'skip_existing') {
            return; // Skip
          }

          const updatedProduct: Product = {
            ...existingProd,
            name: item.name || existingProd.name,
            scientificName: item.scientificName || existingProd.scientificName,
            category: item.category || existingProd.category,
            form: item.form || existingProd.form,
            strength: item.strength || existingProd.strength,
            manufacturer: item.manufacturer || existingProd.manufacturer,
            country: item.country || existingProd.country,
            costPrice: item.costPrice > 0 ? item.costPrice : existingProd.costPrice,
            price: item.price > 0 ? item.price : existingProd.price,
            stripPrice: item.stripPrice || existingProd.stripPrice,
            piecePrice: item.piecePrice || existingProd.piecePrice,
            stripsPerPackage: item.stripsPerPackage || existingProd.stripsPerPackage,
            piecesPerStrip: item.piecesPerStrip || existingProd.piecesPerStrip,
            minStock: item.minStock || existingProd.minStock,
            locationRack: item.locationRack || existingProd.locationRack,
            requiresPrescription: item.requiresPrescription ?? existingProd.requiresPrescription,
          };

          db.saveProduct(updatedProduct);
          updatedProducts++;

          // If mode is full_inventory and strategy allows stock additions
          if (mode === 'full_inventory' && item.quantity > 0) {
            if (strategy === 'overwrite_stock') {
              // Delete old batches and create single new batch
              const oldBatches = db.getBatches().filter((b) => b.productId === existingProd.id);
              oldBatches.forEach((b) => db.deleteBatch(b.id));
            }

            const newBatch: Batch = {
              id: `bat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              productId: existingProd.id,
              productName: updatedProduct.name,
              batchNumber: item.batchNumber || `BAT-${new Date().getFullYear()}`,
              expiryDate: item.expiryDate || '2027-12-31',
              quantity: item.quantity,
              costPrice: item.costPrice,
              sellingPrice: item.price,
              supplierId,
              supplierName: item.supplierName,
              receivedDate: new Date().toISOString().split('T')[0],
              status: new Date(item.expiryDate).getTime() < Date.now() ? 'expired' : 'active',
            };

            db.saveBatch(newBatch);
            createdBatches++;
            totalQuantityAdded += item.quantity;
            totalValuationAdded += item.quantity * item.costPrice;
          }
        } else {
          // New Product
          const newProductId = `med-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const newProduct: Product = {
            id: newProductId,
            barcode: item.barcode,
            name: item.name,
            scientificName: item.scientificName || '',
            category: item.category || 'أدوية عامة',
            form: item.form || 'أقراص',
            strength: item.strength || '',
            manufacturer: item.manufacturer || '',
            country: item.country || '',
            costPrice: item.costPrice,
            price: item.price,
            stripPrice: item.stripPrice,
            piecePrice: item.piecePrice,
            stripsPerPackage: item.stripsPerPackage,
            piecesPerStrip: item.piecesPerStrip,
            minStock: item.minStock,
            locationRack: item.locationRack,
            requiresPrescription: item.requiresPrescription,
            vatRate: 0,
            active: true,
            totalQuantity: 0,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          };

          const initialBatch: Partial<Batch> | undefined =
            mode === 'full_inventory' && item.quantity > 0
              ? {
                  batchNumber: item.batchNumber,
                  expiryDate: item.expiryDate,
                  quantity: item.quantity,
                  costPrice: item.costPrice,
                  sellingPrice: item.price,
                  supplierId,
                  supplierName: item.supplierName,
                }
              : undefined;

          db.saveProduct(newProduct, initialBatch);
          addedProducts++;

          if (initialBatch && item.quantity > 0) {
            createdBatches++;
            totalQuantityAdded += item.quantity;
            totalValuationAdded += item.quantity * item.costPrice;
          }
        }
      } catch (err: any) {
        errors.push(`خطأ في معالجة الصنف (${item.name}): ${err.message || 'فشل الحفظ'}`);
      }
    });

    db.recalculateAllProductStocks();

    return {
      totalProcessed: selectedItems.length,
      addedProducts,
      updatedProducts,
      createdBatches,
      totalQuantityAdded,
      totalValuationAdded,
      errors,
    };
  },

  /**
   * Sample templates for download
   */
  downloadSmartTemplate(type: 'catalog' | 'inventory') {
    if (type === 'inventory') {
      const headers = [
        'الباركود',
        'اسم الدواء التجاري',
        'الاسم العلمي',
        'المجموعة الدوائية',
        'الشكل الصيدلاني',
        'التركيز',
        'الشركة المصنعة',
        'بلد الصنع',
        'سعر الشراء (عبوة)',
        'سعر البيع (عبوة)',
        'سعر الشريط',
        'سعر الحبة',
        'أشرطة بالعبوة',
        'حبات بالشريط',
        'الكمية المتوفرة (عبوات)',
        'رقم التشغيلة',
        'تاريخ الانتهاء (YYYY-MM-DD)',
        'المورد',
        'الحد الأدنى',
        'موقع الرف'
      ];

      const sampleRows = [
        [
          '629110099001',
          'باناكسول 500 ملجم أقراص',
          'Paracetamol 500mg',
          'مسكنات وخافضات حرارة',
          'أقراص',
          '500mg',
          'شفا فارما',
          'اليمن',
          '1500',
          '2000',
          '1000',
          '100',
          '2',
          '10',
          '50',
          'BAT-2025-01',
          '2027-12-31',
          'شركة العالمية للأدوية',
          '10',
          'A-101'
        ],
        [
          '629110099002',
          'أوجمنتين 1 جم أقراص',
          'Amoxicillin + Clavulanic Acid 1g',
          'مضادات حيوية',
          'أقراص',
          '1g',
          'GSK',
          'بريطانيا',
          '4500',
          '5800',
          '2900',
          '290',
          '2',
          '7',
          '30',
          'BAT-2025-02',
          '2028-06-30',
          'مستودع الأمل الدوائي',
          '5',
          'B-204'
        ],
        [
          '629110099003',
          'أومول شراب أطفال 100 مل',
          'Paracetamol 120mg/5ml',
          'مسكنات وخافضات حرارة',
          'شراب',
          '120mg/5ml',
          'جلفار',
          'الإمارات',
          '1200',
          '1700',
          '',
          '',
          '1',
          '1',
          '25',
          'BAT-2025-03',
          '2027-09-30',
          'شركة سبأ الطبية',
          '8',
          'C-301'
        ]
      ];

      const csv = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      this.downloadCSV(csv, 'نموذج_استيراد_المخزون_والأدوية_الذكي.csv');
    } else {
      const headers = [
        'الباركود',
        'اسم الدواء التجاري',
        'الاسم العلمي',
        'المجموعة الدوائية',
        'الشكل الصيدلاني',
        'التركيز',
        'الشركة المصنعة',
        'بلد الصنع',
        'سعر الشراء (عبوة)',
        'سعر البيع (عبوة)',
        'سعر الشريط',
        'سعر الحبة',
        'أشرطة بالعبوة',
        'حبات بالشريط',
        'الحد الأدنى',
        'موقع الرف'
      ];

      const sampleRows = [
        [
          '629110099101',
          'بروفين 400 ملجم',
          'Ibuprofen 400mg',
          'مسكنات ومضادات التهاب',
          'أقراص',
          '400mg',
          'Abbott',
          'أمريكا',
          '2200',
          '3000',
          '1000',
          '100',
          '3',
          '10',
          '10',
          'A-102'
        ],
        [
          '629110099102',
          'أوميبرازول 20 ملجم كبسول',
          'Omeprazole 20mg',
          'أدوية الجهاز الهضمي والمعدة',
          'كبسولات',
          '20mg',
          'AstraZeneca',
          'السويد',
          '3100',
          '4200',
          '2100',
          '150',
          '2',
          '14',
          '5',
          'B-105'
        ]
      ];

      const csv = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      this.downloadCSV(csv, 'نموذج_كتالوج_الأدوية_الذكي.csv');
    }
  },

  downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
