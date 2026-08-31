import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, Check, Trash2, Bell } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

export const NotificationDrawer: React.FC = () => {
  const { isNotificationDrawerOpen, setNotificationDrawerOpen, setActiveTab } = useSettingsStore();
  const { notifications, markAsRead, clearAll } = useNotificationStore();

  if (!isNotificationDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-start">
      <div className="w-full max-w-md bg-white border-l border-teal-100 h-full shadow-2xl flex flex-col justify-between text-slate-800 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div>
            <h2 className="font-bold text-base text-white">التنبيهات والإشعارات الذكية</h2>
            <p className="text-xs text-teal-100">مراقبة حية لتاريخ الصلاحيات ونواقص المخزون</p>
          </div>
          <button
            onClick={() => setNotificationDrawerOpen(false)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5 bg-slate-50/50">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Check className="w-12 h-12 mx-auto text-teal-600 mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700">لا توجد تنبيهات حالياً</p>
              <p className="text-slate-400 mt-1">جميع الأصناف والصلاحيات ومستويات المخزون بحالة ممتازة</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isExpiry = n.type === 'expiry_alert';
              const isLow = n.type === 'low_stock';

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link === '/inventory') setActiveTab('inventory');
                    if (n.link === '/products') setActiveTab('products');
                    setNotificationDrawerOpen(false);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs ${
                    isExpiry
                      ? 'border-rose-200 hover:bg-rose-50/40'
                      : isLow
                      ? 'border-amber-200 hover:bg-amber-50/40'
                      : 'border-slate-200 hover:bg-teal-50/40'
                  } ${!n.read ? 'ring-1 ring-teal-500' : 'opacity-90'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isExpiry
                          ? 'bg-rose-100 text-rose-700'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {isExpiry ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : isLow ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-teal-600" title="غير مقروء" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 bg-white flex items-center justify-between">
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              مسح كافة التنبيهات
            </button>
            <button
              onClick={() => setNotificationDrawerOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-2xs active:scale-95"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
