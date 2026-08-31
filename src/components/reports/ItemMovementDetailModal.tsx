import React from 'react';
import {
  X,
  Package,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  DollarSign,
  Layers,
  Calendar,
  User,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  ShoppingCart,
  Percent,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { db } from '../../database/db';

export interface ItemMovementRecord {
  id: string;
  name: string;
  scientificName?: string;
  barcode: string;
  category: string;
  form?: string;
  strength?: string;
  costPrice: number;
  sellingPrice: number;
  minStock: number;
  locationRack?: string;
  
  // Quantities
  incomingQty: number; // إجمالي الوارد (مشتريات + رصيد افتتاحي)
  soldQty: number;     // إجمالي المنصرف/المباع
  returnedQty: number; // المرتجع
  remainingQty: number;// الرصيد المتبقي
  
  // Financials
  revenue: number;     // إيراد المبيعات
  costOfSold: number;  // تكلفة المباع
  profit: number;      // صافي ربح المباع
  margin: number;      // هامش الربح %
  remainingCostValue: number; // قيمة المخزون المتبقي بالتكلفة
  remainingSellValue: number; // قيمة المخزون المتبقي بالبيع
  
  // Status
  movementStatus: 'fast' | 'medium' | 'stagnant' | 'out_of_stock' | 'low_stock';
  lastSaleDate?: string;
  lastPurchaseDate?: string;
}

interface ItemMovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemMovementRecord | null;
  dateRangeStr: string;
}

