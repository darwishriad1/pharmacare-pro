import React, { useState, useEffect } from 'react';
import { db } from '../../database/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePOSStore } from '../../stores/usePOSStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Database, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { formatCurrency, setShortcutsModalOpen, setActiveTab } = useSettingsStore();
  const [totalProducts, setTotalProducts] = useState(0);
  const [nearExpiryCount, setNearExpiryCount] = useState(0);
  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);

  const updateStats = () => {
    const products = db.getProducts();
    const batches = db.getBatches();
    const sales = db.getSales();
    const today = new Date().toISOString().split('T')[0];

    const todaySales = sales.filter((s) => s.date === today && s.status !== 'cancelled');
    const totalToday = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + 90);

    const expiringBatches = batches.filter((b) => {
      if (b.quantity <= 0) return false;
      const exp = new Date(b.expiryDate);
      return exp <= thresholdDate;
    });

    setTotalProducts(products.length);
    setNearExpiryCount(expiringBatches.length);
    setTodaySalesTotal(totalToday);
    setTodaySalesCount(todaySales.length);
  };

  useEffect(() => {
    updateStats();
    const unsub = db.subscribe(updateStats);
    return unsub;
  }, []);

  return (
    <footer className="bg-slate-900 border-t border-slate-800 px-4 py-1.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3 select-none z-20">
      {/* Left items: Cashier, Database Status, Stock info */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>المستخدم: <strong className="text-white">{currentUser?.name}</strong></span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5 cursor-pointer hover:text-white" onClick={() => setActiveTab('products')}>
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>الأصناف المسجلة: <strong className="text-slate-200">{totalProducts}</strong></span>
        </div>

        <span className="text-slate-700">|</span>

        {nearExpiryCount > 0 ? (
          <div
            className="flex items-center gap-1 text-amber-400 font-medium cursor-pointer hover:underline"
            onClick={() => setActiveTab('inventory')}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>تنبيه صلاحيات قريبة / منتهية: <strong>{nearExpiryCount}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>جميع الصلاحيات سليمة</span>
          </div>
        )}
      </div>

      {/* Right items: Today Sales Counter & Quick Keyboard Legend */}
      <div className="flex items-center gap-3">
        <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200 flex items-center gap-2">
          <span>مبيعات اليوم:</span>
          <span className="font-bold text-emerald-400">{formatCurrency(todaySalesTotal)}</span>
          <span className="text-[10px] text-slate-400">({todaySalesCount} فاتورة)</span>
        </div>

        <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">F1 مساعدة</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">F2 تعليق</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">F4 بحث</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">F10 دفع</span>
        </div>
      </div>
    </footer>
  );
};
