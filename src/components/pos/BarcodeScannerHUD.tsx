import React, { useEffect } from 'react';
import {
  Barcode,
  Sparkles,
  Zap,
  Volume2,
  Sliders,
  Camera,
  CheckCircle2,
  Layers,
  HelpCircle,
  Clock,
  ScanLine
} from 'lucide-react';
import { UnitType } from '../../types';
import { DecodedBarcodeResult } from '../../utils/barcodeDecoder';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface BarcodeScannerHUDProps {
  activeUnit: UnitType;
  onSelectUnit: (unit: UnitType) => void;
  isScanning: boolean;
  lastScannedResult: DecodedBarcodeResult | null;
  lastScanTime: number;
  onOpenConfigModal: () => void;
  onOpenCameraModal: () => void;
}

export const BarcodeScannerHUD: React.FC<BarcodeScannerHUDProps> = ({
  activeUnit,
  onSelectUnit,
  isScanning,
  lastScannedResult,
  lastScanTime,
  onOpenConfigModal,
  onOpenCameraModal,
}) => {
  const { formatCurrency, settings } = useSettingsStore();
  const scannerConfig = settings.barcodeScannerSettings;

  // Global hotkeys for quick unit switching (F7: Package, F8: Strip, F9: Piece)
  useEffect(() => {
    const handleUnitHotkeys = (e: KeyboardEvent) => {
      if (e.key === 'F7') {
        e.preventDefault();
        onSelectUnit('package');
      } else if (e.key === 'F8') {
        e.preventDefault();
        onSelectUnit('strip');
      } else if (e.key === 'F9') {
        e.preventDefault();
        onSelectUnit('piece');
      }
    };

    window.addEventListener('keydown', handleUnitHotkeys);
    return () => window.removeEventListener('keydown', handleUnitHotkeys);
  }, [onSelectUnit]);

  const timeAgoSec = Math.floor((Date.now() - lastScanTime) / 1000);
  const showRecentBadge = lastScannedResult && timeAgoSec < 8;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-lg flex flex-wrap items-center justify-between gap-2.5 transition-all">
      {/* Scanner Status & Laser Feedback */}
      <div className="flex items-center gap-2.5">
        <div
          className={`relative p-2 rounded-xl border flex items-center justify-center transition-all ${
            isScanning
              ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/50 scale-105'
              : 'bg-slate-800/80 border-slate-700 text-teal-400'
          }`}
          title="قارئ الباركود الخارجي نشط وجاهز للقراءة الفورية"
        >
          <Barcode className="w-5 h-5" />
          {/* Pulsing online dot */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white flex items-center gap-1">
              قارئ الباركود الخارجي
              <span className="px-1.5 py-0.2 rounded-md bg-teal-950/80 border border-teal-700 text-[10px] text-teal-300 font-mono">
                USB / لاسلكي
              </span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <span>جاهز للقراءة الفورية عبر لوحة المفاتيح</span>
            {scannerConfig?.autoConvertArabicLayout && (
              <span className="text-purple-400 font-medium">• تصحيح عربي نشط</span>
            )}
            {scannerConfig?.enableGS1DataMatrix && (
              <span className="text-indigo-400 font-medium">• GS1 2D</span>
            )}
          </p>
        </div>
      </div>

      {/* Center: Unit Selector (Package / Strip / Piece) */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
        <span className="text-[10px] text-slate-400 font-bold px-1.5 hidden sm:inline">
          وحدة المسح:
        </span>

        <button
          type="button"
          onClick={() => onSelectUnit('package')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeUnit === 'package'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="مسح كوحدة عبوة كاملة (F7)"
        >
          <span>عبوة</span>
          <kbd className="text-[9px] opacity-75 font-mono bg-black/20 px-1 py-0.2 rounded">F7</kbd>
        </button>

        <button
          type="button"
          onClick={() => onSelectUnit('strip')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeUnit === 'strip'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="مسح كوحدة شريط (F8)"
        >
          <span>شريط</span>
          <kbd className="text-[9px] opacity-75 font-mono bg-black/20 px-1 py-0.2 rounded">F8</kbd>
        </button>

        <button
          type="button"
          onClick={() => onSelectUnit('piece')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeUnit === 'piece'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="مسح كوحدة حبة (F9)"
        >
          <span>حبة</span>
          <kbd className="text-[9px] opacity-75 font-mono bg-black/20 px-1 py-0.2 rounded">F9</kbd>
        </button>
      </div>

      {/* Right Action Tools: Config Modal & Camera */}
      <div className="flex items-center gap-1.5">
        {/* Recent Scan Pill if recent */}
        {showRecentBadge && lastScannedResult.matchedProduct && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-700/60 text-xs text-purple-200 animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-bold truncate max-w-[140px]">
              {lastScannedResult.matchedProduct.name}
            </span>
            <span className="font-mono text-[11px] text-purple-300">
              {formatCurrency(lastScannedResult.matchedProduct.price)}
            </span>
          </div>
        )}

        {/* Decoder & Scanner Config Button */}
        <button
          type="button"
          onClick={onOpenConfigModal}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          title="إعدادات وفك تشفير الباركود واختبار القارئ المباشر"
        >
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          <span>تهيئة واختبار القارئ</span>
        </button>

        {/* Camera Scanner Alternative */}
        <button
          type="button"
          onClick={onOpenCameraModal}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          title="مسح الباركود بكاميرا الجهاز أو الجوال"
        >
          <Camera className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">الكاميرا</span>
        </button>
      </div>
    </div>
  );
};
