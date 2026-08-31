import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Coins,
  Receipt,
  PieChart as PieChartIcon,
  BarChart2,
  Calendar,
  Layers
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface SalesTrendPoint {
  label: string;
  sales: number;
  profit: number;
  count: number;
}

interface PaymentDistribution {
  cash: number;
  card: number;
  credit: number;
  total: number;
}

interface DashboardChartsProps {
  salesTrend: SalesTrendPoint[];
  payments: PaymentDistribution;
  costBreakdown: {
    revenue: number;
    cost: number;
    expenses: number;
    netProfit: number;
  };
  timePeriodLabel: string;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  salesTrend,
  payments,
  costBreakdown,
  timePeriodLabel,
}) => {
  const { formatCurrency } = useSettingsStore();
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  // Maximum value for scaling the sales trend chart
  const maxSaleValue = Math.max(...salesTrend.map((p) => p.sales), 100);

  // Percentages for payment methods
  const totalPayments = Math.max(payments.total, 1);
  const cashPct = Math.round((payments.cash / totalPayments) * 100);
  const cardPct = Math.round((payments.card / totalPayments) * 100);
  const creditPct = Math.round((payments.credit / totalPayments) * 100);

  // Percentages for cost structure
  const totalRev = Math.max(costBreakdown.revenue, 1);
  const costPct = Math.min(100, Math.round((costBreakdown.cost / totalRev) * 100));
  const expPct = Math.min(100, Math.round((costBreakdown.expenses / totalRev) * 100));
  const profitPct = Math.max(0, 100 - costPct - expPct);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 select-none">
      
      {/* 1. Main Sales & Profit Trend (Spans 2 columns on desktop) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                منحنى حركة المبيعات والأرباح
              </h3>
              <p className="text-xs text-slate-500">
                توزيع الإيرادات والأرباح التقديرية ({timePeriodLabel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-teal-600 inline-block" />
              <span>المبيعات</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
              <span>الأرباح</span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="mt-4 pt-2">
          {salesTrend.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <BarChart2 className="w-8 h-8 text-slate-300 stroke-1" />
              <span>لا توجد بيانات مبيعات مسجلة في هذه الفترة</span>
            </div>
          ) : (
            <div className="relative">
              {/* Tooltip Overlay if active */}
              {activeBarIndex !== null && salesTrend[activeBarIndex] && (
                <div className="absolute top-0 right-4 z-10 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs shadow-lg animate-in fade-in duration-150 flex items-center gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">الفترة:</span>
                    <span className="font-bold">{salesTrend[activeBarIndex].label}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-slate-400 text-[10px] block">المبيعات:</span>
                    <span className="font-mono font-bold text-teal-300">
                      {formatCurrency(salesTrend[activeBarIndex].sales)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-slate-400 text-[10px] block">الأرباح:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(salesTrend[activeBarIndex].profit)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-slate-400 text-[10px] block">الفواتير:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {salesTrend[activeBarIndex].count}
                    </span>
                  </div>
                </div>
              )}

              {/* Bar Columns Container */}
              <div className="h-52 pt-8 flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-slate-200">
                {salesTrend.map((point, index) => {
                  const saleHeightPct = Math.max(6, Math.round((point.sales / maxSaleValue) * 100));
                  const profitHeightPct = Math.max(3, Math.round((point.profit / maxSaleValue) * 100));
                  const isHovered = activeBarIndex === index;

                  return (
                    <div
                      key={index}
                      onMouseEnter={() => setActiveBarIndex(index)}
                      onMouseLeave={() => setActiveBarIndex(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                    >
                      <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full pb-0.5">
                        {/* Sales Bar */}
                        <div
                          style={{ height: `${saleHeightPct}%` }}
                          className={`w-full max-w-[18px] sm:max-w-[24px] rounded-t-md transition-all duration-200 ${
                            isHovered
                              ? 'bg-teal-700 shadow-md scale-y-105'
                              : 'bg-teal-600/90 group-hover:bg-teal-700'
                          }`}
                        />
                        {/* Profit Bar */}
                        <div
                          style={{ height: `${profitHeightPct}%` }}
                          className={`w-full max-w-[12px] sm:max-w-[16px] rounded-t-md transition-all duration-200 ${
                            isHovered
                              ? 'bg-emerald-500 shadow-md scale-y-105'
                              : 'bg-emerald-400/90 group-hover:bg-emerald-500'
                          }`}
                        />
                      </div>

                      {/* X-Axis Label */}
                      <span
                        className={`text-[10px] sm:text-[11px] truncate w-full text-center mt-2 transition-colors ${
                          isHovered ? 'font-bold text-teal-800' : 'text-slate-500'
                        }`}
                      >
                        {point.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary stats */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>إجمالي المبيعات بالفترة:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              {formatCurrency(salesTrend.reduce((acc, p) => acc + p.sales, 0))}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span>إجمالي الأرباح التقديرية:</span>
            <span className="font-bold text-emerald-700 font-mono text-sm">
              {formatCurrency(salesTrend.reduce((acc, p) => acc + p.profit, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Payment Methods & Cost Structure (1 column on desktop) */}
      <div className="space-y-4 sm:space-y-6 flex flex-col">
        
        {/* Payment Channels Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex-1">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">قنوات التحصيل والنقد</h3>
              <p className="text-[11px] text-slate-500">طرق الدفع المستخدمة</p>
            </div>
          </div>

          {/* Segmented Bar */}
          <div className="mt-3.5">
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`نقد: ${cashPct}%`}
              />
              <div
                style={{ width: `${cardPct}%` }}
                className="bg-sky-500 transition-all duration-500"
                title={`شبكة/بطاقة: ${cardPct}%`}
              />
              <div
                style={{ width: `${creditPct}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`آجل: ${creditPct}%`}
              />
            </div>

            {/* Breakdown List */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-slate-700">نقد (كاش في الدرج)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900">{formatCurrency(payments.cash)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">({cashPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span className="font-medium text-slate-700">شبكة / بطاقة مدى</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900">{formatCurrency(payments.card)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">({cardPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-medium text-slate-700">ذمم مدينة (آجل عملاء)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900">{formatCurrency(payments.credit)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">({creditPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structure Breakdown Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex-1">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">هيكل الإيرادات والتكاليف</h3>
              <p className="text-[11px] text-slate-500">توزيع التكلفة، المصروفات، والربح الصافي</p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {/* Cost Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">تكلفة البضاعة المباعة (COGS)</span>
                <span className="font-mono font-bold text-slate-800">{costPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${costPct}%` }} className="h-full bg-slate-600 rounded-full" />
              </div>
            </div>

            {/* Expenses Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">المصروفات التشغيلية والنثريات</span>
                <span className="font-mono font-bold text-amber-700">{expPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${expPct}%` }} className="h-full bg-amber-500 rounded-full" />
              </div>
            </div>

            {/* Net Profit Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-700 font-bold">هامش صافي الربح الفعلي</span>
                <span className="font-mono font-bold text-emerald-800">{profitPct}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${profitPct}%` }} className="h-full bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