export const ItemMovementDetailModal: React.FC<ItemMovementDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  dateRangeStr,
}) => {
  const { formatCurrency } = useSettingsStore();

  if (!isOpen || !item) return null;

  // Retrieve chronological transactions for this product
  const allSales = db.getSales().filter((s) => s.status !== 'returned');
  const allPurchases = db.getPurchaseInvoices();
  const allBatches = db.getBatches().filter((b) => b.productId === item.id);

  // Extract sales records
  const salesHistory: Array<{
    type: 'sale';
    date: string;
    time: string;
    invoiceNumber: string;
    customerName: string;
    cashierName: string;
    qty: number;
    unitPrice: number;
    total: number;
    cost: number;
    profit: number;
  }> = [];

  allSales.forEach((s) => {
    s.items.forEach((ci) => {
      if (ci.product.id === item.id || ci.product.name === item.name) {
        const pkgQty = ci.quantity * (ci.unitMultiplier || 1);
        const cost = (item.costPrice || ci.unitPrice * 0.7) * pkgQty;
        const profit = ci.total - cost;
        salesHistory.push({
          type: 'sale',
          date: s.date,
          time: s.time,
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName || 'عميل نقدي',
          cashierName: s.cashierName || 'كاشير',
          qty: ci.quantity,
          unitPrice: ci.unitPrice,
          total: ci.total,
          cost,
          profit,
        });
      }
    });
  });

  // Extract purchases records
  const purchasesHistory: Array<{
    type: 'purchase';
    date: string;
    invoiceNumber: string;
    supplierName: string;
    batchNumber: string;
    expiryDate: string;
    qty: number;
    costPrice: number;
    total: number;
  }> = [];

  allPurchases.forEach((p) => {
    p.items.forEach((pi) => {
      if (pi.productId === item.id || pi.productName === item.name || pi.barcode === item.barcode) {
        purchasesHistory.push({
          type: 'purchase',
          date: p.date,
          invoiceNumber: p.invoiceNumber,
          supplierName: p.supplierName || 'مورد عام',
          batchNumber: pi.batchNumber || '-',
          expiryDate: pi.expiryDate || '-',
          qty: pi.quantity,
          costPrice: pi.costPrice,
          total: pi.total || pi.quantity * pi.costPrice,
        });
      }
    });
  });

  // Combine and sort chronologically (newest first)
  const combinedLog = [
    ...salesHistory.map((s) => ({ ...s, sortDate: `${s.date} ${s.time}` })),
    ...purchasesHistory.map((p) => ({ ...p, sortDate: `${p.date} 00:00`, time: '00:00', customerName: '', cashierName: '', unitPrice: 0, cost: p.total, profit: 0 })),
  ].sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in select-none text-right font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-teal-100 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">{item.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/30 text-teal-200 border border-teal-400/40">
                  {item.barcode}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/15 text-slate-200">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                {item.scientificName ? `الاسم العلمي: ${item.scientificName}` : 'كشف حساب وحركة الصنف التفصيلي'}
                {item.locationRack && ` • موقع الرف: ${item.locationRack}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Summary KPI Cards for this specific Item */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Incoming */}
            <div className="bg-sky-50/70 border border-sky-200 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-sky-800 font-bold text-[11px]">
                <span>إجمالي الوارد (الكمية):</span>
                <ArrowDownLeft className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-sky-950 mt-1">
                {item.incomingQty} <span className="text-xs font-normal text-slate-500">عبوة</span>
              </div>
              <div className="text-[10px] text-sky-700 mt-0.5">
                شراء + رصيد بداية
              </div>
            </div>

            {/* Sold */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px]">
                <span>الكمية المباعة (المنصرف):</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-emerald-950 mt-1">
                {item.soldQty} <span className="text-xs font-normal text-slate-500">عبوة</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5 font-bold">
                إيراد: {formatCurrency(item.revenue)}
              </div>
            </div>

            {/* Remaining */}
            <div className={`p-3 rounded-2xl border ${
              item.remainingQty <= 0
                ? 'bg-rose-50 border-rose-200'
                : item.remainingQty <= item.minStock
                ? 'bg-amber-50 border-amber-200'
                : 'bg-teal-50 border-teal-200'
            }`}>
              <div className="flex items-center justify-between font-bold text-[11px]">
                <span className={item.remainingQty <= 0 ? 'text-rose-800' : 'text-teal-800'}>
                  الرصيد المتبقي بالمخزن:
                </span>
                <Layers className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-slate-900 mt-1">
                {item.remainingQty} <span className="text-xs font-normal text-slate-500">عبوة</span>
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                تكلفة: {formatCurrency(item.remainingCostValue)}
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-300 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-teal-900 font-bold text-[11px]">
                <span>صافي أرباح الصنف:</span>
                <TrendingUp className="w-4 h-4 text-teal-700" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-teal-950 mt-1">
                {formatCurrency(item.profit)}
              </div>
              <div className="text-[10px] text-teal-800 mt-0.5 font-bold">
                هامش ربح: <span className="font-mono">{item.margin}%</span>
              </div>
            </div>
          </div>

          {/* Pricing & Valuation Bar */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-slate-500 block text-[10px]">سعر الشراء (التكلفة):</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(item.costPrice)}</span>
              </div>
              <div className="border-r border-slate-300 pr-4">
                <span className="text-slate-500 block text-[10px]">سعر البيع المعتمد:</span>
                <span className="font-mono font-bold text-teal-700 text-sm">{formatCurrency(item.sellingPrice)}</span>
              </div>
              <div className="border-r border-slate-300 pr-4">
                <span className="text-slate-500 block text-[10px]">ربح العبوة الواحدة:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatCurrency(item.sellingPrice - item.costPrice)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">قيمة المخزون المتبقي بسعر البيع:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {formatCurrency(item.remainingSellValue)}
              </span>
            </div>
          </div>

          {/* Batches Table (تشغيلات الدواء الحالية بالمستودع) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                تشغيلات ودفعات الصنف المتوفرة في المخزن ({allBatches.length} تشغيلة)
              </span>
              <span className="text-[10px] text-slate-500">حسب سياسة FIFO / FEFO</span>
            </div>

            {/* Mobile Batches Card View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 p-2 space-y-2 bg-slate-50/50 max-h-48 overflow-y-auto">
              {allBatches.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-white rounded-xl">
                  لا توجد تشغيلات مسجلة بالمخزن حالياً
                </div>
              ) : (
                allBatches.map((b) => {
                  const isExpired = new Date(b.expiryDate) < new Date();
                  return (
                    <div key={b.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{b.batchNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.quantity <= 0
                            ? 'bg-slate-100 text-slate-600'
                            : isExpired
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {b.quantity <= 0 ? 'منتهية' : isExpired ? 'منتهية الصلاحية' : 'نشطة'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center font-mono text-[11px] pt-1">
                        <div className="bg-slate-50 p-1 rounded-lg">
                          <div className="text-[9px] text-slate-400 font-sans">الكمية</div>
                          <div className="font-bold text-teal-800">{b.quantity} عبوة</div>
                        </div>
                        <div className="bg-slate-50 p-1 rounded-lg">
                          <div className="text-[9px] text-slate-400 font-sans">الانتهاء</div>
                          <div className={isExpired ? 'text-rose-600 font-bold' : 'text-slate-700'}>{b.expiryDate}</div>
                        </div>
                        <div className="bg-slate-50 p-1 rounded-lg">
                          <div className="text-[9px] text-slate-400 font-sans">سعر البيع</div>
                          <div className="font-bold text-slate-800">{formatCurrency(b.sellingPrice)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Batches Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-2.5">رقم التشغيلة (Batch #)</th>
                    <th className="p-2.5">تاريخ الانتهاء</th>
                    <th className="p-2.5 text-center">الكمية المتوفرة</th>
                    <th className="p-2.5 text-left">سعر التكلفة</th>
                    <th className="p-2.5 text-left">سعر البيع</th>
                    <th className="p-2.5">المورد</th>
                    <th className="p-2.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        لا توجد تشغيلات مسجلة بالمخزن حالياً
                      </td>
                    </tr>
                  ) : (
                    allBatches.map((b) => {
                      const isExpired = new Date(b.expiryDate) < new Date();
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                          <td className="p-2.5 font-mono">
                            <span className={isExpired ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {b.expiryDate}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-teal-800">
                            {b.quantity} عبوة
                          </td>
                          <td className="p-2.5 text-left font-mono text-slate-700">{formatCurrency(b.costPrice)}</td>
                          <td className="p-2.5 text-left font-mono text-teal-700 font-bold">{formatCurrency(b.sellingPrice)}</td>
                          <td className="p-2.5 text-slate-600">{b.supplierName || 'مورد عام'}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.quantity <= 0
                                ? 'bg-slate-100 text-slate-600'
                                : isExpired
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {b.quantity <= 0 ? 'منتهية الكمية' : isExpired ? 'منتهية الصلاحية' : 'نشطة بالمخزن'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chronological Movement Ledger (سجل الحركات الزمني - فواتير الشراء والبيع) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-teal-600" />
                سجل حركات الوارد والمنصرف التفصيلي ({combinedLog.length} حركة مسجلة)
              </span>
              <span className="text-[10px] text-slate-500">مبيعات ومشتريات</span>
            </div>

            {/* Mobile Movement Ledger (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 p-2 space-y-2 bg-slate-50/50 max-h-56 overflow-y-auto">
              {combinedLog.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-white rounded-xl">
                  لا توجد حركات بيع أو شراء مسجلة لهذا الصنف حتى الآن
                </div>
              ) : (
                combinedLog.map((log, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {log.type === 'purchase' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-[10px]">
                            <ArrowDownLeft className="w-3 h-3" /> وارد (+{log.qty})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <ArrowUpRight className="w-3 h-3" /> مباع (-{log.qty})
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-900">{log.invoiceNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.date}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                      <span>{log.type === 'purchase' ? (log as any).supplierName || 'مورد' : (log as any).customerName || 'عميل'}</span>
                      <div className="font-mono font-bold text-slate-900">
                        {formatCurrency(log.total)}
                        {log.type === 'sale' && (
                          <span className="text-emerald-700 font-normal mr-1">(+{formatCurrency((log as any).profit)})</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Movement Table (>= md) */}
            <div className="hidden md:block overflow-x-auto max-h-60">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] sticky top-0">
                  <tr>
                    <th className="p-2.5">نوع الحركة</th>
                    <th className="p-2.5">التاريخ والوقت</th>
                    <th className="p-2.5">رقم الفاتورة / المرجع</th>
                    <th className="p-2.5">الجهة / العميل / المورد</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-left">السعر الإفرادي</th>
                    <th className="p-2.5 text-left">إجمالي القيمة</th>
                    <th className="p-2.5 text-left">الربح المحقق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combinedLog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        لا توجد حركات بيع أو شراء مسجلة لهذا الصنف حتى الآن
                      </td>
                    </tr>
                  ) : (
                    combinedLog.map((log, idx) => (
                      <tr key={idx} className={log.type === 'purchase' ? 'bg-sky-50/30' : 'hover:bg-slate-50'}>
                        <td className="p-2.5">
                          {log.type === 'purchase' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-[10px]">
                              <ArrowDownLeft className="w-3 h-3" /> وارد (شراء)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <ArrowUpRight className="w-3 h-3" /> منصرف (بيع)
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                          {log.date} {log.time && log.time !== '00:00' ? log.time : ''}
                        </td>

                        <td className="p-2.5 font-mono font-bold text-slate-800">
                          {log.invoiceNumber}
                        </td>

                        <td className="p-2.5 text-slate-700">
                          {log.type === 'purchase'
                            ? (log as any).supplierName || 'مورد'
                            : (log as any).customerName || 'عميل نقدي'}
                        </td>

                        <td className="p-2.5 text-center font-mono font-bold">
                          <span className={log.type === 'purchase' ? 'text-sky-700' : 'text-emerald-700'}>
                            {log.type === 'purchase' ? `+${log.qty}` : `-${log.qty}`}
                          </span>
                        </td>

                        <td className="p-2.5 text-left font-mono text-slate-600">
                          {formatCurrency(log.type === 'purchase' ? (log as any).costPrice : (log as any).unitPrice)}
                        </td>

                        <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                          {formatCurrency(log.total)}
                        </td>

                        <td className="p-2.5 text-left font-mono font-bold">
                          {log.type === 'sale' ? (
                            <span className="text-emerald-700">+{formatCurrency((log as any).profit)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            كشف حساب حركة الصنف متزامن مع قاعدة البيانات المحلية لحظياً
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            إغلاق الكشف
          </button>
        </div>

      </div>
    </div>
  );
};
