import React, { useState } from 'react';
import { MapPin, X, Check, Building2 } from 'lucide-react';
import { Product } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface BulkLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  products: Product[];
  onUpdated: () => void;
}

export const BulkLocationModal: React.FC<BulkLocationModalProps> = ({
  isOpen,
  onClose,
  selectedProductIds,
  products,
  onUpdated,
}) => {
  const { showToast } = useSettingsStore();
  const [newLocationRack, setNewLocationRack] = useState('');
  const [commonRacks] = useState([
    'رف A-1',
    'رف A-2',
    'رف B-1',
    'رف B-2',
    'رف C-1',
    'رف C-2',
    'خزانة الأقراص',
    'خزانة الشراب',
    'ثلاجة الأدوية (2-8°C)',
    'خزانة أدوية الطوارئ',
    'خزانة المراهم والقطرات',
    'مستودع داخلي',
  ]);

  if (!isOpen) return null;

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationRack.trim()) {
      showToast('يرجى كتابة أو اختيار موقع الرف الجديد', 'warning');
      return;
    }

    try {
      let updatedCount = 0;
      selectedProducts.forEach((p) => {
        db.saveProduct({
          ...p,
          locationRack: newLocationRack.trim(),
        });
        updatedCount++;
      });

      showToast(`تم تحديث موقع الرف لـ ${updatedCount} صنف دوائي إلى (${newLocationRack}) بنجاح`, 'success');
      onUpdated();
      onClose();
    } catch (err) {
      showToast('حدث خطأ أثناء تحديث مواقع الأدوية', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col text-slate-800">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-teal-800 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-600/50 text-teal-100">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">نقل وتحديث مواقع الأرفف جماعياً</h3>
              <p className="text-[10px] text-teal-200">
                تعديل موقع الرف لـ {selectedProducts.length} صنف محدد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-teal-600/50 text-teal-200 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5">
          {/* Target Location Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              موقع الرف / الخزانة الجديد: <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-teal-600 absolute right-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="مثال: رف A-102 أو ثلاجة الأدوية..."
                value={newLocationRack}
                onChange={(e) => setNewLocationRack(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pr-9 pl-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Quick Rack Suggestions */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
              أو اختر من الأرفف والخزائن الشائعة:
            </label>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-lg">
              {commonRacks.map((rack) => (
                <button
                  key={rack}
                  type="button"
                  onClick={() => setNewLocationRack(rack)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                    newLocationRack === rack
                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:text-teal-800'
                  }`}
                >
                  {rack}
                </button>
              ))}
            </div>
          </div>

          {/* Selected items preview */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-600 block">الأدوية المشمولة بالنقل:</span>
            <div className="max-h-24 overflow-y-auto divide-y divide-slate-200/60 text-xs">
              {selectedProducts.map((p) => (
                <div key={p.id} className="py-1 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 truncate max-w-[220px]">{p.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    الحالي: {p.locationRack || 'غير محدد'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق النقل الجديد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
