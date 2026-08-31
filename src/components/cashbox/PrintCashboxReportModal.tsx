import React, { useRef } from 'react';
import {
  X,
  Printer,
  Building2,
  Calendar,
  User,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Scale,
  Coins,
  Receipt
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface PrintCashboxReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    title: string;
    date: string;
    cashInDrawer: number;
    posCardTotal: number;
    bankTransferTotal: number;
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    salesCash: number;
    customerDebtCash: number;
    cashDeposits: number;
    expensesCash: number;
    supplierPaymentsCash: number;
    cashWithdrawals: number;
    refundsCash: number;
    transactionsCount: number;
  };
}

export const PrintCashboxReportModal: React.FC<PrintCashboxReportModalProps> = ({
  isOpen,
  onClose,
  reportData,
}) => {
  const { settings, formatCurrency } = useSettingsStore();
  const { currentUser } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm">طباعة تقرير الصندوق والحركة المالية</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area Preview */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          <div
            ref={printRef}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto text-slate-800 space-y-4"
          >
            {/* Pharmacy Brand */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
              <h2 className="text-lg font-black text-slate-900">{settings.pharmacyName || 'صيدلية الشفاء'}</h2>
              <p className="text-xs text-slate-500 font-medium">{settings.branchName || 'الفرع الرئيسي'} • {settings.phone}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full font-bold text-xs text-slate-700">
                تقرير حركة الصندوق والخزينة اليومي
              </div>
            </div>

            {/* Meta info */}
            <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span>تاريخ التقرير:</span>
                <span className="font-bold font-mono">{reportData.date}</span>
              </div>
              <div className="flex justify-between">
                <span>المسؤول / الكاشير:</span>
                <span className="font-bold">{currentUser?.name || 'المستخدم'}</span>
              </div>
              <div className="flex justify-between">
                <span>عدد الحركات المسجلة:</span>
                <span className="font-bold font-mono">{reportData.transactionsCount} حركة</span>
              </div>
            </div>

            {/* Core KPI: Cash in drawer */}
            <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl text-center">
              <span className="text-xs font-bold text-teal-800 block">الرصيد النقدي الفعلي في الدرج (Cash)</span>
              <span className="text-2xl font-black font-mono text-teal-700 mt-1 block">
                {formatCurrency(reportData.cashInDrawer)}
              </span>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800 border-b pb-1 flex items-center justify-between text-emerald-700">
                <span>➕ التدفقات النقدية الداخلة (Inflows):</span>
                <span className="font-mono font-black">{formatCurrency(reportData.totalInflows)}</span>
              </div>
              <div className="pr-3 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>• مبيعات نقدية (كاش):</span>
                  <span className="font-mono">{formatCurrency(reportData.salesCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• مقبوضات ديون العملاء:</span>
                  <span className="font-mono">{formatCurrency(reportData.customerDebtCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• إيداعات وتغذية الصندوق:</span>
                  <span className="font-mono">{formatCurrency(reportData.cashDeposits)}</span>
                </div>
              </div>

              <div className="font-bold text-slate-800 border-b pb-1 pt-2 flex items-center justify-between text-rose-700">
                <span>➖ التدفقات النقدية الخارجة (Outflows):</span>
                <span className="font-mono font-black">{formatCurrency(reportData.totalOutflows)}</span>
              </div>
              <div className="pr-3 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>• سندات صرف المصروفات:</span>
                  <span className="font-mono">{formatCurrency(reportData.expensesCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• مدفوعات نقدية للموردين:</span>
                  <span className="font-mono">{formatCurrency(reportData.supplierPaymentsCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• مسحوبات نقدية / توريد بنك:</span>
                  <span className="font-mono">{formatCurrency(reportData.cashWithdrawals)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• مرتجعات مبيعات نقدية:</span>
                  <span className="font-mono">{formatCurrency(reportData.refundsCash)}</span>
                </div>
              </div>

              {/* Electronic methods */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-slate-600">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>💳 مبيعات ومقبوضات الشبكة (POS):</span>
                  <span className="font-mono">{formatCurrency(reportData.posCardTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>🏦 التحويلات البنكية المباشرة:</span>
                  <span className="font-mono">{formatCurrency(reportData.bankTransferTotal)}</span>
                </div>
              </div>

            </div>

            {/* Signature box */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-[10px] text-slate-500 gap-4">
              <div>
                <span>توقيع الكاشير / الصيدلي:</span>
                <div className="h-8 border-b border-dashed border-slate-300 mt-1" />
              </div>
              <div>
                <span>توقيع الإدارة / المدير:</span>
                <div className="h-8 border-b border-dashed border-slate-300 mt-1" />
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-400 pt-1">
              تم إصدار هذا التقرير آلياً عبر نظام إدارة الصيدليات الذكي SmartRx
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الفوري</span>
          </button>
        </div>

      </div>
    </div>
  );
};
