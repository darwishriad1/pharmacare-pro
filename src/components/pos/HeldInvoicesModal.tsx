import React from 'react';
import { X, Clock, Play, Trash2, ShoppingBag, Pause } from 'lucide-react';
import { usePOSStore } from '../../stores/usePOSStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

export const HeldInvoicesModal: React.FC = () => {
  const { isHeldInvoicesModalOpen, setHeldInvoicesModalOpen, heldInvoices, restoreHeldInvoice, deleteHeldInvoice } =
    usePOSStore();
  const { formatCurrency } = useSettingsStore();

  if (!isHeldInvoicesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-teal-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">الفواتير المعلقة والمؤقتة</h2>
              <p className="text-xs text-teal-100">استرجاع أو حذف الفواتير المحفوظة مؤقتاً في هذه الجلسة</p>
            </div>
          </div>
          <button
            onClick={() => setHeldInvoicesModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-96 overflow-y-auto space-y-2.5 bg-slate-50/50">
          {heldInvoices.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">لا توجد فواتير معلقة حالياً</p>
              <p className="text-slate-400 mt-1">يمكنك تعليق أي فاتورة جارية بالضغط على زر (تعليق الفاتورة F2)</p>
            </div>
          ) : (
            heldInvoices.map((inv, idx) => {
              const totalAmount = inv.items.reduce((acc, item) => acc + item.total, 0);

              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">فاتورة معلقة #{idx + 1}</span>
                      <span className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-mono">
                        <Clock className="w-3 h-3" />
                        {inv.heldAt}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      <span>العميل: <strong className="text-slate-700">{inv.customer?.name || 'عميل عام'}</strong></span>
                      <span className="mx-1.5">•</span>
                      <span>الأصناف: <strong className="text-slate-700">{inv.items.length} صنف</strong></span>
                    </div>

                    <div className="font-mono font-black text-teal-700 text-sm sm:text-base mt-1">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => restoreHeldInvoice(inv.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      استرجاع
                    </button>
                    <button
                      onClick={() => deleteHeldInvoice(inv.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors active:scale-95"
                      title="حذف الفاتورة المعلقة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={() => setHeldInvoicesModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
