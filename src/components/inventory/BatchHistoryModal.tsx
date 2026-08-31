import React from 'react';
import { X, History, Scale, Clock, User, Package, Calendar } from 'lucide-react';
import { Batch, AuditLog } from '../../types';
import { db } from '../../database/db';

interface BatchHistoryModalProps {
  isOpen: boolean;
  batch: Batch | null;
  onClose: () => void;
}

export const BatchHistoryModal: React.FC<BatchHistoryModalProps> = ({ isOpen, batch, onClose }) => {
  if (!isOpen || !batch) return null;

  const product = db.getProductById(batch.productId);
  const allLogs = db.getAuditLogs();

  // Filter logs mentioning this batch number or product
  const relatedLogs = allLogs.filter(
    (log) =>
      log.details.includes(batch.batchNumber) ||
      (product && log.details.includes(product.name))
  );

  return (
    <div
      id="batch-history-modal"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-teal-800 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20 shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-white truncate">سجل حركات وتتبع التشغيلة</h2>
              <p className="text-[11px] text-teal-100 font-mono truncate">
                {product?.name || batch.productName || 'الصنف'} • تشغيلة #{batch.batchNumber}
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

        {/* Batch Info Snapshot */}
        <div className="p-2.5 bg-teal-50/50 border-b border-teal-100 grid grid-cols-3 gap-1.5 text-xs shrink-0 text-center">
          <div className="bg-white p-1.5 rounded-lg border border-teal-100 shadow-2xs">
            <span className="text-slate-400 block text-[9px]">الرصيد بالمخزن:</span>
            <span className="font-mono font-black text-slate-900 text-xs">{batch.quantity} عبوة</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-teal-100 shadow-2xs">
            <span className="text-slate-400 block text-[9px]">تاريخ الانتهاء:</span>
            <span className="font-mono font-bold text-teal-800 text-xs">{batch.expiryDate}</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-teal-100 shadow-2xs">
            <span className="text-slate-400 block text-[9px]">المورد:</span>
            <span className="font-bold text-slate-800 text-xs truncate block">{batch.supplierName || 'توريد مباشر'}</span>
          </div>
        </div>

        {/* Timeline Logs Body */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1 text-xs">
          <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-teal-700" />
            <span>السجل الزمني للتسويات والعمليات:</span>
          </div>

          {relatedLogs.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
              <History className="w-6 h-6 mx-auto text-slate-300 mb-1" />
              <p className="font-bold text-slate-600 text-xs">لا توجد حركات تسوية أو تعديل مسجلة لهذه الدفعة</p>
              <span className="text-[10px] text-slate-400">تم إدخالها بتاريخ {batch.receivedDate || 'التأسيس'}</span>
            </div>
          ) : (
            relatedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs hover:border-teal-200 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-900 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded text-[10px]">
                    {log.action}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString('ar-YE')}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed pt-0.5">
                  {log.details}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>المسؤول: {log.userName || log.userId}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
