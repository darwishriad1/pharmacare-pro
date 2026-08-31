import React from 'react';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Receipt,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { excelService } from '../../services/excelService';

interface ComprehensiveReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodTitle: string;
  dateRangeStr: string;
  stats: {
    salesTotal: number;
    costTotal: number;
    grossProfit: number;
    grossMargin: number;
    expensesTotal: number;
    netProfit: number;
    netMargin: number;
    invoicesCount: number;
    itemsSoldCount: number;
    averageInvoiceValue: number;
    cashSales: number;
    cardSales: number;
    creditSales: number;
    purchasesTotal?: number;
    supplierDebtsTotal?: number;
    customerDebtsTotal?: number;
    bestSellers?: Array<{ name: string; qty: number; revenue: number; profit: number; margin: number }>;
  };
}

export const ComprehensiveReportPrintModal: React.FC<ComprehensiveReportPrintModalProps> = ({
  isOpen,
  onClose,
  periodTitle,
  dateRangeStr,
  stats,
}) => {
  const { settings, formatCurrency, showToast } = useSettingsStore();
  const { currentUser } = useAuthStore();

  if (!isOpen) return null;

  const handlePrintA4 = () => {
    printerService.printPeriodicFinancialReport(
      {
        periodTitle,
        dateRangeStr,
        salesTotal: stats.salesTotal,
        costTotal: stats.costTotal,
        grossProfit: stats.grossProfit,
        grossMargin: stats.grossMargin,
        expensesTotal: stats.expensesTotal,
        netProfit: stats.netProfit,
        netMargin: stats.netMargin,
        invoicesCount: stats.invoicesCount,
        itemsSoldCount: stats.itemsSoldCount,
        averageInvoiceValue: stats.averageInvoiceValue,
        cashSales: stats.cashSales,
        cardSales: stats.cardSales,
        creditSales: stats.creditSales,
        purchasesTotal: stats.purchasesTotal,
        supplierDebtsTotal: stats.supplierDebtsTotal,
        customerDebtsTotal: stats.customerDebtsTotal,
        bestSellers: stats.bestSellers,
      },
      settings,
      currentUser?.name
    );
    showToast('جاري فتح نافذة طباعة التقرير المالي A4', 'info');
    onClose();
  };

  const handlePrintThermal = () => {
    printerService.printDailyFinancialReport(
      {
        salesTotal: stats.salesTotal,
        costTotal: stats.costTotal,
        grossProfit: stats.grossProfit,
        expensesTotal: stats.expensesTotal,
        netProfit: stats.netProfit,
        invoicesCount: stats.invoicesCount,
        cashSales: stats.cashSales,
        cardSales: stats.cardSales,
        creditSales: stats.creditSales,
      },
      settings,
      currentUser?.name
    );
    showToast('جاري فتح نافذة طباعة إيصال تقفيل الوردية الحراري', 'info');
    onClose();
  };

  const handleExportCSV = () => {
    excelService.exportFinancialReportToCSV({
      periodTitle,
      dateRangeStr,
      salesTotal: stats.salesTotal,
      costTotal: stats.costTotal,
      grossProfit: stats.grossProfit,
      grossMargin: stats.grossMargin,
      expensesTotal: stats.expensesTotal,
      netProfit: stats.netProfit,
      netMargin: stats.netMargin,
      invoicesCount: stats.invoicesCount,
      itemsSoldCount: stats.itemsSoldCount,
      cashSales: stats.cashSales,
      cardSales: stats.cardSales,
      creditSales: stats.creditSales,
      purchasesTotal: stats.purchasesTotal,
      supplierDebtsTotal: stats.supplierDebtsTotal,
      customerDebtsTotal: stats.customerDebtsTotal,
    });
    showToast('تم تصدير التقرير المالي كملف CSV بنجاح', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-teal-300 border border-white/15">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">مركز طباعة وتصدير التقارير المالية</h3>
              <p className="text-xs text-teal-200/80">
                {periodTitle} • ({dateRangeStr})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Overview Preview */}
        <div className="p-4 sm:p-5 space-y-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">إجمالي المبيعات</div>
              <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(stats.salesTotal)}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">مجمل الربح</div>
              <div className="font-mono font-bold text-teal-700 mt-1">{formatCurrency(stats.grossProfit)}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">المصروفات</div>
              <div className="font-mono font-bold text-rose-600 mt-1">{formatCurrency(stats.expensesTotal)}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50">
              <div className="text-emerald-900 font-bold">صافي الربح</div>
              <div className="font-mono font-black text-emerald-700 mt-1">{formatCurrency(stats.netProfit)}</div>
            </div>
          </div>
        </div>

        {/* Printing Options */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="text-xs font-bold text-slate-700 mb-1">اختر صيغة التقرير المطلوبة:</div>

          {/* Option 1: Official A4 Periodic Report */}
          <div
            onClick={handlePrintA4}
            className="p-3.5 sm:p-4 rounded-2xl border-2 border-teal-200 bg-teal-50/30 hover:bg-teal-50 hover:border-teal-500 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-teal-600 text-white shadow-2xs group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">تقرير مالي رسمي شامل (قياس A4)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  يتضمن قائمة الدخل الكاملة، حركة النقد، الأصناف الأكثر ربحية، وتوقيعات الإدارة
                </div>
              </div>
            </div>
            <Printer className="w-5 h-5 text-teal-600 shrink-0" />
          </div>

          {/* Option 2: Thermal Z-Report */}
          <div
            onClick={handlePrintThermal}
            className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-teal-400 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-slate-800 text-white shadow-2xs group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">إيصال تقفيل الوردية والخزينة (طابعة حرارية 80mm/58mm)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  موجز سريع لجرد الكاشير وتوزيع المقبوضات وصافي الأرباح لدرج الصندوق
                </div>
              </div>
            </div>
            <Printer className="w-5 h-5 text-slate-600 shrink-0" />
          </div>

          {/* Option 3: Excel CSV Export */}
          <div
            onClick={handleExportCSV}
            className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-700 text-white shadow-2xs group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">تصدير جدول البيانات المالية (CSV / Excel)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  تنزيل ملف إكسل بكافة الأرقام والمؤشرات لإجراء التحليلات الإضافية
                </div>
              </div>
            </div>
            <Download className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
