import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Barcode,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Keyboard,
  Clock,
  Layers,
  HelpCircle,
  Package,
  Activity,
  Play,
  RotateCcw,
  ShieldCheck,
  Search,
  Hash
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { usePOSStore } from '../../stores/usePOSStore';
import { db } from '../../database/db';
import {
  decodeBarcodeInput,
  findProductByBarcode,
  BarcodeScannerSettings,
  DEFAULT_SCANNER_SETTINGS,
  DecodedBarcodeResult,
} from '../../utils/barcodeDecoder';
import { Product } from '../../types';

interface BarcodeScannerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScannerConfigModal: React.FC<BarcodeScannerConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings, showToast, formatCurrency } = useSettingsStore();
  const { playBeep } = usePOSStore();

  const [activeTab, setActiveTab] = useState<'test' | 'settings' | 'guide'>('test');
  const [config, setConfig] = useState<BarcodeScannerSettings>({
    ...DEFAULT_SCANNER_SETTINGS,
    ...(settings.barcodeScannerSettings || {}),
  });

  // Test sandbox state
  const [testRawInput, setTestRawInput] = useState('');
  const [testDecodedResult, setTestDecodedResult] = useState<DecodedBarcodeResult | null>(null);
  const [testMatchedProduct, setTestMatchedProduct] = useState<Product | null>(null);
  const [testKeyIntervals, setTestKeyIntervals] = useState<number[]>([]);
  const [testAvgSpeed, setTestAvgSpeed] = useState<number>(0);
  const [isListeningTest, setIsListeningTest] = useState(true);
  const [testLog, setTestLog] = useState<
    { id: string; time: string; code: string; name?: string; format: string; isGS1: boolean }[]
  >([]);

  const testBufferRef = useRef<string>('');
  const testTimestampsRef = useRef<number[]>([]);
  const testLastKeyTimeRef = useRef<number>(0);

  // Sync settings if changed externally
  useEffect(() => {
    if (isOpen) {
      setConfig({
        ...DEFAULT_SCANNER_SETTINGS,
        ...(settings.barcodeScannerSettings || {}),
      });
      setTestRawInput('');
      setTestDecodedResult(null);
      setTestMatchedProduct(null);
    }
  }, [isOpen, settings.barcodeScannerSettings]);

  // Live test key listener when modal is open and on 'test' tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'test') return;

    const handleTestKeyDown = (e: KeyboardEvent) => {
      // Ignore navigation and functional keys
      if (
        ['Escape', 'Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab'].includes(e.key) &&
        e.key !== 'Tab'
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - testLastKeyTimeRef.current;
      testLastKeyTimeRef.current = now;

      // Suffix Enter or Tab
      if (e.key === 'Enter' || (e.key === 'Tab' && config.scannerSuffix === 'tab')) {
        e.preventDefault();
        e.stopPropagation();

        if (testBufferRef.current.length >= config.minBarcodeLength) {
          evaluateScannedCode(testBufferRef.current, testTimestampsRef.current);
        }
        testBufferRef.current = '';
        testTimestampsRef.current = [];
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > config.maxKeyIntervalMs && testBufferRef.current.length > 0) {
          testBufferRef.current = '';
          testTimestampsRef.current = [];
        }

        testBufferRef.current += e.key;
        testTimestampsRef.current.push(now);
      }
    };

    window.addEventListener('keydown', handleTestKeyDown, true);
    return () => window.removeEventListener('keydown', handleTestKeyDown, true);
  }, [isOpen, activeTab, config]);

  const evaluateScannedCode = (rawCode: string, timestamps: number[]) => {
    setTestRawInput(rawCode);

    // Calculate speed
    if (timestamps.length > 1) {
      let totalInterval = 0;
      for (let i = 1; i < timestamps.length; i++) {
        totalInterval += timestamps[i] - timestamps[i - 1];
      }
      const avg = Math.round(totalInterval / (timestamps.length - 1));
      setTestAvgSpeed(avg);
    }

    const decoded = decodeBarcodeInput(rawCode, config);
    setTestDecodedResult(decoded);

    const allProducts = db.getProducts();
    const matched = findProductByBarcode(decoded, allProducts);
    setTestMatchedProduct(matched || null);

    if (matched) {
      playBeep('scan');
      setTestLog((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('ar-SA'),
          code: decoded.normalizedCode,
          name: matched.name,
          format: decoded.format,
          isGS1: decoded.isGS1,
        },
        ...prev.slice(0, 7),
      ]);
    } else {
      playBeep('error');
      setTestLog((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('ar-SA'),
          code: decoded.normalizedCode,
          name: 'غير مسجل في الكتالوج',
          format: decoded.format,
          isGS1: decoded.isGS1,
        },
        ...prev.slice(0, 7),
      ]);
    }
  };

  const handleSaveSettings = () => {
    updateSettings({
      barcodeScannerSettings: config,
    });
    showToast('تم حفظ إعدادات وحدة فك تشفير الباركود بنجاح 🟢', 'success');
    onClose();
  };

  const handleSimulate = (sampleRaw: string) => {
    const fakeTimestamps = [Date.now(), Date.now() + 15, Date.now() + 30, Date.now() + 45];
    evaluateScannedCode(sampleRaw, fakeTimestamps);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                تهيئة وحدة فك تشفير الباركود وقارئ الـ USB
                <span className="px-2 py-0.5 rounded-full bg-teal-950 border border-teal-700 text-[10px] text-teal-300 font-mono">
                  Keyboard Wedge
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ضبط سرعة الاستجابة، التصحيح الآلي، وفك تشفير الباركود الدوائي GS1 DataMatrix
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 border-b border-slate-800 bg-slate-950/30 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'test'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>منطقة الاختبار المباشر (Live Sandbox)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>إعدادات وخيارات فك التشفير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>دليل توصيل وضبط القارئ</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: LIVE TEST SANDBOX */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              {/* Live Scanner Input Target Zone */}
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-dashed border-purple-500/40 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none" />
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex p-3 rounded-2xl bg-purple-900/30 text-purple-300 ring-4 ring-purple-500/10">
                    <Barcode className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    امسح أي باركود الآن باستخدام جهاز القارئ المتصل بالكمبيوتر
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    يتم استقبال إشارات لوحة المفاتيح وفك تشفيرها فورياً وتحليل سرعة الاستجابة (Interval Delay).
                  </p>
                  
                  {/* Realtime Speed Pill */}
                  {testAvgSpeed > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-slate-300">متوسط سرعة الإدخال:</span>
                      <span className="text-teal-300 font-bold">{testAvgSpeed} ms/حرف</span>
                      <span className="text-[10px] text-teal-400">
                        {testAvgSpeed < 45 ? '(ممتاز ⚡)' : testAvgSpeed < 80 ? '(جيد)' : '(عادي)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation Quick Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400">أو جرّب محاكاة قراءة سريعة:</span>
                
                <button
                  type="button"
                  onClick={() => handleSimulate('6281086000000')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono border border-slate-700 transition-colors cursor-pointer"
                >
                  EAN-13 (بانادول)
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulate('(01)06281086000000(17)261231(10)LOT2026A(21)SN10098')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-xs text-indigo-200 font-mono border border-indigo-700 transition-colors cursor-pointer"
                >
                  GS1 DataMatrix 2D (دواء مركب)
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulate('ضصث12345')}
                  className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-xs text-purple-200 font-mono border border-purple-700 transition-colors cursor-pointer"
                >
                  إدخال باللغة العربية (Auto-Fix)
                </button>
              </div>

              {/* Scan Results Display Card */}
              {testDecodedResult && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-400">نتيجة فك التشفير:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-950 border border-purple-700 text-xs text-purple-300 font-mono font-bold">
                        {testDecodedResult.format}
                      </span>
                      {testDecodedResult.isGS1 && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-700 text-xs text-indigo-300 font-bold">
                          GS1 Pharmaceutical
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-400 font-medium">الرمز الخام المستلم (Raw):</div>
                      <div className="font-mono text-slate-200 break-all">{testDecodedResult.raw}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-400 font-medium">الباركود المعالج (Normalized):</div>
                      <div className="font-mono text-teal-300 font-bold break-all">
                        {testDecodedResult.normalizedCode}
                      </div>
                    </div>
                  </div>

                  {/* If GS1 Details Extracted */}
                  {testDecodedResult.isGS1 && (
                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-indigo-400 block font-medium">GTIN:</span>
                        <span className="font-mono text-white">{testDecodedResult.gtin || '—'}</span>
                      </div>
                      <div>
                        <span className="text-indigo-400 block font-medium">تاريخ الانتهاء:</span>
                        <span className="font-mono text-white">{testDecodedResult.expiryDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-indigo-400 block font-medium">رقم التشغيلة (Batch):</span>
                        <span className="font-mono text-white">{testDecodedResult.batchNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-indigo-400 block font-medium">الرقم التسلسلي (SN):</span>
                        <span className="font-mono text-white">{testDecodedResult.serialNumber || '—'}</span>
                      </div>
                    </div>
                  )}

                  {/* Matched Product Details */}
                  {testMatchedProduct ? (
                    <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-900/60 text-teal-300">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{testMatchedProduct.name}</div>
                          <div className="text-xs text-teal-300 font-mono">
                            السعر: {formatCurrency(testMatchedProduct.price)} • المخزون: {testMatchedProduct.totalQuantity} عبوة
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-teal-400 flex items-center gap-1 bg-teal-900/40 px-2.5 py-1 rounded-lg border border-teal-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>مطابق في النظام</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-rose-200">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>الباركود غير مقيد لأي دواء في قاعدة البيانات الحالية.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* History Log of Scans */}
              {testLog.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400">سجل القراءات التجريبية الأخيرة:</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {testLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                          <span className="font-bold text-white">{log.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 text-[11px]">{log.code}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-purple-300">
                            {log.format}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DECODER & SCANNER CONFIGURATION */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              
              {/* Enable / Disable Scanner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white">
                    تفعيل قارئ الباركود الخارجي (Hardware Wedge)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    الاستماع التلقائي لإشارات لوحة المفاتيح وإدخال المنتجات للسلة فورياً
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Speed Sensitivity (Inter-key delay threshold) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">
                      حساسية الفاصل الزمني للضربات (Inter-key Interval)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      أقصى فارق زمني بالمللي ثانية بين الأحرف لتمييز القارئ عن الكتابة اليدوية
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950 px-2 py-1 rounded-lg border border-purple-800">
                    {config.maxKeyIntervalMs} ms
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { val: 40, label: 'سريع جداً (40ms)' },
                    { val: 65, label: 'متوازن قياسي (65ms)' },
                    { val: 90, label: 'متساهل (90ms)' },
                    { val: 130, label: 'بطيء / بلوتوث (130ms)' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setConfig({ ...config, maxKeyIntervalMs: item.val })}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        config.maxKeyIntervalMs === item.val
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanner Suffix / Terminator */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white">
                    مفتاح إنهاء القراءة (Scanner Suffix Terminator)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    الرمز أو المفتاح الذي يرسله القارئ في نهاية الباركود
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'enter', label: 'مفتاح Enter (الافتراضي)' },
                    { id: 'tab', label: 'مفتاح Tab' },
                    { id: 'timeout', label: 'إنهاء زمني تلقائي (Timeout)' },
                    { id: 'any', label: 'أي مفتاح / تلقائي' },
                  ].map((suf) => (
                    <button
                      key={suf.id}
                      type="button"
                      onClick={() => setConfig({ ...config, scannerSuffix: suf.id as any })}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        config.scannerSuffix === suf.id
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {suf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Fix Arabic Keyboard & GS1 2D Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-white">
                      تصحيح لوحة المفاتيح العربية تلقائياً
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      تحويل الأحرف والأرقام العربية المدخلة عند تفعيل لغة عربية في نظام التشغيل
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoConvertArabicLayout}
                    onChange={(e) =>
                      setConfig({ ...config, autoConvertArabicLayout: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer mt-1"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-white">
                      فك تشفير باركود GS1 DataMatrix الدوائي
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      استخراج رقم التشغيلة وتاريخ الصلاحية والرقم التسلسلي من الباركود الثنائي
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableGS1DataMatrix}
                    onChange={(e) =>
                      setConfig({ ...config, enableGS1DataMatrix: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer mt-1"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-white">
                      زيادة الكمية تلقائياً عند تكرار المسح
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      عند مسح نفس الصنف أكثر من مرة متتالية يتم رفع الكمية بمقدار +1
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoIncrementQuantity}
                    onChange={(e) =>
                      setConfig({ ...config, autoIncrementQuantity: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer mt-1"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-white">
                      حماية وعزل حقول الإدخال (Input Shield)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      منع تسرب أرقام الباركود الطويلة إلى خانات الخصم أو الملاحظات المفتوحة
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.preventInputPollution}
                    onChange={(e) =>
                      setConfig({ ...config, preventInputPollution: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTION & HARDWARE SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  خطوات توصيل القارئ مع نظام الصيدلية:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-1">
                  <li>قم بتوصيل كابل قارئ الباركود (USB) أو جهاز استقبال اللاسلكي بمنفذ الكمبيوتر.</li>
                  <li>
                    تأكد من أن القارئ مضبوط على وضعية محاكاة لوحة المفاتيح (<code className="font-mono text-purple-300">USB HID / Keyboard Wedge</code>).
                  </li>
                  <li>
                    تأكد من أن القارئ يرسل مفتاح (<code className="font-mono text-purple-300">CR / Enter</code>) بعد انتهاء قراءة الباركود (وهو الوضع الافتراضي لـ 99% من الأجهزة).
                  </li>
                  <li>افتح شاشة نقطة البيع (POS)، وابدأ بمسح علب الأدوية مباشرة دون الحاجة للنقر بالفأرة على أي حقل!</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-1.5">
                <h4 className="font-bold text-purple-300">ميزة تصحيح الكتابة العربية الفورية:</h4>
                <p className="text-slate-400 text-xs">
                  إذا كانت لوحة المفاتيح مضبوطة على اللغة العربية (AR)، يقوم النظام بفك تشفير الحروف وتحويلها تلقائياً للأرقام والرموز الأصلية لمنع أي أخطاء أثناء البيع.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setConfig(DEFAULT_SCANNER_SETTINGS)}
            className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الإعدادات الافتراضية</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الإعدادات وتفعيل القارئ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
