import React, { useState, useEffect } from 'react';
import { X, Save, Truck, Phone, MapPin, DollarSign, Mail, FileText, UserCheck, MessageCircle } from 'lucide-react';
import { Supplier } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface SupplierModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, supplier, onClose, onSaved }) => {
  const { settings } = useSettingsStore();
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    currentBalance: 0,
    totalPurchases: 0,
  });

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        currentBalance: 0,
        totalPurchases: 0,
      });
    }
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    db.saveSupplier(formData as Supplier);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-teal-700/20 flex items-center justify-between bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 text-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">
                {supplier ? 'تعديل بيانات شركة التوريد' : 'إضافة شركة / مورد أدوية جديد'}
              </h2>
              <p className="text-[11px] text-teal-100/90 font-medium">سجل بيانات التواصل والمستحقات وحسابات التوريد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم شركة التوريد / المورد <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="مثال: شركة العالمية لتجارة واستيراد الأدوية"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                autoFocus
              />
              <Truck className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المندوب / المشرف المسؤول</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: د. ماجد السقاف"
                  value={formData.contactPerson || ''}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب</label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="77XXXXXXX"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-mono font-bold shadow-2xs"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="supplier@pharma.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-mono shadow-2xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الرصيد الافتتاحي المستحق للمورد
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.currentBalance || 0}
                  onChange={(e) => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-12 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-mono font-black shadow-2xs"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                <span className="text-[10px] font-bold text-slate-400 absolute left-3 top-2.5 pointer-events-none">
                  {settings.currencySymbol}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الشركة / موقع المستودع</label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: صنعاء - شارع الزبيري - خلف مستشفى الثورة"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-teal-700/25 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{supplier ? 'تحديث البيانات' : 'حفظ المورد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

