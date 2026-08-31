import React, { useState } from 'react';
import { X, Save, Coins, Calendar, Tag, DollarSign } from 'lucide-react';
import { Expense } from '../../types';
import { db } from '../../database/db';
import { useAuthStore } from '../../stores/useAuthStore';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EXPENSE_CATEGORIES: { id: Expense['category']; label: string }[] = [
  { id: 'rent', label: 'إيجار الصيدلية' },
  { id: 'electricity', label: 'كهرباء وديزل المولد' },
  { id: 'salaries', label: 'رواتب وحوافز الموظفين' },
  { id: 'supplies', label: 'أكياس ومطبوعات ومستلزمات' },
  { id: 'maintenance', label: 'صيانة ونظافة' },
  { id: 'taxes', label: 'رسوم حكومية وتراخيص' },
  { id: 'other', label: 'نثريات ومصروفات أخرى' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { currentUser } = useAuthStore();
  const [category, setCategory] = useState<Expense['category']>('rent');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !title.trim()) return;

    db.addExpense({
      title: title.trim(),
      category,
      amount: amt,
      date,
      paymentMethod: 'cash',
      paidBy: currentUser?.name || 'الكاشير',
      notes,
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">تسجيل سند صرف / مصروف جديد</h2>
              <p className="text-xs text-teal-100/90">إدخال المصروفات التشغيلية واليومية للصيدلية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 bg-slate-50/50">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">بند / تصنيف المصروف *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Expense['category'])}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500 shadow-2xs"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ر.ي) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="مثال: 3500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-black text-rose-600 focus:outline-none focus:border-teal-500 shadow-2xs"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصرف</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">بيان وتفاصيل المصروف *</label>
            <input
              type="text"
              required
              placeholder="مثال: شراء أكياس بلاستيك مطبوعة للصيدلية"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              placeholder="رقم الفاتورة أو الإيصال..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              تسجيل وحفظ السند
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
