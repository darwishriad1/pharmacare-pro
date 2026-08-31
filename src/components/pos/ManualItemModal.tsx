import React, { useState } from 'react';
import { PlusCircle, X, Package, DollarSign, Hash, Calendar, Layers } from 'lucide-react';
import { usePOSStore } from '../../stores/usePOSStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Product, UnitType } from '../../types';

interface ManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualItemModal: React.FC<ManualItemModalProps> = ({ isOpen, onClose }) => {
  const { addItem } = usePOSStore();
  const { settings } = useSettingsStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitType, setUnitType] = useState<UnitType>('package');
  const [category, setCategory] = useState('مسكنات وخافضات حرارة');
  const [barcode, setBarcode] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || Number(price) <= 0) return;

    const dummyProduct: Product = {
      id: `manual-${Date.now()}`,
      barcode: barcode.trim() || `MAN-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      scientificName: name.trim(),
      category: category,
      form: unitType === 'strip' ? 'أشرطة' : unitType === 'piece' ? 'حبات' : 'عبوة',
      strength: 'عادي',
      manufacturer: 'صنف يدوي',
      costPrice: Math.round(Number(price) * 0.8),
      price: Number(price),
      stripPrice: Number(price),
      piecePrice: Number(price),
      stripsPerPackage: 1,
      piecesPerStrip: 10,
      minStock: 5,
      requiresPrescription: false,
      vatRate: 0,
      active: true,
      totalQuantity: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addItem(dummyProduct, unitType, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-teal-100 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp text-slate-800 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-teal-100 border border-white/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">إضافة صنف يدوي</h2>
              <p className="text-xs text-teal-100/80">إدراج صنف أو خدمة مباشرة في الفاتورة الحالية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Drug Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم الدواء أو الصنف <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="مثال: قطرة عين مرطبة، شاش معقم..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                autoFocus
              />
            </div>
          </div>

          {/* Price & Quantity Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سعر البيع ({settings.currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="number"
                  required
                  min="0.1"
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الكمية</label>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 w-full text-center bg-transparent font-mono font-bold text-sm text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center hover:bg-teal-700 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Unit Type & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as UnitType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="package">عبوة كاملة / علبة</option>
                <option value="strip">شريط</option>
                <option value="piece">حبة / أمبولة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="مسكنات وخافضات حرارة">مسكنات وخافضات حرارة</option>
                <option value="مضادات حيوية">مضادات حيوية</option>
                <option value="الجهاز الهضمي والمعدة">الجهاز الهضمي</option>
                <option value="جلدية وعيون">جلدية وعيون</option>
                <option value="فيتامينات ومكملات غذائية">فيتامينات ومكملات</option>
                <option value="مستلزمات طبية">مستلزمات طبية</option>
              </select>
            </div>
          </div>

          {/* Optional Barcode & Expiry */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">الباركود (اختياري)</label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="توليد تلقائي"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-2.5 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">تاريخ الصلاحية</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-2 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs sm:text-sm active:scale-95 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-700/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              إضافة إلى الفاتورة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
