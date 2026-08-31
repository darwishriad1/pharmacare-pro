import React, { useState } from 'react';
import { X, Search, UserPlus, Check, Users, Phone, DollarSign, Palette } from 'lucide-react';
import { usePOSStore } from '../../stores/usePOSStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';
import { Customer } from '../../types';
import { CUSTOMER_COLORS, getCustomerColor } from '../../utils/customerColors';

export const CustomerSelectorModal: React.FC = () => {
  const { isCustomerModalOpen, setCustomerModalOpen, selectedCustomer, setCustomer } = usePOSStore();
  const { formatCurrency } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newMaxCredit, setNewMaxCredit] = useState('50000');

  if (!isCustomerModalOpen) return null;

  const customers = db.getCustomers();
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleSelect = (customer: Customer) => {
    setCustomer(customer);
    setCustomerModalOpen(false);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCust = db.saveCustomer({
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim() || '---',
      color: newColor || undefined,
      currentBalance: 0,
      maxCreditLimit: parseFloat(newMaxCredit) || 0,
      totalPurchases: 0,
      createdAt: new Date().toISOString().split('T')[0],
    });

    setCustomer(newCust);
    setIsAddingNew(false);
    setCustomerModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-teal-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">اختيار أو إضافة عميل</h2>
              <p className="text-xs text-teal-100">تم تلوين كل عميل بلون مميز لسهولة وسرعة الاختيار</p>
            </div>
          </div>
          <button
            onClick={() => setCustomerModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!isAddingNew ? (
            <>
              {/* Search bar & Add Button */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white shadow-2xs"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-1 px-3.5 min-h-[42px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  عميل جديد
                </button>
              </div>

              {/* Customers List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {/* General Cash Customer default option */}
                {customers.length > 0 && (
                  <div
                    onClick={() => handleSelect(customers[0])}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-98 border-r-4 border-r-teal-500 ${
                      selectedCustomer?.id === customers[0]?.id
                        ? 'bg-teal-100/90 border-teal-500 ring-2 ring-teal-400'
                        : 'bg-teal-50/70 border-teal-200 hover:bg-teal-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        نق
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">عميل نقدي عام (افتراضي)</h4>
                          <span className="text-[9px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">نقدي</span>
                        </div>
                        <span className="text-[11px] text-slate-500">للمبيعات النقدية المباشرة بدون تسجيل دين</span>
                      </div>
                    </div>
                    {selectedCustomer?.id === customers[0]?.id && (
                      <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )}

                {filtered
                  .filter((c) => c.id !== customers[0]?.id)
                  .map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    const theme = getCustomerColor(customer);

                    return (
                      <div
                        key={customer.id}
                        onClick={() => handleSelect(customer)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-98 ${theme.borderAccent} ${
                          isSelected
                            ? theme.activeCardBg
                            : `${theme.cardBg} ${theme.border}`
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${theme.avatarBg}`}>
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900">{customer.name}</h4>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${theme.badge}`}>
                                {theme.nameAr}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {customer.phone}
                              </span>
                              {customer.maxCreditLimit > 0 && (
                                <span className="text-[11px]">سقف: {formatCurrency(customer.maxCreditLimit)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          {customer.currentBalance > 0 ? (
                            <div>
                              <span className="text-[10px] text-rose-600 block font-bold">مستحق عليه</span>
                              <span className="font-mono font-black text-xs sm:text-sm text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                {formatCurrency(customer.currentBalance)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              خالص
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            /* Add New Customer Form */
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يحيى صالح الصعيدي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                  autoFocus
                />
              </div>

              {/* Color Selection for New Customer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-teal-600" />
                  <span>لون تمييز العميل</span>
                </label>
                <div className="grid grid-cols-8 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {CUSTOMER_COLORS.map((c) => {
                    const isSelected = newColor === c.id || (!newColor && c.id === 'indigo');
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.nameAr}
                        onClick={() => setNewColor(c.id)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative ${
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب</label>
                <input
                  type="text"
                  placeholder="77XXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحد الأقصى للائتمان (سقف الآجل)</label>
                <input
                  type="number"
                  value={newMaxCredit}
                  onChange={(e) => setNewMaxCredit(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold active:scale-95 shadow-xs transition-all cursor-pointer"
                >
                  حفظ وتحديد العميل
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
