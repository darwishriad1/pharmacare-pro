import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DashboardMetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  badge?: {
    text: string;
    variant?: 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo' | 'purple' | 'slate';
  };
  colorTheme?: 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo' | 'purple' | 'slate';
  onClick?: () => void;
  actionLabel?: string;
  extraDetails?: { label: string; value: string }[];
}

export const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  colorTheme = 'teal',
  onClick,
  actionLabel,
  extraDetails,
}) => {
  // Theme color styles
  const themeStyles = {
    teal: {
      bg: 'bg-teal-50/60 hover:bg-teal-50/90',
      border: 'border-teal-200/80',
      iconBg: 'bg-teal-600 text-white',
      textColor: 'text-teal-950',
      subtextColor: 'text-teal-700',
      badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    emerald: {
      bg: 'bg-emerald-50/60 hover:bg-emerald-50/90',
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-950',
      subtextColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    amber: {
      bg: 'bg-amber-50/60 hover:bg-amber-50/90',
      border: 'border-amber-200/80',
      iconBg: 'bg-amber-600 text-white',
      textColor: 'text-amber-950',
      subtextColor: 'text-amber-700',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    rose: {
      bg: 'bg-rose-50/60 hover:bg-rose-50/90',
      border: 'border-rose-200/80',
      iconBg: 'bg-rose-600 text-white',
      textColor: 'text-rose-950',
      subtextColor: 'text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    sky: {
      bg: 'bg-sky-50/60 hover:bg-sky-50/90',
      border: 'border-sky-200/80',
      iconBg: 'bg-sky-600 text-white',
      textColor: 'text-sky-950',
      subtextColor: 'text-sky-700',
      badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    },
    indigo: {
      bg: 'bg-indigo-50/60 hover:bg-indigo-50/90',
      border: 'border-indigo-200/80',
      iconBg: 'bg-indigo-600 text-white',
      textColor: 'text-indigo-950',
      subtextColor: 'text-indigo-700',
      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    purple: {
      bg: 'bg-purple-50/60 hover:bg-purple-50/90',
      border: 'border-purple-200/80',
      iconBg: 'bg-purple-600 text-white',
      textColor: 'text-purple-950',
      subtextColor: 'text-purple-700',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    slate: {
      bg: 'bg-slate-50 hover:bg-slate-100/80',
      border: 'border-slate-200',
      iconBg: 'bg-slate-700 text-white',
      textColor: 'text-slate-900',
      subtextColor: 'text-slate-600',
      badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
    },
  }[colorTheme];

  return (
    <div
      id={id}
      onClick={onClick}
      className={`rounded-2xl border ${themeStyles.border} bg-white shadow-xs p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top Bar: Icon, Title & Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${themeStyles.iconBg} flex items-center justify-center shadow-xs shrink-0`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-600 block leading-tight">{title}</span>
            {subtitle && <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{subtitle}</span>}
          </div>
        </div>

        {badge && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${themeStyles.badgeBg} shrink-0`}>
            {badge.text}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-3.5 pt-1 flex items-baseline justify-between gap-2">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight leading-none">
          {value}
        </div>

        {trend && (
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
              trend.isNeutral
                ? 'bg-slate-100 text-slate-600'
                : trend.isPositive
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
            title={trend.label}
          >
            {trend.isNeutral ? (
              <Minus className="w-3 h-3" />
            ) : trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="font-mono">{trend.value}</span>
          </div>
        )}
      </div>

      {/* Extra details (optional footer list) */}
      {extraDetails && extraDetails.length > 0 && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
          {extraDetails.map((detail, idx) => (
            <div key={idx} className="flex items-center justify-between gap-1 text-slate-500">
              <span className="truncate">{detail.label}:</span>
              <span className="font-bold text-slate-800 font-mono">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action link if clickable */}
      {actionLabel && (
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-teal-700 font-bold group-hover:underline">
          <span>{actionLabel}</span>
          <span>←</span>
        </div>
      )}
    </div>
  );
};
