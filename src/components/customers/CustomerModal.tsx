import React, { useState, useEffect } from 'react';
import { X, Save, Users, Phone, MapPin, DollarSign, FileText, Palette, Check } from 'lucide-react';
import { Customer } from '../../types';
import { db } from '../../database/db';
import { CUSTOMER_COLORS, getCustomerColor } from '../../utils/customerColors';

interface CustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, customer, onClose, onSaved }) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    color: '',
    currentBalance: 0,
    maxCreditLimit: 50000,
    totalPurchases: 0,
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        color: '',
        currentBalance: 0,
        maxCreditLimit: 50000,
        totalPurchases: 0,
        notes: '',
      });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const currentTheme = getCustomerColor(formData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    db.saveCustomer(formData as Customer);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Customer Color Gradient */}
        <div className={`px-5 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r ${currentTheme.gradient} text-white transition-all`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-base shadow-inner">
              {formData.name ? formData.name.trim().charAt(0) : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-base text-white">
                {customer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h2>
              <p className="text-xs text-white/90">تمييز لوني خاص وسجل حساب وسقف ائتمان</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 bg-slate-50/50 max-h-[80vh] overflow-y-auto">
          {/* Live Preview Card */}
          <div className={`p-3 rounded-xl border ${currentTheme.cardBg} ${currentTheme.borderAccent} shadow-2xs flex items-center justify-between transition-all`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${currentTheme.avatarBg}`}>
                {formData.name ? formData.name.trim().charAt(0) : 'ع'}
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">
                  {formData.name || 'معاينة شكل العميل في القوائم'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold ${currentTheme.badge}`}>
                    {currentTheme.nameAr}
                  </span>
                  {formData.phone && (
                    <span className="text-[10px] text-slate-400 font-mono">{formData.phone}</span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">لون العميل المميز</span>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل الكامل *</label>
            <input
              type="text"
              required
              placeholder="مثال: يحيى صالح الصعيدي"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500 shadow-2xs"
              autoFocus
            />
          </div>

          {/* Color Palette Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-teal-600" />
                <span>لون تمييز العميل (لمنع الخلط بين العملاء)</span>
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, color: '' })}
                className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all ${
                  !formData.color
                    ? 'bg-teal-100 text-teal-800 font-bold border border-teal-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                تلقائي (Auto)
              </button>
            </div>

            <div className="grid grid-cols-8 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              {CUSTOMER_COLORS.map((c) => {
                const isSelected = formData.color === c.id || (!formData.color && currentTheme.id === c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={c.nameAr}
                    onClick={() => setFormData({ ...formData, color: c.id })}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                        : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone & Credit Limit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب</label>
              <input
                type="text"
                placeholder="77XXXXXXXX"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono font-bold shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سقف الآجل (الحد الأقصى)</label>
              <input
                type="number"
                value={formData.maxCreditLimit || 0}
                onChange={(e) =>
                  setFormData({ ...formData, maxCreditLimit: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono font-bold shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / المنطقة</label>
            <input
              type="text"
              placeholder="مثال: حي الأصبحي، عمارة الأمل..."
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات خاصة</label>
            <input
              type="text"
              placeholder="أدوية مزمنة، تنبيهات معينة..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors active:scale-95 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              حفظ بيانات العميل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
