import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Smart AI Content Generation Helper with Automatic Fallback & Retries
async function generateJsonWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string,
  responseSchema: any
): Promise<any> {
  const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini AI] Model ${model} encountered transient error: ${errMsg}. Attempting fallback...`);
      // If error is 503 / high demand or 429 / rate limit, short delay and try next model
      await new Promise((res) => setTimeout(res, 400));
    }
  }

  throw lastError || new Error('All AI models were temporarily unavailable');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Smart AI Online Drug Search Endpoint
app.post('/api/drugs/ai-search', async (req, res) => {
  try {
    const { query, category, limit = 15 } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(200).json({
        success: false,
        source: 'no_api_key',
        message: 'Gemini API key is not configured. Falling back to online OpenFDA and RxNorm registries.',
        results: [],
      });
    }

    const systemPrompt = `You are a certified clinical pharmaceutical specialist, drug registry expert, and pharmacologist.
When given a medicine name, query, disease, active ingredient, or description (in Arabic or English), return a list of verified pharmaceutical products with accurate clinical details.
Each item must have:
- barcode: A valid 13-digit EAN-13 style standard barcode starting with 629 or country prefix.
- name: The Arabic trade/brand name (e.g. "أوجمنتين 1 جم أقراص", "بانادول إكسترا", "كونكور 5 ملجم", "جلوكوفاج 500 ملجم").
- nameEn: The English trade/brand name with dosage (e.g. "Augmentin 1g Tablets", "Panadol Extra", "Concor 5mg").
- scientificName: The exact active pharmaceutical ingredient(s) and strength (e.g. "Amoxicillin 875mg + Clavulanic Acid 125mg", "Paracetamol 500mg + Caffeine 65mg", "Bisoprolol Fumarate 5mg").
- category: One of the official categories: [
    "مضادات حيوية وميكروبية",
    "مسكنات ومضادات التهاب",
    "أدوية الضغط والقلب والأوعية",
    "أدوية السكري والغدد",
    "أدوية الجهاز الهضمي والمعدة",
    "أدوية الجهاز التنفسي والبرد والحساسية",
    "أدوية الأعصاب والنفسية والصداع",
    "الفيتامينات والمكملات الغذائية والمعادن",
    "أدوية العيون والأنف والأذن",
    "أدوية الجلدية والمطهرات والمراهم",
    "أدوية المسالك والنساء والولادة",
    "المحاليل الوريدية وأدوية الطوارئ"
  ].
- form: Exact dosage form in Arabic (e.g. "أقراص", "كبسولات", "شراب", "حقن", "مرهم", "كريم", "قطرة", "بخاخ", "فوار", "تحاميل", "أكياس بودرة").
- strength: The pharmaceutical strength/concentration (e.g. "500mg", "1g", "5mg", "100mg/5ml", "0.1%").
- manufacturer: Real pharmaceutical company name (e.g. "GSK", "Sanofi", "Pfizer", "Novartis", "AstraZeneca", "Hikma", "SPIMACO", "Julphar", "Eva Pharma", "Bayer", "Abbott").
- country: Country of origin (e.g. "بريطانيا", "فرنسا", "سويسرا", "أمريكا", "ألمانيا", "الأردن", "السعودية", "مصر", "اليمن").
- stripsPerPackage: Number of blisters/strips in full retail pack (integer, usually 1, 2, 3, or 4).
- piecesPerStrip: Number of tablets/capsules per strip (integer, usually 10, 7, 14).
- requiresPrescription: boolean (true if Rx required, false if OTC).
- locationRack: Suggested shelf location code (e.g. "A-101", "B-202", "C-301").
- standardCost: Estimated base wholesale cost in local currency units (reasonable number, e.g. 1500 to 8000).
- standardPrice: Estimated retail selling price (cost * 1.25 to 1.35).
- indications: Brief medical uses and indications in clear Arabic (1-2 sentences).`;

    const userPrompt = `Search the international pharmaceutical database for: "${query}".
