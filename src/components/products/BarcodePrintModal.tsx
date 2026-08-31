import React, { useState } from 'react';
import { X, Printer, Barcode, Tag } from 'lucide-react';
import { Product, Batch } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';
import { db } from '../../database/db';

interface BarcodePrintModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ isOpen, product, onClose }) => {
  const { settings, formatCurrency } = useSettingsStore();
  const [copies, setCopies] = useState('5');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  if (!isOpen || !product) return null;

  const batches = db.getBatchesForProduct(product.id);
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  const handlePrint = () => {
    const qty = parseInt(copies, 10) || 1;
    printerService.printBarcodeLabels(product, selectedBatch, qty, settings.pharmacyName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">طباعة ملصقات الباركود والرفوف</h2>
              <p className="text-xs text-slate-400">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Label Live Preview Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">معاينة شكل ملصق الاستيكر (50x25mm):</label>
            <div className="w-56 mx-auto bg-white text-slate-900 p-2.5 rounded-lg shadow-lg border border-slate-300 flex flex-col justify-between text-center select-none">
              <div className="text-[9px] font-bold text-slate-700">{settings.pharmacyName}</div>
              <div className="text-[11px] font-black truncate my-0.5">{product.name}</div>
              <div className="text-[9px] text-slate-600">{product.strength} - {product.form}</div>
              <div className="font-mono text-sm tracking-widest font-black py-0.5 leading-none">||| | |||| || |||</div>
              <div className="font-mono text-[9px] text-slate-700">{product.barcode}</div>
              <div className="flex items-center justify-between border-t border-slate-300 pt-1 mt-1 font-bold text-[10px]">
                <span className="text-emerald-700 font-extrabold">{formatCurrency(product.price)}</span>
                {selectedBatch && (
                  <span className="text-slate-600 font-mono text-[8.5px]">EXP: {selectedBatch.expiryDate}</span>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            {batches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اختر الدفعة (لطباعة تاريخ الصلاحية):</label>
                <select
                  value={selectedBatchId || selectedBatch?.id}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      دفعة {b.batchNumber} - انتهاء: {b.expiryDate} (كمية: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">عدد الملصقات المطلوب طباعتها:</label>
              <input
                type="number"
                min="1"
                max="500"
                value={copies}
                onChange={(e) => setCopies(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-700/30 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            طباعة الملصقات الآن
          </button>
        </div>
      </div>
    </div>
  );
};
