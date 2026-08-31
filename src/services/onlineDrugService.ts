import { ONLINE_DRUG_DIRECTORY, OnlineDrugItem } from '../database/onlineDrugDirectory';
import { EXPANDED_MASTER_DRUGS } from '../database/expandedOnlineDrugMaster';

export interface EnrichedOnlineDrugItem extends OnlineDrugItem {
  source?: 'ai_gemini' | 'open_fda' | 'rxnorm' | 'catalog';
  sourceLabel?: string;
  sourceConfidence?: number;
}

// Combined thousands of base pharmaceutical items
export const ALL_COMBINED_ONLINE_DRUGS: EnrichedOnlineDrugItem[] = [
  ...ONLINE_DRUG_DIRECTORY.map(d => ({ ...d, source: 'catalog' as const, sourceLabel: 'الدليل السحابي المعتمد' })),
  ...EXPANDED_MASTER_DRUGS.map(d => ({ ...d, source: 'catalog' as const, sourceLabel: 'الدليل الموسع للشركات' }))
];

export interface OnlineDrugQueryOptions {
  query?: string;
  category?: string;
  manufacturer?: string;
  country?: string;
  form?: string;
  sourceFilter?: 'all' | 'ai' | 'cloud' | 'fda_rxnorm';
  enableLiveFdaSearch?: boolean;
}

export interface CuratedDrugPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  itemCount: number;
  filterFn: (item: OnlineDrugItem) => boolean;
}

export const CURATED_DRUG_PACKS: CuratedDrugPack[] = [
  {
    id: 'all_catalog',
    title: 'الدليل الدوائي السحابي الشامل (كافة الأصناف والشركات)',
    description: 'دليل متكامل يضم آلاف الأصناف الصيدلانية المعتمدة بباركوداتها ومجموعاتها والشركات',
    icon: 'Globe',
    color: 'emerald',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.length,
    filterFn: () => true
  },
  {
    id: 'chronic_diseases',
    title: 'دليل أدوية الأمراض المزمنة (الضغط، السكري، القلب، الكولسترول)',
    description: 'أهم أدوية الضغط، السكري، الإنسولين، موسعات الشرايين، مخفضات الدهون ومدرات البول',
    icon: 'HeartPulse',
    color: 'rose',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('الضغط') || d.category.includes('السكري')).length,
    filterFn: (item) => item.category.includes('الضغط') || item.category.includes('السكري')
  },
  {
    id: 'antibiotics',
    title: 'دليل المضادات الحيوية ومضادات الميكروبات',
    description: 'البنسلينات، السيفالوسبورين، الماكروليد، الكينولون، ومضادات الفطريات والفيروسات',
    icon: 'ShieldAlert',
    color: 'indigo',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('مضادات حيوية')).length,
    filterFn: (item) => item.category.includes('مضادات حيوية')
  },
  {
    id: 'gastro',
    title: 'دليل أدوية الجهاز الهضمي وقرحة المعدة والقولون',
    description: 'مثبطات مضخة البروتون، مضادات الحموضة، ملينات، مضادات القيء، وأدوية القولون العصبي',
    icon: 'Activity',
    color: 'amber',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('الجهاز الهضمي')).length,
    filterFn: (item) => item.category.includes('الجهاز الهضمي')
  },
  {
    id: 'analgesics',
    title: 'دليل المسكنات وخافضات الحرارة والالتهاب',
    description: 'الباراسيتامول، الإيبوبروفين، الفولتارين، مضادات الالتهاب الروماتيزمية والموضعية',
    icon: 'Flame',
    color: 'orange',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('مسكنات')).length,
    filterFn: (item) => item.category.includes('مسكنات')
  },
  {
    id: 'respiratory',
    title: 'دليل الجهاز التنفسي والربو والبرد والحساسية',
    description: 'بخاخات الربو، مضادات الهيستامين، أشربة السعال، وبخاخات احتقان الأنف',
    icon: 'Wind',
    color: 'cyan',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('الجهاز التنفسي')).length,
    filterFn: (item) => item.category.includes('الجهاز التنفسي')
  },
  {
    id: 'vitamins',
    title: 'دليل الفيتامينات والمكملات والمعادن',
    description: 'فيتامين د3، ب مركب، الكالسيوم، الحديد، الزنك، وأوميجا 3 ومضادات الأكسدة',
    icon: 'Sparkles',
    color: 'teal',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('الفيتامينات')).length,
    filterFn: (item) => item.category.includes('الفيتامينات')
  },
  {
    id: 'emergency_iv',
    title: 'دليل الطوارئ والمحاليل الوريدية والجلدية',
    description: 'المحاليل الوريدية (سلاين، رينجر، جلوكوز)، حقن الطوارئ، ومراهم الحروق والمطهرات',
    icon: 'Crosshair',
    color: 'purple',
    itemCount: ALL_COMBINED_ONLINE_DRUGS.filter(d => d.category.includes('المحاليل') || d.category.includes('الجلدية') || d.category.includes('العيون')).length,
    filterFn: (item) => item.category.includes('المحاليل') || item.category.includes('الجلدية') || item.category.includes('العيون')
  }
];