${category && category !== 'الكل' ? `Filter or prioritize category: ${category}.` : ''}
Provide up to ${limit} most accurate and common medicine variants/matches.`;

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          barcode: { type: Type.STRING, description: '13-digit standard EAN-13 barcode' },
          name: { type: Type.STRING, description: 'Arabic brand name with strength' },
          nameEn: { type: Type.STRING, description: 'English brand name with strength' },
          scientificName: { type: Type.STRING, description: 'Generic / active ingredient name' },
          category: { type: Type.STRING, description: 'Therapeutic category' },
          form: { type: Type.STRING, description: 'Dosage form in Arabic' },
          strength: { type: Type.STRING, description: 'Strength string' },
          manufacturer: { type: Type.STRING, description: 'Pharmaceutical company' },
          country: { type: Type.STRING, description: 'Country of manufacture' },
          stripsPerPackage: { type: Type.INTEGER, description: 'Number of strips' },
          piecesPerStrip: { type: Type.INTEGER, description: 'Number of pieces per strip' },
          requiresPrescription: { type: Type.BOOLEAN, description: 'Requires doctor prescription' },
          locationRack: { type: Type.STRING, description: 'Suggested rack code' },
          standardCost: { type: Type.NUMBER, description: 'Estimated wholesale cost' },
          standardPrice: { type: Type.NUMBER, description: 'Estimated retail price' },
          indications: { type: Type.STRING, description: 'Clinical indications and usage in Arabic' },
        },
        required: [
          'barcode',
          'name',
          'nameEn',
          'scientificName',
          'category',
          'form',
          'strength',
          'manufacturer',
          'country',
          'stripsPerPackage',
          'piecesPerStrip',
          'requiresPrescription',
          'locationRack',
          'standardCost',
          'standardPrice',
          'indications',
        ],
      },
    };

    let items: any[] = [];
    try {
      items = await generateJsonWithFallback(ai, userPrompt, systemPrompt, responseSchema);
    } catch (aiErr: any) {
      console.warn('AI search temporary failure, providing graceful fallback:', aiErr?.message);
      return res.status(200).json({
        success: false,
        source: 'ai_unavailable',
        message: 'خدمة الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، تم التحويل تلقائياً لقواعد البيانات المدمجة والسجلات السحابية.',
        query,
        count: 0,
        results: [],
      });
    }

    return res.json({
      success: true,
      source: 'gemini_ai',
      query,
      count: Array.isArray(items) ? items.length : 0,
      results: Array.isArray(items) ? items : [],
    });
  } catch (error: any) {
    console.error('Error in /api/drugs/ai-search:', error);
    return res.status(200).json({
      success: false,
      source: 'error_handled',
      error: error.message || 'Failed to search online drugs via AI',
      results: [],
    });
  }
});

// Single drug AI enrichment endpoint
app.post('/api/drugs/ai-enrich', async (req, res) => {
  try {
    const { drugName } = req.body;
    if (!drugName || typeof drugName !== 'string') {
      return res.status(400).json({ error: 'drugName is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(200).json({
        success: false,
        message: 'No Gemini key available',
      });
    }

    const systemPrompt = `You are a clinical pharmacologist. Given a medicine name or barcode, return a complete pharmaceutical profile in structured JSON matching the schema.`;
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        barcode: { type: Type.STRING },
        name: { type: Type.STRING },
        nameEn: { type: Type.STRING },
        scientificName: { type: Type.STRING },
        category: { type: Type.STRING },
        form: { type: Type.STRING },
        strength: { type: Type.STRING },
        manufacturer: { type: Type.STRING },
        country: { type: Type.STRING },
        stripsPerPackage: { type: Type.INTEGER },
        piecesPerStrip: { type: Type.INTEGER },
        requiresPrescription: { type: Type.BOOLEAN },
        locationRack: { type: Type.STRING },
        standardCost: { type: Type.NUMBER },
        standardPrice: { type: Type.NUMBER },
        indications: { type: Type.STRING },
      },
      required: [
        'name',
        'nameEn',
        'scientificName',
        'category',
        'form',
        'strength',
        'manufacturer',
        'country',
        'stripsPerPackage',
        'piecesPerStrip',
        'requiresPrescription',
        'locationRack',
        'standardCost',
        'standardPrice',
        'indications',
      ],
    };

    try {
      const parsed = await generateJsonWithFallback(
        ai,
        `Provide full verified details for medication: "${drugName}"`,
        systemPrompt,
        responseSchema
      );
      return res.json({ success: true, drug: parsed });
    } catch (aiErr: any) {
      console.warn('AI enrich temporary failure:', aiErr?.message);
      return res.status(200).json({
        success: false,
        message: 'خدمة الذكاء الاصطناعي مشغولة مؤقتاً.',
        drug: null,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/drugs/ai-enrich:', error);
    return res.status(200).json({ success: false, error: error.message, drug: null });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pharmacy Management Server running on port ${PORT}`);
  });
}

startServer();
