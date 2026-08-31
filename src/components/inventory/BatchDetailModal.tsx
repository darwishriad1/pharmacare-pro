import React from 'react';
import {
  X,
  Package,
  Building,
  DollarSign,
  MapPin,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Layers,
  Pill,
  Scale,
  History
} from 'lucide-react';
import { Batch, Product } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface BatchDetailModalProps {
  isOpen: boolean;
  batch: Batch | null;
  onClose: () => void;
  onOpenAdjustment?: (batch: Batch) => void;
  onOpenHistory?: (batch: Batch) => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  isOpen,
  batch,
  onClose,
  onOpenAdjustment,
  onOpenHistory,
}) => {
  const { formatCurrency } = useSettingsStore();

  if (!isOpen || !batch) return null;

  const product: Product | undefined = db.getProductById(batch.productId);
  const now = new Date();
  const exp = new Date(batch.expiryDate);
  const diffTime = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = exp <= now;
  const isNear30 = !isExpired && diffDays <= 30;
  const isNear90 = !isExpired && diffDays <= 90;

  const totalCost = batch.costPrice * batch.quantity;
  const totalSell = batch.sellingPrice * batch.quantity;
  const profitMargin = totalSell - totalCost;
  const profitPercent = totalCost > 0 ? Math.round((profitMargin / totalCost) * 100) : 0;

  return (
    <div
      id="batch-detail-modal"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-teal-800 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-white truncate">
                {product?.name || batch.productName || 'تفاصيل التشغيلة الدوائية'}
              </h2>
              <p className="text-[11px] text-teal-100 font-mono truncate">
                تشغيلة #{batch.batchNumber} {product?.strength && `• ${product.strength}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Status Banner */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
              batch.quantity <= 0
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : isExpired
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : isNear30
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : isNear90
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {batch.quantity <= 0 ? (
                <Layers className="w-4 h-4 text-slate-500" />
              ) : isExpired ? (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              ) : isNear30 ? (
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              ) : isNear90 ? (
                <Clock className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <div>
                <span className="font-bold block">
                  {batch.quantity <= 0
                    ? 'الكمية نافدة من المخزون (0 عبوة)'
                    : isExpired
                    ? `منتهية الصلاحية منذ ${Math.abs(diffDays)} يوم`
                    : isNear30
                    ? `تنبيه حرج: تنتهي خلال ${diffDays} يوم`
                    : isNear90
                    ? `تنبيه: تنتهي خلال ${diffDays} يوم (~${Math.ceil(diffDays / 30)} شهر)`
                    : `سليمة وصالحة للاستخدام (متبقي ${diffDays} يوم)`}
                </span>
                <span className="text-[10px] opacity-80">
                  تاريخ الانتهاء المحدد: {batch.expiryDate}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-white/80 border border-current">
              {batch.quantity} عبوة
            </span>
          </div>

          {/* Product Specifications Grid */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-teal-700" />
              <span>بيانات الصنف الدوائي والمواصفات:</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">الاسم العلمي:</span>
                <span className="font-medium text-slate-800">{product?.scientificName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">المجموعة والشكل:</span>
                <span className="font-medium text-slate-800">
                  {product?.category || '-'} {product?.form && `(${product.form})`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الشركة والمنشأ:</span>
                <span className="font-medium text-slate-800">
                  {product?.manufacturer || '-'} {product?.country && `• ${product.country}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الباركود الدولي:</span>
                <span className="font-mono text-slate-700">{product?.barcode || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">موقع التخزين / الرف:</span>
                <span className="font-medium text-teal-800 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-teal-600" />
                  {product?.locationRack || 'الرف العام'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">التقسيم الداخلي:</span>
                <span className="font-mono text-slate-700">
                  {product?.stripsPerPackage || 1} أشرطة {product?.piecesPerStrip && `× ${product.piecesPerStrip} حبة`}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Valuation Grid */}
          <div className="bg-teal-50/50 rounded-xl p-3 border border-teal-100 space-y-2">
            <h3 className="font-bold text-teal-900 text-[11px] flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-teal-700" />
              <span>الأسعار وتقييم القيمة المالية للدفعة:</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-teal-100">
                <span className="text-slate-400 block text-[10px]">سعر الشراء (التكلفة)</span>
                <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                  {formatCurrency(batch.costPrice)}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-teal-100">
                <span className="text-slate-400 block text-[10px]">سعر البيع (الجمهور)</span>
                <span className="font-mono font-black text-emerald-700 text-xs mt-0.5 block">
                  {formatCurrency(batch.sellingPrice)}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-teal-100">
                <span className="text-slate-400 block text-[10px]">هامش الربح للعبوة</span>
                <span className="font-mono font-bold text-amber-700 text-xs mt-0.5 block">
                  {formatCurrency(batch.sellingPrice - batch.costPrice)}
                </span>
              </div>
            </div>

            {/* Total Batch Valuation */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-teal-100/60">
              <div className="bg-white/80 p-1.5 rounded-lg">
                <span className="text-slate-500 block text-[9px]">إجمالي التكلفة بالمخزن:</span>
                <span className="font-mono font-black text-slate-900 text-xs">
                  {formatCurrency(totalCost)}
                </span>
              </div>

              <div className="bg-white/80 p-1.5 rounded-lg">
                <span className="text-slate-500 block text-[9px]">إجمالي العائد البيعي:</span>
                <span className="font-mono font-black text-emerald-700 text-xs">
                  {formatCurrency(totalSell)}
                </span>
              </div>

              <div className="bg-white/80 p-1.5 rounded-lg">
                <span className="text-slate-500 block text-[9px]">صافي الربح المتوقع:</span>
                <span className="font-mono font-black text-teal-800 text-xs">
                  {formatCurrency(profitMargin)} ({profitPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Supplier & Receipt Info */}
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">المورد المسجل:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" />
                {batch.supplierName || 'توريد مباشر / رصيد افتتاحي'}
              </span>
            </div>

            <div className="text-left">
              <span className="text-slate-400 block text-[10px]">تاريخ التوريد والاستلام:</span>
              <span className="font-mono font-medium text-slate-700">
                {batch.receivedDate || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-1.5">
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistory(batch);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span>سجل الحركات</span>
              </button>
            )}

            {onOpenAdjustment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdjustment(batch);
                }}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>جرد وتسوية</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