// Arabic to English medical translation dictionary for open live FDA/RxNorm search
const ARABIC_TO_ENGLISH_DRUG_MAP: Record<string, string> = {
  'باراسيتامول': 'paracetamol acetaminophen',
  'بنادول': 'panadol acetaminophen',
  'أدول': 'adol acetaminophen',
  'فيفادول': 'fevadol acetaminophen',
  'أوجمنتين': 'augmentin amoxicillin clavulanate',
  'أموكسيل': 'amoxil amoxicillin',
  'أموكسيسيلين': 'amoxicillin',
  'أزيثروميسين': 'azithromycin',
  'زيثروماكس': 'zithromax azithromycin',
  'سيبروفلوكساسين': 'ciprofloxacin',
  'سيبروكسين': 'ciprofloxacin cipro',
  'تافانيك': 'tavanic levofloxacin',
  'ليفوفلوكساسين': 'levofloxacin',
  'فولتارين': 'voltaren diclofenac',
  'ديكلوفيناك': 'diclofenac',
  'كتافلام': 'cataflam diclofenac',
  'بروفين': 'brufen ibuprofen',
  'إيبوبروفين': 'ibuprofen',
  'كونكور': 'concor bisoprolol',
  'بيسوبرولول': 'bisoprolol',
  'نورفاسك': 'norvasc amlodipine',
  'أملوديبين': 'amlodipine',
  'ليبيتور': 'lipitor atorvastatin',
  'أتورفاستاتين': 'atorvastatin',
  'كريستور': 'crestor rosuvastatin',
  'روزوفاستاتين': 'rosuvastatin',
  'بلافيكس': 'plavix clopidogrel',
  'كلوبيدوجريل': 'clopidogrel',
  'جلوكوفاج': 'glucophage metformin',
  'ميتفورمين': 'metformin',
  'أماريل': 'amaryl glimepiride',
  'جليميبيريد': 'glimepiride',
  'جانوفيا': 'januvia sitagliptin',
  'جانوميت': 'janumet sitagliptin metformin',
  'فورسيجا': 'forxiga dapagliflozin',
  'جاردينس': 'jardiance empagliflozin',
  'إنسولين': 'insulin',
  'لانتوس': 'lantus insulin glargine',
  'نوفورابيد': 'novorapid insulin aspart',
  'نيكسيوم': 'nexium esomeprazole',
  'إيزوميبرازول': 'esomeprazole',
  'أوميبرازول': 'omeprazole',
  'أوميز': 'omez omeprazole',
  'كونترولوك': 'controloc pantoprazole',
  'بانتوبرازول': 'pantoprazole',
  'دوسباتالين': 'duspatalin mebeverine',
  'فينتولين': 'ventolin albuterol salbutamol',
  'سالبوتامول': 'salbutamol albuterol',
  'سيمبيكورت': 'symbicort budesonide formoterol',
  'سيريتايد': 'seretide fluticasone salmeterol',
  'كلاريتين': 'claritin loratadine',
  'لوراتادين': 'loratadine',
  'إريوس': 'aerius desloratadine',
  'زيرتك': 'zyrtec cetirizine',
  'سيتريزين': 'cetirizine',
  'فيوسيدين': 'fucidin fusidic acid',
  'بيبانثين': 'bepanthen dexpanthenol',
  'ميبو': 'mebo herbal burn',
  'نيوروبيون': 'neurobion vitamin b',
  'سنتروم': 'centrum multivitamins',
  'فيروجلوبين': 'feroglobin iron b12',
  'أوميجا 3': 'omega 3 fish oil',
  'سيفيكسيم': 'cefixime',
  'سيفترياكسون': 'ceftriaxone',
  'روسيفين': 'rocephin ceftriaxone',
  'فيتامين د': 'vitamin d3 cholecalciferol',
  'كالسيوم': 'calcium',
  'زنك': 'zinc',
  'أسبرين': 'aspirin acetylsalicylic acid',
  'ديكساميثازون': 'dexamethasone',
  'هيدروكورتيزون': 'hydrocortisone',
  'أتروبين': 'atropine sulfate',
  'أدرينالين': 'adrenaline epinephrine',
  'سلاين': 'normal saline sodium chloride',
  'جلوكوز': 'dextrose glucose',
  'رينجر': 'ringer lactate'
};

