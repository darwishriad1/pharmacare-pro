import { OnlineDrugItem } from './onlineDrugDirectory';

export interface MedicalClassTemplate {
  category: string;
  genericName: string;
  genericNameAr: string;
  forms: {
    form: string;
    strength: string;
    strips: number;
    pieces: number;
    cost: number;
    price: number;
  }[];
  brands: {
    brandAr: string;
    brandEn: string;
    manufacturer: string;
    country: string;
    barcodePrefix: string;
  }[];
  indications: string;
  prescription: boolean;
}

export const DRUG_TEMPLATES: MedicalClassTemplate[] = [
  // 1. Amoxicillin & Combinations
  {
    category: 'مضادات حيوية وميكروبية',
    genericName: 'Amoxicillin + Clavulanic Acid',
    genericNameAr: 'أموكسيسيلين + حمض الكلافولانيك',
    forms: [
      { form: 'أقراص', strength: '1g (875/125mg)', strips: 2, pieces: 7, cost: 3200, price: 4200 },
      { form: 'أقراص', strength: '625mg (500/125mg)', strips: 2, pieces: 10, cost: 2400, price: 3200 },
      { form: 'أقراص', strength: '375mg', strips: 2, pieces: 10, cost: 1800, price: 2500 },
      { form: 'شراب معلق', strength: '457mg/5ml 70ml', strips: 1, pieces: 1, cost: 2200, price: 3000 },
      { form: 'شراب معلق', strength: '312mg/5ml 80ml', strips: 1, pieces: 1, cost: 1900, price: 2600 },
      { form: 'شراب معلق', strength: '156mg/5ml 100ml', strips: 1, pieces: 1, cost: 1500, price: 2100 },
      { form: 'شراب معلق ES', strength: '600mg/5ml 100ml', strips: 1, pieces: 1, cost: 2800, price: 3800 },
      { form: 'حقن فيال', strength: '1.2g IV Vial', strips: 1, pieces: 1, cost: 2600, price: 3500 },
    ],
    brands: [
      { brandAr: 'أوجمنتين', brandEn: 'Augmentin', manufacturer: 'GSK / جلاكسو سميث كلاين', country: 'بريطانيا', barcodePrefix: '6291102001' },
      { brandAr: 'كلافوكس', brandEn: 'Klavox', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102002' },
      { brandAr: 'جلمنتين', brandEn: 'Julmentin', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102003' },
      { brandAr: 'ميجا موكس', brandEn: 'Megamox', manufacturer: 'Hikma / الحكمة للأدوية', country: 'الأردن', barcodePrefix: '6291102004' },
      { brandAr: 'كيورام', brandEn: 'Curam', manufacturer: 'Sandoz / ساندوز', country: 'النمسا', barcodePrefix: '6291102005' },
      { brandAr: 'إيموكسكلاف', brandEn: 'E-Moxclav', manufacturer: 'EIPICO / إيبيكو', country: 'مصر', barcodePrefix: '6291102006' },
      { brandAr: 'هاي بيوتك', brandEn: 'Hibiotic', manufacturer: 'Amoun / آمون للأدوية', country: 'مصر', barcodePrefix: '6291102007' },
      { brandAr: 'أفاموكس كلاف', brandEn: 'Avamox Clav', manufacturer: 'Tabuk / تبوك للصناعات الدوائية', country: 'السعودية', barcodePrefix: '6291102008' },
    ],
    indications: 'مضاد حيوي واسع المجال لالتهابات الصدر والجيوب والمسالك واللوزتين والأذن',
    prescription: true
  },

  // 2. Azithromycin
  {
    category: 'مضادات حيوية وميكروبية',
    genericName: 'Azithromycin',
    genericNameAr: 'أزيثروميسين',
    forms: [
      { form: 'كبسولات', strength: '500mg (3 capsules)', strips: 1, pieces: 3, cost: 2000, price: 2800 },
      { form: 'كبسولات', strength: '250mg (6 capsules)', strips: 1, pieces: 6, cost: 2200, price: 3000 },
      { form: 'شراب معلق', strength: '200mg/5ml 15ml', strips: 1, pieces: 1, cost: 1800, price: 2500 },
      { form: 'شراب معلق', strength: '200mg/5ml 30ml', strips: 1, pieces: 1, cost: 2500, price: 3400 },
      { form: 'حقن وريدية', strength: '500mg IV Infusion', strips: 1, pieces: 1, cost: 3500, price: 4800 },
    ],
    brands: [
      { brandAr: 'زيثروماكس', brandEn: 'Zithromax', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102011' },
      { brandAr: 'أزيماك', brandEn: 'Azimax', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102012' },
      { brandAr: 'زيثرون', brandEn: 'Zithrone', manufacturer: 'Amoun / آمون للأدوية', country: 'مصر', barcodePrefix: '6291102013' },
      { brandAr: 'أزوميسين', brandEn: 'Azomycin', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102014' },
      { brandAr: 'زوسين', brandEn: 'Zocin', manufacturer: 'Hikma / الحكمة للأدوية', country: 'الأردن', barcodePrefix: '6291102015' },
    ],
    indications: 'علاج التهابات الجهاز التنفسي والجلد والأنسجة الرخوة والأمراض المنقولة',
    prescription: true
  },

  // 3. Ciprofloxacin & Levofloxacin (Fluoroquinolones)
  {
    category: 'مضادات حيوية وميكروبية',
    genericName: 'Ciprofloxacin / Levofloxacin',
    genericNameAr: 'سيبروفلوكساسين / ليفوفلوكساسين',
    forms: [
      { form: 'أقراص', strength: '500mg', strips: 1, pieces: 10, cost: 2200, price: 3000 },
      { form: 'أقراص', strength: '750mg', strips: 1, pieces: 10, cost: 3000, price: 4100 },
      { form: 'أقراص', strength: '250mg', strips: 1, pieces: 10, cost: 1500, price: 2100 },
      { form: 'قطرة عين وأذن', strength: '0.3% Drops', strips: 1, pieces: 1, cost: 1100, price: 1600 },
      { form: 'محلول تسريب وريدي', strength: '200mg/100ml IV', strips: 1, pieces: 1, cost: 2500, price: 3400 },
    ],
    brands: [
      { brandAr: 'سيبروكسين', brandEn: 'Ciproxin', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102021' },
      { brandAr: 'سيبروفلوكس', brandEn: 'Ciproflox', manufacturer: 'Tabuk / تبوك للصناعات الدوائية', country: 'السعودية', barcodePrefix: '6291102022' },
      { brandAr: 'تافانيك 500', brandEn: 'Tavanic 500', manufacturer: 'Sanofi / سانوفي', country: 'فرنسا', barcodePrefix: '6291102023' },
      { brandAr: 'ليفوكسين', brandEn: 'Levoxin', manufacturer: 'Hikma / الحكمة للأدوية', country: 'الأردن', barcodePrefix: '6291102024' },
      { brandAr: 'سيفلوكس', brandEn: 'Ciflox', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102025' },
    ],
    indications: 'علاج التهابات المسالك البولية الحادة والبروستاتا والتهابات الرئة المزمنة',
    prescription: true
  },

  // 4. Ceftriaxone & Cefixime (Cephalosporins)
  {
    category: 'مضادات حيوية وميكروبية',
    genericName: 'Ceftriaxone / Cefixime',
    genericNameAr: 'سيفترياكسون / سيفكسيم (سيفالوسبورين)',
    forms: [
      { form: 'حقن فيال', strength: '1g IV/IM Vial', strips: 1, pieces: 1, cost: 3200, price: 4400 },
      { form: 'حقن فيال', strength: '500mg IV/IM', strips: 1, pieces: 1, cost: 2200, price: 3000 },
      { form: 'حقن فيال للأطفال', strength: '250mg IM', strips: 1, pieces: 1, cost: 1600, price: 2300 },
      { form: 'كبسولات', strength: '400mg (5 caps)', strips: 1, pieces: 5, cost: 2800, price: 3800 },
      { form: 'شراب معلق للأطفال', strength: '100mg/5ml 60ml', strips: 1, pieces: 1, cost: 2400, price: 3300 },
    ],
    brands: [
      { brandAr: 'روسيفين', brandEn: 'Rocephin', manufacturer: 'Roche / روش', country: 'سويسرا', barcodePrefix: '6291102031' },
      { brandAr: 'سيفاكسون', brandEn: 'Cefaxone', manufacturer: 'EIPICO / إيبيكو', country: 'مصر', barcodePrefix: '6291102032' },
      { brandAr: 'سوبراكس', brandEn: 'Suprax', manufacturer: 'Hikma / الحكمة للأدوية', country: 'الأردن', barcodePrefix: '6291102033' },
      { brandAr: 'وينكس', brandEn: 'Winex', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102034' },
      { brandAr: 'ترياكسون', brandEn: 'Triaxone', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102035' },
    ],
    indications: 'سيفالوسبورينات الجيل الثالث للعدوى البكتيرية الشديدة والنزلات والتسمم',
    prescription: true
  },

  // 5. Paracetamol Analgesics & Combinations
  {
    category: 'مسكنات ومضادات التهاب',
    genericName: 'Paracetamol & Combinations',
    genericNameAr: 'باراسيتامول ومسكنات التركيبات',
    forms: [
      { form: 'أقراص', strength: '500mg (24 Tab)', strips: 2, pieces: 12, cost: 800, price: 1100 },
      { form: 'أقراص إكسترا', strength: '500/65mg Caffeine (24 Tab)', strips: 2, pieces: 12, cost: 1100, price: 1500 },
      { form: 'أقراص جوينت للمفاصل', strength: '665mg Extended (24 Tab)', strips: 3, pieces: 8, cost: 2200, price: 3000 },
      { form: 'أقراص نايت للنوم', strength: '500/25mg Diphenhydramine', strips: 2, pieces: 10, cost: 1600, price: 2300 },
      { form: 'شراب أطفال', strength: '120mg/5ml 100ml', strips: 1, pieces: 1, cost: 700, price: 1000 },
      { form: 'شراب أطفال فورت', strength: '250mg/5ml 100ml', strips: 1, pieces: 1, cost: 1100, price: 1600 },
      { form: 'تحاميل أطفال', strength: '125mg (10 supp)', strips: 2, pieces: 5, cost: 900, price: 1300 },
      { form: 'تحاميل أطفال', strength: '250mg (10 supp)', strips: 2, pieces: 5, cost: 1100, price: 1500 },
      { form: 'محلول تسريب وريدي', strength: '1000mg/100ml IV', strips: 1, pieces: 1, cost: 1900, price: 2700 },
      { form: 'أكياس فوار ساخن للبرد', strength: 'Hot Lemon Sachet', strips: 1, pieces: 10, cost: 2400, price: 3300 },
    ],
    brands: [
      { brandAr: 'بنادول', brandEn: 'Panadol', manufacturer: 'GSK / جلاكسو سميث كلاين', country: 'بريطانيا', barcodePrefix: '6291102041' },
      { brandAr: 'فيفادول', brandEn: 'Fevadol', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102042' },
      { brandAr: 'أدول', brandEn: 'Adol', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102043' },
      { brandAr: 'ريفانين', brandEn: 'Revanin', manufacturer: 'Hikma / الحكمة للأدوية', country: 'الأردن', barcodePrefix: '6291102044' },
      { brandAr: 'سيتال', brandEn: 'Cetal', manufacturer: 'EIPICO / إيبيكو', country: 'مصر', barcodePrefix: '6291102045' },
      { brandAr: 'بارامول', brandEn: 'Paramol', manufacturer: 'Misr Pharma / مصر للأدوية', country: 'مصر', barcodePrefix: '6291102046' },
      { brandAr: 'بيرفالجان حقن', brandEn: 'Perfalgan IV', manufacturer: 'Bristol-Myers Squibb', country: 'فرنسا', barcodePrefix: '6291102047' },
    ],
    indications: 'مسكن آمن للآلام والصداع وخافض فعال للحرارة وحمى الأطفال',
    prescription: false
  },

  // 6. NSAIDs (Ibuprofen, Diclofenac, Naproxen, Ketoprofen)
  {
    category: 'مسكنات ومضادات التهاب',
    genericName: 'NSAIDs (Diclofenac / Ibuprofen / Ketoprofen / Celecoxib)',
    genericNameAr: 'مضادات الالتهاب غير الستيرويدية والمسكنات القوية',
    forms: [
      { form: 'أقراص', strength: '400mg (30 Tab)', strips: 3, pieces: 10, cost: 1200, price: 1700 },
      { form: 'أقراص', strength: '600mg (30 Tab)', strips: 3, pieces: 10, cost: 1600, price: 2200 },
      { form: 'أقراص سريعة', strength: '50mg Rapid', strips: 2, pieces: 10, cost: 1800, price: 2500 },
      { form: 'أقراص ممتدة ريتارد', strength: '100mg SR', strips: 2, pieces: 10, cost: 2400, price: 3300 },
      { form: 'كبسولات', strength: '200mg COX-2', strips: 1, pieces: 10, cost: 4200, price: 5600 },
      { form: 'أمبولات حقن عضلية', strength: '75mg/3ml (5 Amp)', strips: 1, pieces: 5, cost: 2200, price: 3100 },
      { form: 'جل موضعي', strength: '1.16% Emulgel 50g', strips: 1, pieces: 1, cost: 1900, price: 2600 },
      { form: 'شراب أطفال مسكن', strength: '100mg/5ml 100ml', strips: 1, pieces: 1, cost: 1100, price: 1600 },
      { form: 'تحاميل مسكنة', strength: '100mg (10 supp)', strips: 2, pieces: 5, cost: 1400, price: 2000 },
    ],
    brands: [
      { brandAr: 'فولتارين', brandEn: 'Voltaren', manufacturer: 'Novartis / نوفارتس', country: 'سويسرا', barcodePrefix: '6291102051' },
      { brandAr: 'بروفين', brandEn: 'Brufen', manufacturer: 'Abbott / أبوت', country: 'أمريكا', barcodePrefix: '6291102052' },
      { brandAr: 'كتافلام', brandEn: 'Cataflam', manufacturer: 'Novartis / نوفارتس', country: 'سويسرا', barcodePrefix: '6291102053' },
      { brandAr: 'سيليبريكس', brandEn: 'Celebrex', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102054' },
      { brandAr: 'كيتوفان', brandEn: 'Ketofan', manufacturer: 'Amoun / آمون للأدوية', country: 'مصر', barcodePrefix: '6291102055' },
      { brandAr: 'ديكلوماكس', brandEn: 'Diclomax', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102056' },
      { brandAr: 'سابوفين', brandEn: 'Sapofen', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102057' },
      { brandAr: 'أركوكسيا', brandEn: 'Arcoxia 90mg', manufacturer: 'MSD / ميرك شارب', country: 'أمريكا', barcodePrefix: '6291102058' },
    ],
    indications: 'تسكين آلام المفاصل والروماتيزم وآلام الأسنان والمغص والالتواءات',
    prescription: false
  },

  // 7. Hypertension (Beta Blockers, ACE, ARBs, CCBs)
  {
    category: 'أدوية الضغط والقلب والأوعية',
    genericName: 'Bisoprolol / Amlodipine / Losartan / Valsartan / Telmisartan',
    genericNameAr: 'أدوية علاج ارتفاع ضغط الدم والقلب',
    forms: [
      { form: 'أقراص', strength: '2.5mg (30 Tab)', strips: 3, pieces: 10, cost: 2600, price: 3500 },
      { form: 'أقراص', strength: '5mg (30 Tab)', strips: 3, pieces: 10, cost: 3100, price: 4200 },
      { form: 'أقراص', strength: '10mg (30 Tab)', strips: 3, pieces: 10, cost: 4200, price: 5700 },
      { form: 'أقراص بلس مع مدر', strength: '5/12.5mg Plus', strips: 3, pieces: 10, cost: 3800, price: 5100 },
      { form: 'أقراص', strength: '50mg (28 Tab)', strips: 2, pieces: 14, cost: 3800, price: 5100 },
      { form: 'أقراص', strength: '80mg (28 Tab)', strips: 2, pieces: 14, cost: 4500, price: 6100 },
      { form: 'أقراص', strength: '160mg (28 Tab)', strips: 2, pieces: 14, cost: 5800, price: 7800 },
      { form: 'أقراص مركبة ثنائية', strength: '5/80mg Co-Diovan', strips: 2, pieces: 14, cost: 6500, price: 8700 },
    ],
    brands: [
      { brandAr: 'كونكور', brandEn: 'Concor', manufacturer: 'Merck / ميرك', country: 'ألمانيا', barcodePrefix: '6291102061' },
      { brandAr: 'نورفاسك', brandEn: 'Norvasc', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102062' },
      { brandAr: 'كوزار', brandEn: 'Cozaar', manufacturer: 'MSD / ميرك شارب', country: 'أمريكا', barcodePrefix: '6291102063' },
      { brandAr: 'ديوفان', brandEn: 'Diovan', manufacturer: 'Novartis / نوفارتس', country: 'سويسرا', barcodePrefix: '6291102064' },
      { brandAr: 'ميكارديس', brandEn: 'Micardis 80mg', manufacturer: 'Boehringer Ingelheim / بوهرنجر', country: 'ألمانيا', barcodePrefix: '6291102065' },
      { brandAr: 'إكسبورج', brandEn: 'Exforge 5/160', manufacturer: 'Novartis / نوفارتس', country: 'سويسرا', barcodePrefix: '6291102066' },
      { brandAr: 'ناتريلوكس', brandEn: 'Natrilix SR', manufacturer: 'Servier / سيرفييه', country: 'فرنسا', barcodePrefix: '6291102067' },
      { brandAr: 'بيسوكارد', brandEn: 'Bisocard', manufacturer: 'Tabuk / تبوك للصناعات الدوائية', country: 'السعودية', barcodePrefix: '6291102068' },
    ],
    indications: 'تنظيم ضغط الدم الشرياني وحماية عضلة القلب والشرايين والكلى',
    prescription: true
  },

  // 8. Lipid Lowering (Statins) & Anticoagulants
  {
    category: 'أدوية الضغط والقلب والأوعية',
    genericName: 'Atorvastatin / Rosuvastatin / Clopidogrel',
    genericNameAr: 'أدوية الدهون والكولسترول ومسيلات الدم والجلطات',
    forms: [
      { form: 'أقراص', strength: '10mg (30 Tab)', strips: 3, pieces: 10, cost: 3800, price: 5100 },
      { form: 'أقراص', strength: '20mg (30 Tab)', strips: 3, pieces: 10, cost: 5200, price: 7000 },
      { form: 'أقراص', strength: '40mg (30 Tab)', strips: 3, pieces: 10, cost: 6800, price: 9200 },
      { form: 'أقراص', strength: '75mg Clopidogrel (28 Tab)', strips: 2, pieces: 14, cost: 6000, price: 8000 },
      { form: 'أقراص مغلفة للمعدة', strength: '81mg / 100mg Protect', strips: 3, pieces: 10, cost: 1100, price: 1500 },
      { form: 'أقراص مانعة للتجلط', strength: '10mg / 20mg Xarelto', strips: 2, pieces: 14, cost: 14000, price: 18500 },
    ],
    brands: [
      { brandAr: 'ليبيتور', brandEn: 'Lipitor', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102071' },
      { brandAr: 'كريستور', brandEn: 'Crestor', manufacturer: 'AstraZeneca / أسترازينيكا', country: 'بريطانيا', barcodePrefix: '6291102072' },
      { brandAr: 'أتورفا', brandEn: 'Atorva', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102073' },
      { brandAr: 'روستار', brandEn: 'Rostar', manufacturer: 'Hikma / الحكمة للأدوية', country: 'الأردن', barcodePrefix: '6291102074' },
      { brandAr: 'بلافيكس', brandEn: 'Plavix', manufacturer: 'Sanofi / سانوفي', country: 'فرنسا', barcodePrefix: '6291102075' },
      { brandAr: 'كلوكس', brandEn: 'Clox', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102076' },
      { brandAr: 'أسبرين بروتكت', brandEn: 'Aspirin Protect', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102077' },
      { brandAr: 'زاريلتو', brandEn: 'Xarelto', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102078' },
    ],
    indications: 'خفض الكوليسترول الضار والدهون الثلاثية والوقاية من الجلطات وتصلب الشرايين',
    prescription: true
  },

  // 9. Diabetes (Metformin, Glimepiride, Gliptins, SGLT2, Insulin)
  {
    category: 'أدوية السكري والغدد',
    genericName: 'Metformin / Glimepiride / Sitagliptin / Dapagliflozin / Insulin',
    genericNameAr: 'أدوية السكري ومنظمات السكر والإنسولينات',
    forms: [
      { form: 'أقراص', strength: '500mg (50 Tab)', strips: 5, pieces: 10, cost: 1500, price: 2000 },
      { form: 'أقراص', strength: '850mg (30 Tab)', strips: 3, pieces: 10, cost: 1800, price: 2400 },
      { form: 'أقراص ممتدة XR', strength: '1000mg XR (30 Tab)', strips: 3, pieces: 10, cost: 2800, price: 3800 },
      { form: 'أقراص', strength: '2mg (30 Tab)', strips: 3, pieces: 10, cost: 2500, price: 3400 },
      { form: 'أقراص', strength: '4mg (30 Tab)', strips: 3, pieces: 10, cost: 3500, price: 4800 },
      { form: 'أقراص دي بي بي 4', strength: '100mg (28 Tab)', strips: 2, pieces: 14, cost: 9500, price: 12500 },
      { form: 'أقراص كلوية متطورة', strength: '10mg (28 Tab)', strips: 2, pieces: 14, cost: 11000, price: 14500 },
      { form: 'أقراص مركبة ثنائية', strength: '50/1000mg Janumet', strips: 4, pieces: 14, cost: 12500, price: 16500 },
      { form: 'أقلام حقن إنسولين 24 س', strength: '100 U/ml (5 Pens)', strips: 1, pieces: 5, cost: 16000, price: 21000 },
      { form: 'أقلام إنسولين وجبات سريع', strength: '100 U/ml FlexPen (5 Pens)', strips: 1, pieces: 5, cost: 15500, price: 20500 },
    ],
    brands: [
      { brandAr: 'جلوكوفاج', brandEn: 'Glucophage', manufacturer: 'Merck / ميرك', country: 'فرنسا', barcodePrefix: '6291102081' },
      { brandAr: 'سيدوفاج', brandEn: 'Cidophage', manufacturer: 'CID / شركة تنمية الصناعات الكيماوية', country: 'مصر', barcodePrefix: '6291102082' },
      { brandAr: 'أماريل', brandEn: 'Amaryl', manufacturer: 'Sanofi / سانوفي', country: 'ألمانيا', barcodePrefix: '6291102083' },
      { brandAr: 'جانوفيا', brandEn: 'Januvia', manufacturer: 'MSD / ميرك شارب', country: 'أمريكا', barcodePrefix: '6291102084' },
      { brandAr: 'جانوميت', brandEn: 'Janumet', manufacturer: 'MSD / ميرك شارب', country: 'أمريكا', barcodePrefix: '6291102085' },
      { brandAr: 'فورسيجا', brandEn: 'Forxiga', manufacturer: 'AstraZeneca / أسترازينيكا', country: 'بريطانيا', barcodePrefix: '6291102086' },
      { brandAr: 'جاردينس', brandEn: 'Jardiance 10/25mg', manufacturer: 'Boehringer Ingelheim / بوهرنجر', country: 'ألمانيا', barcodePrefix: '6291102087' },
      { brandAr: 'إنسولين لانتوس', brandEn: 'Lantus SoloStar', manufacturer: 'Sanofi / سانوفي', country: 'ألمانيا', barcodePrefix: '6291102088' },
      { brandAr: 'نوفورابيد / ميكستارد', brandEn: 'NovoRapid / Mixtard', manufacturer: 'Novo Nordisk / نوفو نورديسك', country: 'الدنمارك', barcodePrefix: '6291102089' },
    ],
    indications: 'علاج مرض السكري وضبط السكر التراكمي وتكيس المبايض وحماية الكلى والقلب',
    prescription: true
  },

  // 10. Gastrointestinal (PPIs, Antacids, Antispasmodics)
  {
    category: 'أدوية الجهاز الهضمي والمعدة',
    genericName: 'Esomeprazole / Pantoprazole / Omeprazole / Mebeverine',
    genericNameAr: 'أدوية قرحة المعدة والارتجاع والقولون العصبي',
    forms: [
      { form: 'أقراص', strength: '20mg (28 Tab)', strips: 2, pieces: 14, cost: 5200, price: 7000 },
      { form: 'أقراص', strength: '40mg (28 Tab)', strips: 2, pieces: 14, cost: 6500, price: 8800 },
      { form: 'كبسولات', strength: '20mg (20 Caps)', strips: 2, pieces: 10, cost: 1400, price: 1900 },
      { form: 'كبسولات ريتارد للقولون', strength: '200mg Retard (30 Caps)', strips: 3, pieces: 10, cost: 3800, price: 5100 },
      { form: 'أقراص للانتفاخ والهضم', strength: 'Compound Digestin', strips: 3, pieces: 10, cost: 1100, price: 1500 },
      { form: 'شراب للحموضة والارتجاع', strength: 'Original Liquid 200ml', strips: 1, pieces: 1, cost: 2400, price: 3200 },
      { form: 'شراب ملين', strength: 'Lactulose 200ml', strips: 1, pieces: 1, cost: 2100, price: 2900 },
      { form: 'حقن فيال وريدية', strength: '40mg IV Vial', strips: 1, pieces: 1, cost: 3200, price: 4400 },
    ],
    brands: [
      { brandAr: 'نيكسيوم', brandEn: 'Nexium', manufacturer: 'AstraZeneca / أسترازينيكا', country: 'السويد', barcodePrefix: '6291102091' },
      { brandAr: 'كونترولوك', brandEn: 'Controloc', manufacturer: 'Takeda / تاكيدا', country: 'ألمانيا', barcodePrefix: '6291102092' },
      { brandAr: 'أوميز', brandEn: 'Omez', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102093' },
      { brandAr: 'دوسباتالين ريتارد', brandEn: 'Duspatalin Retard', manufacturer: 'Abbott / أبوت', country: 'هولندا', barcodePrefix: '6291102094' },
      { brandAr: 'جافيسكون شراب', brandEn: 'Gaviscon Liquid', manufacturer: 'Reckitt Benckiser', country: 'بريطانيا', barcodePrefix: '6291102095' },
      { brandAr: 'دوفالاك', brandEn: 'Duphalac', manufacturer: 'Abbott / أبوت', country: 'هولندا', barcodePrefix: '6291102096' },
      { brandAr: 'موتيليوم', brandEn: 'Motilium', manufacturer: 'Janssen / يانسن', country: 'بلجيكا', barcodePrefix: '6291102097' },
      { brandAr: 'كولوفاك', brandEn: 'Colofac', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102098' },
    ],
    indications: 'علاج قرحة المعدة وارتجاع المريء والحرقة والقولون العصبي وعسر الهضم',
    prescription: false
  },

  // 11. Respiratory & Antihistamines
  {
    category: 'أدوية الجهاز التنفسي والبرد والحساسية',
    genericName: 'Salbutamol / Fluticasone / Loratadine / Desloratadine / Cetirizine',
    genericNameAr: 'موسعات الشعب وبخاخات الربو ومضادات الحساسية والبرد',
    forms: [
      { form: 'بخاخ ربو فوري', strength: '100mcg (200 Doses)', strips: 1, pieces: 1, cost: 2800, price: 3800 },
      { form: 'بخاخ توربوهيلر وقائي', strength: '160/4.5mcg (120 Doses)', strips: 1, pieces: 1, cost: 14000, price: 18500 },
      { form: 'بخاخ ديسكوس كورتيزون', strength: '250mcg Seretide', strips: 1, pieces: 1, cost: 12000, price: 16000 },
      { form: 'بخاخ أنف للجيوب', strength: '50mcg Flixonase', strips: 1, pieces: 1, cost: 3500, price: 4800 },
      { form: 'أقراص حساسية لا تسبب نعاس', strength: '10mg (20 Tab)', strips: 2, pieces: 10, cost: 2200, price: 3000 },
      { form: 'أقراص حساسية متطورة', strength: '5mg (20 Tab)', strips: 2, pieces: 10, cost: 2900, price: 3900 },
      { form: 'شراب كحة طبيعي', strength: 'Ivy Leaf Extract 100ml', strips: 1, pieces: 1, cost: 2600, price: 3500 },
      { form: 'شراب موسع وطارد بلغم', strength: 'Expectorant 120ml', strips: 1, pieces: 1, cost: 1200, price: 1700 },
    ],
    brands: [
      { brandAr: 'فينتولين بخاخ', brandEn: 'Ventolin Evohaler', manufacturer: 'GSK / جلاكسو سميث كلاين', country: 'بريطانيا', barcodePrefix: '6291102101' },
      { brandAr: 'سيمبيكورت', brandEn: 'Symbicort Turbuhaler', manufacturer: 'AstraZeneca / أسترازينيكا', country: 'السويد', barcodePrefix: '6291102102' },
      { brandAr: 'سيريتايد ديسكوس', brandEn: 'Seretide Diskus', manufacturer: 'GSK / جلاكسو سميث كلاين', country: 'بريطانيا', barcodePrefix: '6291102103' },
      { brandAr: 'كلاريتين', brandEn: 'Claritin', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102104' },
      { brandAr: 'إريوس', brandEn: 'Aerius', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102105' },
      { brandAr: 'زيرتك', brandEn: 'Zyrtec', manufacturer: 'UCB Pharma / يو سي بي', country: 'بلجيكا', barcodePrefix: '6291102106' },
      { brandAr: 'بروسبان شراب', brandEn: 'Prospan Syrup', manufacturer: 'Engelhard / إنجلهارد', country: 'ألمانيا', barcodePrefix: '6291102107' },
      { brandAr: 'أوترفين بخاخ', brandEn: 'Otrivin Spray 0.1%', manufacturer: 'Haleon / GSK', country: 'سويسرا', barcodePrefix: '6291102108' },
    ],
    indications: 'علاج الربو وضيق التنفس والتهاب الجيوب الأنفية والسعال والحساسية الموسمية',
    prescription: false
  },

  // 12. Vitamins, Minerals & Supplements
  {
    category: 'الفيتامينات والمكملات الغذائية والمعادن',
    genericName: 'Vitamin D3 / B-Complex / Iron / Calcium / Omega-3 / Vitamin C',
    genericNameAr: 'الفيتامينات والمعادن والمكملات الغذائية',
    forms: [
      { form: 'كبسولات أسبوعية', strength: '50,000 IU (8 Caps)', strips: 2, pieces: 4, cost: 3600, price: 4900 },
      { form: 'أقراص يومية', strength: 'B-Complex Forte (30 Tab)', strips: 3, pieces: 10, cost: 2200, price: 3000 },
      { form: 'حقن عضلية للأعصاب', strength: 'B12 Ampoules (3 Amp)', strips: 1, pieces: 3, cost: 1800, price: 2500 },
      { form: 'كبسولات حديد لطيفة', strength: 'Iron + Zinc + Folic (30 Caps)', strips: 2, pieces: 15, cost: 3400, price: 4700 },
      { form: 'كبسولات زيت السمك', strength: '1000mg Omega-3 (30 Caps)', strips: 3, pieces: 10, cost: 2500, price: 3500 },
      { form: 'أقراص فوارة مناعة', strength: '1000mg Vit C (20 Tab)', strips: 1, pieces: 20, cost: 1900, price: 2700 },
      { form: 'أقراص مالتي فيتامين متكامل', strength: 'Adults with Lutein (30 Tab)', strips: 1, pieces: 30, cost: 4500, price: 6200 },
      { form: 'كبسولات كالسيوم مخلبي', strength: 'Calcium + Vit D3 (20 Caps)', strips: 2, pieces: 10, cost: 2300, price: 3200 },
    ],
    brands: [
      { brandAr: 'نيوروبيون', brandEn: 'Neurobion', manufacturer: 'Merck / ميرك', country: 'ألمانيا', barcodePrefix: '6291102111' },
      { brandAr: 'سنتروم', brandEn: 'Centrum', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102112' },
      { brandAr: 'فيروجلوبين', brandEn: 'Feroglobin B12', manufacturer: 'Vitabiotics / فيتابيوتكس', country: 'بريطانيا', barcodePrefix: '6291102113' },
      { brandAr: 'أوسوفورتين د3', brandEn: 'Ossofortin D3', manufacturer: 'EIPICO / إيبيكو', country: 'مصر', barcodePrefix: '6291102114' },
      { brandAr: 'كالترات مع فيتامين د', brandEn: 'Caltrate + D3', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102115' },
      { brandAr: 'ريدوكسون فوار', brandEn: 'Redoxon Effervescent', manufacturer: 'Bayer / باير', country: 'سويسرا', barcodePrefix: '6291102116' },
      { brandAr: 'أوميجا 3 بلس', brandEn: 'Omega 3 Plus', manufacturer: 'Sedico / سيديكو', country: 'مصر', barcodePrefix: '6291102117' },
      { brandAr: 'رويال جيلي', brandEn: 'Royal Jelly 1000mg', manufacturer: 'Marnys / مارنيز', country: 'إسبانيا', barcodePrefix: '6291102118' },
    ],
    indications: 'علاج نقص الفيتامينات والأنيميا وتقوية المناعة والأعصاب ودعم الطاقة والنشاط',
    prescription: false
  },

  // 13. Dermatology, Ointments & Antiseptics
  {
    category: 'أدوية الجلدية والمطهرات والمراهم',
    genericName: 'Mupirocin / Fusidic Acid / Betamethasone / Dexpanthenol / Clotrimazole',
    genericNameAr: 'المراهم والمضادات الجلدية ومطهرات الجروح والفطريات',
    forms: [
      { form: 'كريم مضاد حيوي', strength: '2% Cream 15g', strips: 1, pieces: 1, cost: 1400, price: 1900 },
      { form: 'مرهم مضاد حيوي دهني', strength: '2% Ointment 20g', strips: 1, pieces: 1, cost: 1600, price: 2200 },
      { form: 'كريم كورتيزون ومضاد', strength: 'Betamethasone + Fucidic 15g', strips: 1, pieces: 1, cost: 1700, price: 2400 },
      { form: 'مرهم مرمم للجروح والحروق', strength: 'MEBO Herbal 30g', strips: 1, pieces: 1, cost: 2800, price: 3800 },
      { form: 'كريم ملطف ومرمم', strength: 'Bepanthen Plus 30g', strips: 1, pieces: 1, cost: 2100, price: 2900 },
      { form: 'كريم مضاد للفطريات', strength: 'Clotrimazole 1% 20g', strips: 1, pieces: 1, cost: 1100, price: 1600 },
      { form: 'محلول مطهر جراحي', strength: 'Povidone Iodine 10% 120ml', strips: 1, pieces: 1, cost: 900, price: 1300 },
    ],
    brands: [
      { brandAr: 'فيوسيدين', brandEn: 'Fucidin', manufacturer: 'Leo Pharma / ليو فارما', country: 'الدنمارك', barcodePrefix: '6291102121' },
      { brandAr: 'بيبانثين', brandEn: 'Bepanthen', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102122' },
      { brandAr: 'ميبو لعلاج الحروق', brandEn: 'MEBO Burn Ointment', manufacturer: 'Julphar / جلفار الخليج', country: 'الإمارات', barcodePrefix: '6291102123' },
      { brandAr: 'فيوسيكورت', brandEn: 'Fucicort Cream', manufacturer: 'Leo Pharma / ليو فارما', country: 'الدنمارك', barcodePrefix: '6291102124' },
      { brandAr: 'كاندستان', brandEn: 'Canesten Cream', manufacturer: 'Bayer / باير', country: 'ألمانيا', barcodePrefix: '6291102125' },
      { brandAr: 'بيتافال', brandEn: 'Betaval Cream', manufacturer: 'Tabuk / تبوك للصناعات الدوائية', country: 'السعودية', barcodePrefix: '6291102126' },
      { brandAr: 'بيتادين مطهر', brandEn: 'Betadine Antiseptic', manufacturer: 'Mundipharma / مونديفارما', country: 'سويسرا', barcodePrefix: '6291102127' },
    ],
    indications: 'علاج التهابات الجلد البكتيرية والفطرية والحروق والجروح وترميم البشرة',
    prescription: false
  },

  // 14. Emergency, IV Fluids & Injections
  {
    category: 'المحاليل الوريدية وأدوية الطوارئ',
    genericName: 'Normal Saline / Ringer / Dextrose / Hydrocortisone / Dexamethasone / Atropine',
    genericNameAr: 'المحاليل الوريدية وأدوية الإنعاش والطوارئ',
    forms: [
      { form: 'محلول وريدي', strength: '0.9% Normal Saline 500ml', strips: 1, pieces: 1, cost: 700, price: 1000 },
      { form: 'محلول رينجر لاكتات', strength: 'Ringer Lactate 500ml', strips: 1, pieces: 1, cost: 800, price: 1100 },
      { form: 'محلول جلوكوز مغذي', strength: 'Dextrose 5% 500ml', strips: 1, pieces: 1, cost: 750, price: 1050 },
      { form: 'محلول جلوكوز ملحي', strength: 'Dextrose Saline 500ml', strips: 1, pieces: 1, cost: 800, price: 1100 },
      { form: 'أمبولات كورتيزون طوارئ', strength: '100mg Hydrocortisone Vial', strips: 1, pieces: 1, cost: 1500, price: 2100 },
      { form: 'أمبولات ديكساميثازون', strength: '8mg/2ml (5 Amp)', strips: 1, pieces: 5, cost: 1800, price: 2500 },
      { form: 'أمبولات إنعاش أتروبين', strength: '1mg/1ml (10 Amp)', strips: 1, pieces: 10, cost: 1200, price: 1700 },
      { form: 'أمبولات أدرينالين طوارئ', strength: '1mg/ml Epinephrine', strips: 1, pieces: 10, cost: 2000, price: 2800 },
    ],
    brands: [
      { brandAr: 'محاليل الفتح الوريدية', brandEn: 'Al-Fath IV Solutions', manufacturer: 'Otsuka / أوتسوكا للمحاليل', country: 'اليابان/مصر', barcodePrefix: '6291102131' },
      { brandAr: 'محاليل بي براون الألمانية', brandEn: 'B. Braun Melsungen', manufacturer: 'B. Braun / بي براون', country: 'ألمانيا', barcodePrefix: '6291102132' },
      { brandAr: 'سوليو كورتيف', brandEn: 'Solu-Cortef 100mg', manufacturer: 'Pfizer / فايزر', country: 'أمريكا', barcodePrefix: '6291102133' },
      { brandAr: 'ديكساميثازون إيبيكو', brandEn: 'Dexamethasone EIPICO', manufacturer: 'EIPICO / إيبيكو', country: 'مصر', barcodePrefix: '6291102134' },
      { brandAr: 'محاليل الشركة الدوائية', brandEn: 'SPIMACO Infusions', manufacturer: 'SPIMACO / سبيماكو الدوائية', country: 'السعودية', barcodePrefix: '6291102135' },
    ],
    indications: 'تعويض السوائل والأملاح والإنعاش الطارئ في حالات الجفاف والصدمة والحوادث',
    prescription: true
  }
];

/**
 * Generate thousands of structured drugs spanning combinations, strengths, forms, and manufacturers
 */
export function buildExpandedDrugCatalog(): OnlineDrugItem[] {
  const items: OnlineDrugItem[] = [];
  let counter = 10000;

  DRUG_TEMPLATES.forEach((tmpl) => {
    tmpl.brands.forEach((brand, bIndex) => {
      tmpl.forms.forEach((form, fIndex) => {
        counter++;
        const barcode = `${brand.barcodePrefix}${String(fIndex + 1).padStart(2, '0')}${String(bIndex + 1).padStart(2, '0')}`;
        
        items.push({
          barcode,
          name: `${brand.brandAr} ${form.strength}`,
          nameEn: `${brand.brandEn} ${form.strength}`,
          scientificName: `${tmpl.genericName} (${form.strength})`,
          category: tmpl.category,
          form: form.form,
          strength: form.strength,
          manufacturer: brand.manufacturer,
          country: brand.country,
          stripsPerPackage: form.strips,
          piecesPerStrip: form.pieces,
          requiresPrescription: tmpl.prescription,
          locationRack: `${tmpl.category.slice(0, 1).toUpperCase()}-${(counter % 900) + 100}`,
          standardCost: form.cost,
          standardPrice: form.price,
          indications: `${tmpl.indications} - إنتاج شركة ${brand.manufacturer} (${brand.country})`
        });
      });
    });
  });

  return items;
}

export const EXPANDED_MASTER_DRUGS: OnlineDrugItem[] = buildExpandedDrugCatalog();
