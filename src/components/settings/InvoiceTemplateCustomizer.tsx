import React, { useState, useRef } from 'react';
import {
  Printer,
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  Eye,
  FileText,
  Building2,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  QrCode,
  Barcode,
  CheckSquare,
  Square,
  ShieldCheck,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { PharmacySettings, SaleInvoice } from '../../types';
import { printerService } from '../../services/printerService';

interface InvoiceTemplateCustomizerProps {
  formData: PharmacySettings;
  setFormData: React.Dispatch<React.SetStateAction<PharmacySettings>>;
  onSave?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Preset SVG medical logos for quick selection
const PRESET_LOGOS = [
  {
    id: 'rx-caduceus',
    name: 'كأس وهيجيا الصيدلاني',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%230f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 12-4.5 4.5"/><path d="m14 8-4.5 4.5"/><path d="m9 4-4.5 4.5"/><path d="M12 2v20"/><circle cx="12" cy="7" r="3"/><path d="M12 10a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5z"/></svg>',
  },
  {
    id: 'medical-cross',
    name: 'صليب الإسعاف الطبي',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="%230f766e" stroke="%230f766e" stroke-width="1"><rect x="9" y="3" width="6" height="18" rx="2"/><rect x="3" y="9" width="18" height="6" rx="2"/></svg>',
  },
  {
    id: 'pill-capsule',
    name: 'كبسولة علاجية',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%230f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
  },
  {
    id: 'heart-pulse',
    name: 'نبض الصحة والعافية',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%230f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h4.27"/></svg>',
  },
];

export const InvoiceTemplateCustomizer: React.FC<InvoiceTemplateCustomizerProps> = ({
  formData,
  setFormData,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'branding' | 'paper' | 'elements' | 'policy'>('branding');
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  // Handle Logo Upload from Local File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميغابايت', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: base64,
        showLogoOnReceipt: true,
      }));
      showToast('تم رفع وتعيين شعار الصيدلية بنجاح');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyLogoUrl = () => {
    if (!customLogoUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      logoUrl: customLogoUrl.trim(),
      showLogoOnReceipt: true,
    }));
    setCustomLogoUrl('');
    showToast('تم تعيين رابط الشعار بنجاح');
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      showLogoOnReceipt: false,
    }));
    showToast('تمت إزالة الشعار');
  };

  const handleTestPrint = () => {
    try {
      printerService.printTestReceipt(formData);
      showToast('جاري فتح نافذة الطباعة التجريبية...');
    } catch (e) {
      showToast('حدث خطأ أثناء محاولة الطباعة', 'error');
    }
  };

  const selectedSize = formData.receiptSize || formData.receiptPaperSize || '80mm';

  return (
    <div className="space-y-4">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-l from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-600/30 rounded-2xl border border-teal-500/30 text-teal-300">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">تخصيص قالب الفاتورة والطباعة</h2>
              <span className="bg-teal-500/30 text-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-400/30">
                Invoice Template Builder
              </span>
            </div>
            <p className="text-xs text-teal-100/80 mt-0.5">
              تخصيص الشعار، بيانات الترويسة، مقاس الورق (80mm / 58mm / A4 / A5)، والتذييل
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestPrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          طباعة تجريبية للمعاينة
        </button>
      </div>

      {/* Main Grid: Customization Controls (Left/Right) & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Controls Section (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sub Navigation Tabs */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'branding'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              الشعار والترويسة
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paper')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'paper'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              حجم ورق الطباعة
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'elements'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              عناصر الفاتورة
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('policy')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'policy'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              التذييل وسياسة الإرجاع
            </button>
          </div>

          {/* TAB 1: BRANDING & LOGO */}
          {activeTab === 'branding' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-fadeIn">
              {/* Logo Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-700" />
                    شعار الصيدلية (Pharmacy Logo)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-teal-700">
                    <input
                      type="checkbox"
                      checked={formData.showLogoOnReceipt !== false}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, showLogoOnReceipt: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-teal-600 focus:ring-0 w-4 h-4"
                    />
                    <span>إظهار الشعار في الفاتورة</span>
                  </label>
                </div>

                {/* Logo Upload Box / Current Logo */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  {formData.logoUrl ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-teal-200">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg p-1 border border-slate-200 flex items-center justify-center overflow-hidden">
                          <img
                            src={formData.logoUrl}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">الشعار المعتمد الحالي</div>
                          <div className="text-[10px] text-slate-500">جاهز للطباعة على الفواتير والإيصالات</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 cursor-pointer"
                        >
                          استبدال
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الشعار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-white hover:bg-teal-50/40 p-4 rounded-xl text-center cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="w-10 h-10 mx-auto rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">اضغط لرفع شعار الصيدلية من جهازك</div>
                      <div className="text-[10px] text-slate-400">يدعم PNG, JPG, SVG, WebP (بحد أقصى 2MB)</div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Manual URL Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="أو أدخل رابط صورة الشعار عبر الإنترنت (https://...)"
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLogoUrl}
                      disabled={!customLogoUrl.trim()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      تطبيق
                    </button>
                  </div>

                  {/* Preset Logos */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      أو اختر من الرموز الطبية الجاهزة:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_LOGOS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              logoUrl: preset.url,
                              showLogoOnReceipt: true,
                            }));
                            showToast(`تم اختيار ${preset.name}`);
                          }}
                          className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            formData.logoUrl === preset.url
                              ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-8 h-8 object-contain" />
                          <span className="text-[10px] font-medium text-slate-700 truncate w-full">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Layout Options: Alignment & Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        محاذاة الشعار في الفاتورة
                      </label>
                      <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                        {[
                          { id: 'right', label: 'يمين', icon: AlignRight },
                          { id: 'center', label: 'وسط', icon: AlignCenter },
                          { id: 'left', label: 'يسار', icon: AlignLeft },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                logoPosition: pos.id as 'center' | 'left' | 'right',
                              }))
                            }
                            className={`flex-1 py-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              (formData.logoPosition || 'center') === pos.id
                                ? 'bg-teal-700 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <pos.icon className="w-3.5 h-3.5" />
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">حجم الشعار</label>
                      <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                        {[
                          { id: 'small', label: 'صغير' },
                          { id: 'medium', label: 'متوسط' },
                          { id: 'large', label: 'كبير' },
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                logoSize: sz.id as 'small' | 'medium' | 'large',
                              }))
                            }
                            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              (formData.logoSize || 'medium') === sz.id
                                ? 'bg-teal-700 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pharmacy Details Form */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-700" />
                  بيانات الترويسة والتواصل
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      اسم الصيدلية (عربي) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pharmacyName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pharmacyName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      اسم الصيدلية (إنجليزي - اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.pharmacyNameEn || ''}
                      placeholder="e.g. Al-Shifa Modern Pharmacy"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, pharmacyNameEn: e.target.value }))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الفرع</label>
                    <input
                      type="text"
                      value={formData.branchName || ''}
                      placeholder="الفرع الرئيسي - شارع الزبيري"
                      onChange={(e) => setFormData((prev) => ({ ...prev, branchName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      أرقام الهاتف / طوارئ
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      placeholder="01-234567"
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الجوال / واتساب المبيعات
                    </label>
                    <input
                      type="text"
                      value={formData.mobile || ''}
                      placeholder="770000000"
                      onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان والموقع</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      placeholder="صنعاء - شارع الستين - بجوار المستشفى"
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الرقم الضريبي (Tax / VAT Number)
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber || ''}
                      placeholder="300000000000003"
                      onChange={(e) => setFormData((prev) => ({ ...prev, taxNumber: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم السجل التجاري (CR Number)
                    </label>
                    <input
                      type="text"
                      value={formData.crNumber || ''}
                      placeholder="CR-104928"
                      onChange={(e) => setFormData((prev) => ({ ...prev, crNumber: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-teal-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAPER SIZES */}
          {activeTab === 'paper' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-teal-700" />
                  اختيار مقاس ورق طباعة الفاتورة الافتراضي
                </h3>
                <p className="text-[11px] text-slate-500">
                  حدد المقاس المناسب لنوع الطابعة الموصولة بجهازك (طابعة إيصالات حرارية أو طابعة ليزر A4)
                </p>
              </div>

              {/* 4 Paper Size Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 80mm */}
                <div
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      receiptSize: '80mm',
                      receiptPaperSize: '80mm',
                    }))
                  }
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedSize === '80mm'
                      ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedSize === '80mm' && (
                    <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-100/60 rounded-xl text-teal-800 font-black text-sm">
                      80mm
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">طابعة حرارية 80 ملم (القياسي)</div>
                      <div className="text-[10px] text-slate-500">طابعات نقاط البيع والكاشير (Epson / Xprinter)</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] bg-slate-100 p-1.5 rounded-lg text-slate-600">
                    أفضل خيار للصيدليات، يعرض تفاصيل الأصناف بوضوح مع الشعار والباركود.
                  </div>
                </div>

                {/* 58mm */}
                <div
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      receiptSize: '58mm',
                      receiptPaperSize: '58mm',
                    }))
                  }
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedSize === '58mm'
                      ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedSize === '58mm' && (
                    <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100/70 rounded-xl text-amber-800 font-black text-sm">
                      58mm
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">طابعة حرارية 58 ملم (مدمج)</div>
                      <div className="text-[10px] text-slate-500">طابعات البلوتوث المحمولة والإيصالات الصغيرة</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] bg-slate-100 p-1.5 rounded-lg text-slate-600">
                    حجم مضغوط يوفر استهلاك الورق الحراري ويدعم الأجهزة المحمولة.
                  </div>
                </div>

                {/* A4 */}
                <div
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      receiptSize: 'A4',
                      receiptPaperSize: 'A4',
                    }))
                  }
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedSize === 'A4'
                      ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedSize === 'A4' && (
                    <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100/70 rounded-xl text-blue-800 font-black text-sm">
                      A4
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">فاتورة ضريبية رسمية A4</div>
                      <div className="text-[10px] text-slate-500">طابعات الليزر والمستندات الرسمية الكاملة</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] bg-slate-100 p-1.5 rounded-lg text-slate-600">
                    مناسبة للشركات، الفواتير الآجلة الكبيرة، والتعاملات التأمينية والمؤسسية.
                  </div>
                </div>

                {/* A5 */}
                <div
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      receiptSize: 'A5',
                      receiptPaperSize: 'A5',
                    }))
                  }
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedSize === 'A5'
                      ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedSize === 'A5' && (
                    <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100/70 rounded-xl text-indigo-800 font-black text-sm">
                      A5
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">فاتورة نصف صفحة A5</div>
                      <div className="text-[10px] text-slate-500">فواتير مدمجة نصف مقاس A4 اقتصادية</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] bg-slate-100 p-1.5 rounded-lg text-slate-600">
                    تجمع بين وضوح الفاتورة الرسمية والتوفير باستهلاك ورق الطباعة العادي.
                  </div>
                </div>
              </div>

              {/* POS Auto-Print Option */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.printReceiptDirectly ?? false}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, printReceiptDirectly: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-teal-600 focus:ring-0 w-4 h-4"
                  />
                  <span>الطباعة المباشرة التلقائية فور إنهاء عملية البيع في الكاشير</span>
                </label>
                <p className="text-[10px] text-slate-500 pr-6">
                  عند تفعيل هذا الخيار، سيتم فتح نافذة أمر الطباعة تلقائياً بمجرد تأكيد حفظ الفاتورة.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICE ELEMENTS TOGGLES */}
          {activeTab === 'elements' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                  التحكم في إظهار / إخفاء عناصر الفاتورة
                </h3>
                <p className="text-[11px] text-slate-500">
                  اختر البيانات والمعلومات التي ترغب في طباعتها على الفاتورة لعملائك
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    key: 'showPhoneOnReceipt',
                    label: 'إظهار أرقام الهاتف والجوال',
                    desc: 'طباعة رقم هاتف وجوال الصيدلية في الترويسة',
                    defaultVal: true,
                  },
                  {
                    key: 'showAddressOnReceipt',
                    label: 'إظهار العنوان والموقع',
                    desc: 'طباعة العنوان الجغرافي للصيدلية',
                    defaultVal: true,
                  },
                  {
                    key: 'showTaxNumberOnReceipt',
                    label: 'إظهار الرقم الضريبي (VAT)',
                    desc: 'طباعة الرقم الضريبي المعتمد للمنشأة',
                    defaultVal: true,
                  },
                  {
                    key: 'showCrNumberOnReceipt',
                    label: 'إظهار رقم السجل التجاري (CR)',
                    desc: 'طباعة رقم السجل التجاري أو الترخيص',
                    defaultVal: false,
                  },
                  {
                    key: 'showPharmacistNameOnReceipt',
                    label: 'إظهار اسم الصيدلي / الكاشير',
                    desc: 'طباعة اسم المستخدم الذي أصدر الفاتورة',
                    defaultVal: true,
                  },
                  {
                    key: 'showCustomerOnReceipt',
                    label: 'إظهار اسم العميل / المريض',
                    desc: 'طباعة اسم العميل أو المريض في الفاتورة',
                    defaultVal: true,
                  },
                  {
                    key: 'showDoctorOnReceipt',
                    label: 'إظهار اسم الطبيب المعالج',
                    desc: 'طباعة اسم الطبيب في الفواتير الموصوفة',
                    defaultVal: true,
                  },
                  {
                    key: 'showBarcodeOnReceipt',
                    label: 'إظهار باركود الفاتورة',
                    desc: 'طباعة رمز الباركود الخاص برقم الفاتورة',
                    defaultVal: true,
                  },
                  {
                    key: 'showQrCodeOnReceipt',
                    label: 'إظهار رمز الاستجابة السريعة (QR Code)',
                    desc: 'طباعة رمز QR للتحقق السريع من الفاتورة',
                    defaultVal: true,
                  },
                ].map((elem) => {
                  const isChecked = (formData as any)[elem.key] !== false;
                  return (
                    <label
                      key={elem.key}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-teal-50/50 border-teal-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 opacity-80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [elem.key]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-teal-600 focus:ring-0 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold">{elem.label}</div>
                        <div className="text-[10px] text-slate-500">{elem.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: POLICY & MESSAGES */}
          {activeTab === 'policy' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  رسائل الترويسة والتذييل وسياسة الإرجاع
                </h3>
                <p className="text-[11px] text-slate-500">
                  تخصيص الرسائل الترحيبية والختامية وشروط الاستبدال المطبوعة أسفل الفاتورة
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الرسالة الترحيبية في الترويسة (Header Welcome Message)
                  </label>
                  <input
                    type="text"
                    value={formData.receiptHeaderMessage || ''}
                    placeholder="أهلاً وسهلاً بكم في صيدليتكم"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, receiptHeaderMessage: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    رسالة الشكر والتذييل (Footer Closing Message)
                  </label>
                  <input
                    type="text"
                    value={formData.receiptFooterMessage || ''}
                    placeholder="نتمنى لكم دوام الصحة والعافية - شكراً لزيارتكم"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, receiptFooterMessage: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    نص سياسة الاستبدال والإرجاع (Return Policy)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.returnPolicyText || ''}
                    placeholder="الأدوية لا ترد ولا تستبدل بعد خروجها من الصيدلية حفاظاً على سلامتكم وفقاً للتعليمات الطبية. المستلزمات الطبية تستبدل خلال 3 أيام مع إحضار أصل الفاتورة."
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, returnPolicyText: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:border-teal-600 resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    سيتم طباعة هذا النص بخط صغير وأنيق في أسفل الفاتورة لضمان إعلام المريض بحقوقه وشروط الإرجاع.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Real-Time Invoice Preview Box (5 Cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Eye className="w-4 h-4 text-teal-600" />
              معاينة حية ومباشرة لقالب الفاتورة ({selectedSize})
            </div>
            <button
              type="button"
              onClick={handleTestPrint}
              className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              تجربة الطباعة
            </button>
          </div>

          {/* Paper Simulated Container */}
          <div className="bg-slate-200/90 rounded-2xl p-3 sm:p-4 border border-slate-300 shadow-inner flex justify-center max-h-[640px] overflow-y-auto">
            <div
              className={`bg-white shadow-lg border border-slate-300 text-slate-900 rounded-lg p-4 font-mono text-[11px] leading-relaxed transition-all ${
                selectedSize === '58mm'
                  ? 'w-[230px] text-[10px]'
                  : selectedSize === 'A4'
                  ? 'w-full text-xs font-sans'
                  : selectedSize === 'A5'
                  ? 'w-full text-[11px] font-sans'
                  : 'w-[310px]'
              }`}
            >
              {/* Header Preview */}
              <div
                className={`pb-2.5 border-b-2 border-dashed border-slate-400 space-y-1 ${
                  formData.logoPosition === 'right'
                    ? 'text-right'
                    : formData.logoPosition === 'left'
                    ? 'text-left'
                    : 'text-center'
                }`}
              >
                {formData.showLogoOnReceipt !== false && formData.logoUrl && (
                  <div
                    className={`mb-1.5 ${
                      formData.logoPosition === 'right'
                        ? 'text-right'
                        : formData.logoPosition === 'left'
                        ? 'text-left'
                        : 'text-center'
                    }`}
                  >
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="inline-block object-contain"
                      style={{
                        maxHeight:
                          formData.logoSize === 'large'
                            ? '56px'
                            : formData.logoSize === 'small'
                            ? '32px'
                            : '42px',
                      }}
                    />
                  </div>
                )}

                <div className="font-black text-sm text-slate-900 text-center">
                  {formData.pharmacyName || 'اسم الصيدلية'}
                </div>

                {formData.pharmacyNameEn && (
                  <div className="text-[9.5px] text-slate-500 font-sans text-center">
                    {formData.pharmacyNameEn}
                  </div>
                )}

                <div className="text-[10px] text-slate-600 font-sans text-center">
                  {formData.branchName || 'الفرع الرئيسي'}
                  {formData.showPhoneOnReceipt !== false && (formData.phone || formData.mobile) && (
                    <span> | {formData.phone || formData.mobile}</span>
                  )}
                </div>

                {formData.showAddressOnReceipt !== false && formData.address && (
                  <div className="text-[9.5px] text-slate-500 font-sans text-center">
                    {formData.address}
                  </div>
                )}

                {formData.showTaxNumberOnReceipt !== false && formData.taxNumber && (
                  <div className="text-[9.5px] text-slate-800 text-center font-bold">
                    الرقم الضريبي: {formData.taxNumber}
                  </div>
                )}

                {formData.receiptHeaderMessage && (
                  <div className="text-[9px] text-slate-600 italic bg-slate-50 p-1 rounded text-center">
                    {formData.receiptHeaderMessage}
                  </div>
                )}

                <div className="text-center mt-1">
                  <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200">
                    فاتورة مبيعات نقدية
                  </span>
                </div>
              </div>

              {/* Meta Info */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">INV-2026-0042</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span>{new Date().toISOString().split('T')[0]} 10:30 ص</span>
                </div>
                {formData.showCustomerOnReceipt !== false && (
                  <div className="flex justify-between">
                    <span>العميل:</span>
                    <span className="font-bold">عميل نقدي / مريض تجريبي</span>
                  </div>
                )}
                {formData.showPharmacistNameOnReceipt !== false && (
                  <div className="flex justify-between">
                    <span>الكاشير:</span>
                    <span>درويش (صيدلي)</span>
                  </div>
                )}
              </div>

              {/* Sample Items Table */}
              <div className="py-2 border-b-2 border-dashed border-slate-400">
                <div className="flex justify-between font-bold pb-1 text-[10px] border-b border-slate-200">
                  <span className="w-1/2">الصنف</span>
                  <span className="w-1/4 text-center">الكمية</span>
                  <span className="w-1/4 text-left">الإجمالي</span>
                </div>
                <div className="space-y-1.5 mt-1.5 text-[10px]">
                  <div>
                    <div className="font-bold text-slate-900">بانادول إكسترا 500 ملغ</div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>باكت × 2</span>
                      <span className="font-bold text-slate-900">3,000 {formData.currencySymbol}</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">أموكسيل 500 ملغ كبسولات</div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>شريط × 1</span>
                      <span className="font-bold text-slate-900">2,200 {formData.currencySymbol}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 space-y-1 text-[10px]">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي:</span>
                  <span>5,200 {formData.currencySymbol}</span>
                </div>
                <div className="flex justify-between text-xs font-black py-1 border-y border-dashed border-slate-800 text-slate-950">
                  <span>صافي الفاتورة:</span>
                  <span>5,200 {formData.currencySymbol}</span>
                </div>
                <div className="flex justify-between text-[9.5px] text-slate-600 pt-0.5">
                  <span>طريقة الدفع:</span>
                  <span className="font-bold">نقداً (Cash)</span>
                </div>
              </div>

              {/* Barcode & Return Policy */}
              <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                {formData.showBarcodeOnReceipt !== false && (
                  <div className="font-mono tracking-widest text-[11px] font-bold text-slate-800">
                    *INV-2026-0042*
                  </div>
                )}

                {formData.returnPolicyText && (
                  <div className="text-[8.5px] font-sans text-slate-600 bg-slate-50 p-1 rounded border border-dotted border-slate-300 leading-snug">
                    <span className="font-bold text-slate-700">سياسة الاستبدال: </span>
                    {formData.returnPolicyText}
                  </div>
                )}

                <div className="text-[9px] font-sans text-slate-500 pt-0.5">
                  {formData.receiptFooterMessage || 'نتمنى لكم دوام الصحة والعافية'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
