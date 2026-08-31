import React from 'react';
import { X, Keyboard, Zap, ShoppingCart, Search, CreditCard, Pause, Trash2, Printer, ScanLine } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface ShortcutsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useSettingsStore();

  const show = isOpen !== undefined ? isOpen : isShortcutsModalOpen;
  const handleClose = onClose || (() => setShortcutsModalOpen(false));

  if (!show) return null;

  const shortcuts = [
    { key: 'Alt + 0', description: 'الواجهة الرئيسية: لوحة التحكم والمؤشرات العامة', icon: Zap },
    { key: 'Alt + 1', description: 'الانتقال الفوري إلى نقطة البيع وشاشة الكاشير (POS)', icon: ShoppingCart },
    { key: 'Alt + 8', description: 'الانتقال إلى التقارير المالية والإحصائيات', icon: Zap },
    { key: 'قارئ الباركود', description: 'المسح المباشر: إضافة الأدوية تلقائياً بمجرد تمريرها أمام قارئ الباركود (USB / بلوتوث)', icon: ScanLine },
    { key: 'F4 / F2', description: 'التركيز الفوري على حقل البحث وقارئ الباركود', icon: Search },
    { key: 'F1', description: 'فتح شاشة المساعدة واختصارات لوحة المفاتيح', icon: Keyboard },
    { key: 'F3', description: 'استرجاع الفواتير المعلقة (Held Invoices)', icon: Zap },
    { key: 'F7', description: 'اختيار عميل للفاتورة (نقدي / آجل)', icon: ShoppingCart },
    { key: 'F8', description: 'إفراغ السلة وإلغاء الفاتورة الحالية', icon: Trash2 },
    { key: 'F9', description: 'دفع نقدي سريع وإنهاء الفاتورة مباشرة', icon: Zap },
    { key: 'F10', description: 'فتح نافذة الدفع المتعدد وتحديد المبلغ والخصم', icon: CreditCard },
    { key: 'F12', description: 'طباعة آخر فاتورة تم إتمامها', icon: Printer },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-teal-100 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">اختصارات لوحة المفاتيح السريعة</h2>
              <p className="text-xs text-teal-100">تحكم كامل وسريع بشاشة الكاشير والمبيعات دون استخدام الفأرة</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-5 grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto bg-slate-50/50">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">{s.description}</span>
                </div>
                <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 text-teal-900 font-mono font-black text-xs border border-slate-300 shadow-2xs">
                  {s.key}
                </kbd>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-2xs active:scale-95"
          >
            إغلاق (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
