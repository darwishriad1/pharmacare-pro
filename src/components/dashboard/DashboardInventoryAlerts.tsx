import React from 'react';
import {
  AlertTriangle,
  Clock,
  PackageX,
  Package,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  Boxes
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Product, Batch } from '../../types';

interface DashboardInventoryAlertsProps {
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  expiringBatches: (Batch & { daysRemaining: number })[];
  onNavigateToInventory: () => void;
  onNavigateToPurchases: () => void;
}

export const DashboardInventoryAlerts: React.FC<DashboardInventoryAlertsProps> = ({
  lowStockProducts,
  outOfStockProducts,
  expiringBatches,
  onNavigateToInventory,
  onNavigateToPurchases,
}) => {
  const { formatCurrency } = useSettingsStore();

  const totalAlerts = lowStockProducts.length + outOfStockProducts.length + expiringBatches.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                تنبيهات المخزون والنواقص والصلاحية
              </h3>
              {totalAlerts > 0 && (
                <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2 py-0.5 rounded-full border border-rose-200">
                  {totalAlerts} تنبيه نشط
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              متابعة الأدوية المنتهية، النواقص، والأصناف تحت حد الطلب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToPurchases}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>طلب نواقص المشتريات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNavigateToInventory}
            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>إدارة المخزون</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of Alert Columns */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Column 1: Expiring Soon Batches */}
        <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>أدوية قريبة الصلاحية (أقل من 90 يوم)</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                {expiringBatches.length} دفعات
              </span>
            </div>

            {expiringBatches.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                <span className="text-emerald-700 font-bold">✓ كافة الدفعات صالحة وبعيدة عن الانتهاء</span>
                <span className="text-[11px] text-slate-400">لا توجد أدوية تنتهي خلال الفترة القريبة</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {expiringBatches.slice(0, 4).map((batch) => (
                  <div
                    key={batch.id}
                    className="p-2.5 rounded-lg bg-white border border-amber-200/70 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[200px]">
                        {batch.productName || 'دواء غير محدد'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>تشغيلة: <b className="font-mono text-slate-700">{batch.batchNumber}</b></span>
                        <span>•</span>
                        <span>متبقي: <b className="font-mono text-slate-700">{batch.quantity} عبوة</b></span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-200 block">
                        {batch.daysRemaining <= 0 ? 'منتهي' : `${batch.daysRemaining} يوم`}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{batch.expiryDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Low Stock & Out of Stock */}
        <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <span>النواقص والكميات الحرجة</span>
              </div>
              <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                {lowStockProducts.length + outOfStockProducts.length} صنف
              </span>
            </div>

            {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                <span className="text-emerald-700 font-bold">✓ كافة الأصناف متوفرة بأرصدة كافية</span>
                <span className="text-[11px] text-slate-400">لا توجد نواقص تحت حد الطلب حالياً</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {/* Out of Stock first */}
                {outOfStockProducts.slice(0, 2).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-2.5 rounded-lg bg-white border border-rose-200/80 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[200px]">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {prod.category} • سعر البيع: <b className="font-mono">{formatCurrency(prod.price)}</b>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white font-mono block">
                        نفد بالكامل (0)
                      </span>
                      <span className="text-[9px] text-rose-600 block mt-0.5">حد الطلب: {prod.minStock}</span>
                    </div>
                  </div>
                ))}

                {/* Low Stock next */}
                {lowStockProducts.slice(0, 2).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-2.5 rounded-lg bg-white border border-amber-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[200px]">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {prod.category} • حد الطلب: <b className="font-mono">{prod.minStock}</b>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono block">
                        متبقي {prod.totalQuantity} عبوة
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
