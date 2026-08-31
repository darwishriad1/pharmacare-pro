import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Tag,
  Trash2,
  Download,
  TrendingDown
} from 'lucide-react';
import { Expense } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ExpenseModal } from './ExpenseModal';
import { excelService } from '../../services/excelService';

export const ExpensesView: React.FC = () => {
  const { formatCurrency } = useSettingsStore();
  const { hasRole, hasPermission } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [dateFilter, setDateFilter] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const canManageExpenses = hasPermission('expenses_manage') || hasRole(['admin', 'accountant', 'pharmacist']);
  const canDeleteExpense = hasRole(['admin', 'accountant']);

  const refreshData = () => {
    setExpenses(db.getExpenses());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(refreshData);
    return unsub;
  }, []);

  const categories = ['الكل', ...Array.from(new Set(expenses.map((e) => e.category)))];

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.paidBy && e.paidBy.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = categoryFilter === 'الكل' || e.category === categoryFilter;
    const matchesDate = !dateFilter || e.date === dateFilter;

    return matchesSearch && matchesCat && matchesDate;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleDelete = (exp: Expense) => {
    if (confirm(`هل أنت متأكد من حذف سند المصروف (${exp.title}) بمبلغ (${formatCurrency(exp.amount)})؟`)) {
      db.deleteExpense(exp.id);
    }
  };

  const handleExportCSV = () => {
    excelService.exportExpensesToCSV(filteredExpenses);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="bg-white border border-teal-100 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">المصروفات اليومية وسندات الصرف</h1>
            <p className="text-xs text-slate-500">
              تسجيل وضبط المصروفات التشغيلية، الإيجار، الكهرباء والرواتب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-teal-600" />
            تصدير المصروفات (CSV)
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            تسجيل مصروف جديد
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>إجمالي المصروفات المسجلة</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-mono font-black text-rose-600 mt-1">
            {formatCurrency(totalExpenseAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{filteredExpenses.length} سند صرف مسجل</div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>متوسط قيمة السند</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-mono font-black text-amber-600 mt-1">
            {formatCurrency(filteredExpenses.length > 0 ? Math.round(totalExpenseAmount / filteredExpenses.length) : 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">لكل عملية صرف</div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>أعلى بند مصروفات</span>
            <Tag className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            إيجار وكهرباء الصيدلية
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">يشكل النسبة الأكبر من التكاليف</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="ابحث في بيان المصروف، المسؤول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-10 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500 focus:bg-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'الكل' ? 'كافة بنود المصروفات' : c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
            title="تصفية حسب التاريخ"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">البند والتصنيف</th>
                <th className="p-3.5">البيان والتفاصيل</th>
                <th className="p-3.5">المسؤول / الصارف</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">المبلغ المصروف</th>
                {canDeleteExpense && <th className="p-3.5 text-left">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={canDeleteExpense ? 7 : 6} className="p-10 text-center text-slate-400">
                    لا توجد سندات صرف مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-slate-600">{exp.date}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{exp.title}</td>
                    <td className="p-3.5 text-slate-700">{exp.paidBy || 'المسؤول'}</td>
                    <td className="p-3.5 text-slate-500">نقداً (خزينة)</td>
                    <td className="p-3.5 font-mono font-black text-rose-600 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    {canDeleteExpense && (
                      <td className="p-3.5 text-left">
                        <button
                          onClick={() => handleDelete(exp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="حذف سند المصروف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaved={refreshData}
      />
    </div>
  );
};