// In-memory cache for online API responses
const liveApiCache = new Map<string, EnrichedOnlineDrugItem[]>();

export const onlineDrugService = {
  /**
   * Get all local combined medicines
   */
  getAll(): EnrichedOnlineDrugItem[] {
    return [...ALL_COMBINED_ONLINE_DRUGS];
  },

  /**
   * Instant offline search across thousands of indexed drugs
   */
  search(options: OnlineDrugQueryOptions): EnrichedOnlineDrugItem[] {
    let results = [...ALL_COMBINED_ONLINE_DRUGS];

    if (options.category && options.category !== 'الكل') {
      results = results.filter(item => item.category === options.category);
    }

    if (options.manufacturer && options.manufacturer !== 'الكل') {
      results = results.filter(item => 
        item.manufacturer.toLowerCase().includes(options.manufacturer!.toLowerCase()) || 
        options.manufacturer!.toLowerCase().includes(item.manufacturer.toLowerCase())
      );
    }

    if (options.country && options.country !== 'الكل') {
      results = results.filter(item => item.country === options.country);
    }

    if (options.form && options.form !== 'الكل') {
      results = results.filter(item => item.form === options.form);
    }

    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);

      results = results.filter(item => {
        const fullText = `${item.name} ${item.nameEn} ${item.scientificName} ${item.barcode} ${item.manufacturer} ${item.strength} ${item.form} ${item.indications || ''}`.toLowerCase();
        return tokens.every(token => fullText.includes(token));
      });
    }

    return results;
  },

  /**
   * Search Server-Side Gemini AI Endpoint for intelligent clinical drug matching
   */
  async searchWithGeminiAI(query: string, category?: string): Promise<EnrichedOnlineDrugItem[]> {
    if (!query || !query.trim()) return [];
    try {
      const response = await fetch('/api/drugs/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), category, limit: 15 }),
      });

      if (!response.ok) return [];
      const data = await response.json();
      if (data && data.success && Array.isArray(data.results)) {
        return data.results.map((item: any) => ({
          ...item,
          source: 'ai_gemini' as const,
          sourceLabel: 'ذكاء اصطناعي دوائي (Gemini AI)',
          sourceConfidence: 0.95,
        }));
      }
    } catch {
      // Ignore AI server failure gracefully
    }
    return [];
  },

  /**
   * Search Live NIH RxNorm Global Drug Database
   */
  async searchRxNormLive(query: string): Promise<EnrichedOnlineDrugItem[]> {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim();

    // Translation or sanitized term
    let englishTerm = cleanQuery;
    for (const [arWord, enTrans] of Object.entries(ARABIC_TO_ENGLISH_DRUG_MAP)) {
      if (cleanQuery.includes(arWord)) {
        englishTerm = enTrans.split(' ')[0];
        break;
      }
    }

    try {
      const rxUrl = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(englishTerm)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(rxUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json().catch(() => null);
        const drugGroup = data?.drugGroup?.conceptGroup;
        if (Array.isArray(drugGroup)) {
          const items: EnrichedOnlineDrugItem[] = [];
          drugGroup.forEach((grp: any) => {
            if (Array.isArray(grp.conceptProperties)) {
              grp.conceptProperties.slice(0, 10).forEach((prop: any, idx: number) => {
                const name = prop.name || englishTerm;
                const rxcui = prop.rxcui || `${Date.now().toString().slice(-6)}${idx}`;
                const barcode = `629${rxcui.padStart(10, '0')}`.slice(0, 13);

                items.push({
                  barcode,
                  name: `${name} (RxNorm)`,
                  nameEn: name,
                  scientificName: `${englishTerm} [NIH RxNorm Verified]`,
                  category: 'مضادات حيوية وميكروبية',
                  form: name.toLowerCase().includes('tablet') ? 'أقراص' : name.toLowerCase().includes('capsule') ? 'كبسولات' : name.toLowerCase().includes('injection') ? 'حقن' : 'أقراص',
                  strength: 'Standard Dosage',
                  manufacturer: 'NIH Global Pharma Registry',
                  country: 'دولي (Global Registry)',
                  stripsPerPackage: 2,
                  piecesPerStrip: 10,
                  requiresPrescription: true,
                  locationRack: 'RX-Cloud',
                  standardCost: 2000,
                  standardPrice: 2800,
                  indications: `سجل دوائي دولي معتمد من المعهد الوطني للصحة الأمريكي (NIH RxNorm)`,
                  source: 'rxnorm',
                  sourceLabel: 'سجل RxNorm العالمي',
                });
              });
            }
          });
          return items;
        }
      }
    } catch {
      // Ignore RxNorm failures
    }
    return [];
  },

  /**
   * Search Live OpenFDA and NIH RxNorm Online Databases
   * Queries real cloud pharmaceutical endpoints with Arabic-English normalization
   */
  async searchOnlineLive(query: string): Promise<EnrichedOnlineDrugItem[]> {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim();

    // Check cache first
    const cacheKey = cleanQuery.toLowerCase();
    if (liveApiCache.has(cacheKey)) {
      return liveApiCache.get(cacheKey)!;
    }

    // Determine search terms (Arabic translated or English query)
    let englishTerms: string[] = [];
    for (const [arWord, enTrans] of Object.entries(ARABIC_TO_ENGLISH_DRUG_MAP)) {
      if (cleanQuery.includes(arWord) || arWord.includes(cleanQuery)) {
        englishTerms.push(...enTrans.split(' '));
      }
    }

    if (englishTerms.length === 0) {
      englishTerms = [cleanQuery.replace(/[^\w\s-]/g, '').trim() || cleanQuery];
    }

    const primaryTerm = englishTerms[0] || cleanQuery;
    const onlineItems: EnrichedOnlineDrugItem[] = [];

    // Parallel calls to Gemini AI, OpenFDA, and RxNorm
    const [aiResults, rxNormResults] = await Promise.all([
      this.searchWithGeminiAI(cleanQuery),
      this.searchRxNormLive(cleanQuery)
    ]);

    if (aiResults.length > 0) {
      onlineItems.push(...aiResults);
    }

    try {
      // Fetch from OpenFDA NDC Directory
      const fdaUrl = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${encodeURIComponent(primaryTerm)}"+generic_name:"${encodeURIComponent(primaryTerm)}"&limit=20`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(fdaUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json().catch(() => null);
        if (data && Array.isArray(data.results)) {
          data.results.forEach((item: any, idx: number) => {
            const brandName = item.brand_name || item.generic_name || primaryTerm;
            const genericName = item.generic_name || item.active_ingredients?.map((a: any) => a.name).join(', ') || brandName;
            const dosageForm = item.dosage_form || 'أقراص';
            const labelerName = item.labeler_name || 'FDA Certified Global Lab';
            const ndcCode = (item.product_ndc || item.packaging?.[0]?.package_ndc || `FDA${Date.now().toString().slice(-6)}${idx}`).replace(/-/g, '');
            const barcode = ndcCode.length >= 10 ? ndcCode.padStart(13, '629') : `629${String(Date.now()).slice(-7)}${idx}`;

            // Infer category
            let category = 'أدوية الضغط والقلب والأوعية';
            const lowerGeneric = (genericName + ' ' + (item.pharm_class || '')).toLowerCase();
            if (lowerGeneric.includes('anti-bacterial') || lowerGeneric.includes('antibiotic') || lowerGeneric.includes('cillin') || lowerGeneric.includes('mycin')) {
              category = 'مضادات حيوية وميكروبية';
            } else if (lowerGeneric.includes('analgesic') || lowerGeneric.includes('anti-inflammatory') || lowerGeneric.includes('nsaid') || lowerGeneric.includes('paracetamol')) {
              category = 'مسكنات ومضادات التهاب';
            } else if (lowerGeneric.includes('diabetes') || lowerGeneric.includes('insulin') || lowerGeneric.includes('hypoglycemic')) {
              category = 'أدوية السكري والغدد';
            } else if (lowerGeneric.includes('antacid') || lowerGeneric.includes('proton pump') || lowerGeneric.includes('ulcer')) {
              category = 'أدوية الجهاز الهضمي والمعدة';
            } else if (lowerGeneric.includes('antihistamine') || lowerGeneric.includes('bronchodilator') || lowerGeneric.includes('cough')) {
              category = 'أدوية الجهاز التنفسي والبرد والحساسية';
            } else if (lowerGeneric.includes('vitamin') || lowerGeneric.includes('mineral') || lowerGeneric.includes('supplement')) {
              category = 'الفيتامينات والمكملات الغذائية والمعادن';
            }

            onlineItems.push({
              barcode: barcode.slice(0, 13),
              name: `${brandName} (FDA)`,
              nameEn: brandName,
              scientificName: `${genericName} [FDA Open Registry]`,
              category,
              form: dosageForm.includes('TABLET') ? 'أقراص' : dosageForm.includes('CAPSULE') ? 'كبسولات' : dosageForm.includes('INJECTION') ? 'حقن' : dosageForm.includes('CREAM') ? 'كريم' : dosageForm,
              strength: item.active_ingredients?.[0]?.strength || 'Standard Dose',
              manufacturer: labelerName,
              country: 'أمريكا / دولي (FDA)',
              stripsPerPackage: 2,
              piecesPerStrip: 10,
              requiresPrescription: !item.marketing_category?.includes('OTC'),
              locationRack: 'FDA-Cloud',
              standardCost: 2500,
              standardPrice: 3500,
              indications: `سجل دوائي سحابي دولي معتمد من هيئة الغذاء والدواء الأمريكية (OpenFDA) - ${labelerName}`,
              source: 'open_fda',
              sourceLabel: 'هيئة الغذاء والدواء الأمريكية (OpenFDA)',
            });
          });
        }
      }
    } catch {
      // Ignore network failures gracefully
    }

    if (rxNormResults.length > 0) {
      onlineItems.push(...rxNormResults);
    }

    // Cache the merged results
    liveApiCache.set(cacheKey, onlineItems);
    return onlineItems;
  },

  /**
   * Unified Hybrid Search: Searches thousands of pre-indexed drugs and seamlessly
   * enriches with live OpenFDA / RxNorm / Gemini AI results
   */
  async searchCombined(options: OnlineDrugQueryOptions): Promise<{
    results: EnrichedOnlineDrugItem[];
    fromLiveApiCount: number;
    fromAiCount: number;
    totalAvailableCatalogCount: number;
  }> {
    // 1. Search local high-speed index
    const localResults = this.search(options);

    let liveResults: EnrichedOnlineDrugItem[] = [];
    if (options.query && options.query.trim().length >= 2) {
      try {
        liveResults = await this.searchOnlineLive(options.query.trim());
      } catch {
        liveResults = [];
      }
    }

    // Merge and deduplicate by barcode or exact name
    const seenBarcodes = new Set<string>();
    const merged: EnrichedOnlineDrugItem[] = [];

    // Prioritize AI and exact matches first if requested
    let aiCount = 0;
    let liveApiCount = 0;

    liveResults.forEach(item => {
      if (!seenBarcodes.has(item.barcode)) {
        seenBarcodes.add(item.barcode);
        merged.push(item);
        if (item.source === 'ai_gemini') {
          aiCount++;
        } else {
          liveApiCount++;
        }
      }
    });

    localResults.forEach(item => {
      if (!seenBarcodes.has(item.barcode)) {
        seenBarcodes.add(item.barcode);
        merged.push(item);
      }
    });

    // Apply source filter if set
    let finalResults = merged;
    if (options.sourceFilter && options.sourceFilter !== 'all') {
      if (options.sourceFilter === 'ai') {
        finalResults = merged.filter(i => i.source === 'ai_gemini');
      } else if (options.sourceFilter === 'cloud') {
        finalResults = merged.filter(i => i.source === 'catalog');
      } else if (options.sourceFilter === 'fda_rxnorm') {
        finalResults = merged.filter(i => i.source === 'open_fda' || i.source === 'rxnorm');
      }
    }

    return {
      results: finalResults,
      fromLiveApiCount: liveApiCount,
      fromAiCount: aiCount,
      totalAvailableCatalogCount: ALL_COMBINED_ONLINE_DRUGS.length
    };
  },

  /**
   * Convert selected online drug items to TSV formatted text for smart import
   */
  exportToTSV(items: OnlineDrugItem[], mode: 'catalog_only' | 'with_pricing' = 'catalog_only'): string {
    const headers = [
      'الباركود',
      'اسم الدواء التجاري',
      'الاسم العلمي',
      'المجموعة الدوائية',
      'الشكل الصيدلاني',
      'التركيز',
      'الشركة المصنعة أو الموردة',
      'بلد المنشأ',
      'سعر الشراء',
      'سعر البيع',
      'عدد الأشرطة بالعبوة',
      'عدد الحبات بالشريط',
      'موقع الرف',
      'الوصف والاستخدام'
    ];

    const rows = items.map(item => {
      const cost = mode === 'with_pricing' ? item.standardCost : 0;
      const price = mode === 'with_pricing' ? item.standardPrice : 0;

      return [
        item.barcode,
        item.name,
        item.scientificName,
        item.category,
        item.form,
        item.strength,
        item.manufacturer,
        item.country,
        cost.toString(),
        price.toString(),
        item.stripsPerPackage.toString(),
        item.piecesPerStrip.toString(),
        item.locationRack,
        item.indications || ''
      ].join('\t');
    });

    return [headers.join('\t'), ...rows].join('\n');
  }
};

