import React, { useState } from 'react';
import {
  Award,
  Receipt,
  ShoppingCart,
  Truck,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  User,
  ChevronLeft,
  Eye,
  CreditCard
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { SaleInvoice } from '../../types';

export interface TopSellingItem {
  id: string;
  name: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  grossProfit: number;
  currentStock: number;
}

export interface ActivityItem {
  id: string;
  type: 'sale' | 'purchase' | 'customer_payment' | 'expense';
  title: string;
  subtext: string;
  amount: number;
  time: string;
  badgeText: string;
  badgeType: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  rawItem?: any;
}

interface DashboardRecentActivityProps {
  topSellers: TopSellingItem[];
  recentActivities: ActivityItem[];
  onNavigateToInvoices: () => void;
  onNavigateToReports: () => void;
}

export const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({
  topSellers,
  recentActivities,
  onNavigateToInvoices,
  onNavigateToReports,
}) => {
  const { formatCurrency } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'top_sellers' | 'activities'>('top_sellers');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 select-none">
      
      {/* 1. Top Selling Medications Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                الأدوية الأكثر مبيعاً وطلباً
              </h3>
              <p className="text-xs text-slate-500">
                ترتيب الأصناف بحسب حجم الإيرادات والكميات المباعة
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToReports}
            className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>تقرير الأصناف</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Sellers List */}
        <div className="mt-3.5 space-y-2.5">
          {topSellers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              لم تسجل عمليات بيع في هذه الفترة
            </div>
          ) : (
            topSellers.slice(0, 5).map((item, index) => {
              const rankColor =
                index === 0
                  ? 'bg-amber-400 text-amber-950 font-black'
                  : index === 1
                  ? 'bg-slate-300 text-slate-900 font-bold'
                  : index === 2
                  ? 'bg-amber-700/80 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 font-semibold';

              return (
                <div
                  key={item.id || index}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-teal-50/50 hover:border-teal-200 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg ${rankColor} flex items-center justify-center text-xs font-mono shrink-0 shadow-2xs`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate text-xs sm:text-sm">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>
                          الكمية: <b className="font-mono text-slate-700">{item.quantitySold}</b>
                        </span>
                        <span>•</span>
                        <span>
                          المخزون الحالي: <b className="font-mono text-slate-700">{item.currentStock}</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">
                      {formatCurrency(item.totalRevenue)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold font-mono mt-0.5">
                      ربح: {formatCurrency(item.grossProfit)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي الأصناف المتميزة في الصدارة:</span>
          <span className="font-bold font-mono text-slate-700">{topSellers.length} صنف</span>
        </div>
      </div>

      {/* 2. Live Recent Transactions Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                سجل العمليات الحية الأخيرة
              </h3>
              <p className="text-xs text-slate-500">
                أحدث فواتير المبيعات، المشتريات، وسندات الصرف والقبض
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToInvoices}
            className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>سجل الفواتير</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Activity Stream */}
        <div className="mt-3.5 space-y-2.5">
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              لا توجد عمليات حديثة حتى الآن
            </div>
          ) : (
            recentActivities.slice(0, 5).map((act) => {
              const iconMap = {
                sale: ShoppingCart,
                purchase: Truck,
                customer_payment: Receipt,
                expense: Coins,
              };
              const Icon = iconMap[act.type] || Receipt;

              const badgeColors = {
                emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                sky: 'bg-sky-100 text-sky-800 border-sky-200',
                amber: 'bg-amber-100 text-amber-800 border-amber-200',
                rose: 'bg-rose-100 text-rose-800 border-rose-200',
                slate: 'bg-slate-100 text-slate-800 border-slate-200',
              }[act.badgeType];

              return (
                <div
                  key={act.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <Icon className="w-4 h-4 text-teal-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate text-xs sm:text-sm">
                          {act.title}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeColors}`}>
                          {act.badgeText}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                        <span>{act.subtext}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{act.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0 font-mono">
                    <div
                      className={`font-black text-xs sm:text-sm ${
                        act.type === 'sale' || act.type === 'customer_payment'
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {act.type === 'sale' || act.type === 'customer_payment' ? '+' : '-'}
                      {formatCurrency(act.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>التحديث التلقائي:</span>
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            نشط ولحظي
          </span>
        </div>
      </div>

    </div>
  );
};
