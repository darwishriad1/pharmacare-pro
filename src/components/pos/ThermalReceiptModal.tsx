import React from 'react';
import { X, Printer, Share2, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { SaleInvoice } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { printerService } from '../../services/printerService';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleInvoice | null;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const { settings, formatCurrency } = useSettingsStore();

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    printerService.printInvoice(invoice, settings);
  };

  const showLogo = settings.showLogoOnReceipt !== false && !!settings.logoUrl;
  const logoAlign = settings.logoPosition || 'center';
  const logoSizePx = settings.logoSize === 'large' ? 65 : settings.logoSize === 'small' ? 36 : 48;
  const showPhone = settings.showPhoneOnReceipt !== false;
  const showAddress = settings.showAddressOnReceipt !== false;
  const showTax = settings.showTaxNumberOnReceipt !== false;
  const showBarcode = settings.showBarcodeOnReceipt !== false;
  const showPharmacist = settings.showPharmacistNameOnReceipt !== false;
  const showCustomer = settings.showCustomerOnReceipt !== false;

  const handleWhatsAppShare = () => {
    const itemsText = invoice.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product.name} (${it.unitName} × ${it.quantity}) = ${it.total.toLocaleString('ar-YE')} ${settings.currencySymbol}`
      )
      .join('\n');

    const message = `*فاتورة صيدلية الشفاء الذكية*
رقم الفاتورة: ${invoice.invoiceNumber}
التاريخ: ${invoice.date} ${invoice.time}
العميل/المريض: ${invoice.patientName || invoice.customerName || 'عميل نقدي'}
${invoice.doctorName ? `الطبيب: ${invoice.doctorName}\n` : ''}-------------------------
*الأصناف:*
${itemsText}
-------------------------
المجموع الفرعي: ${invoice.subtotal.toLocaleString('ar-YE')} ${settings.currencySymbol}
${invoice.totalDiscount > 0 ? `الخصم: -${invoice.totalDiscount.toLocaleString('ar-YE')} ${settings.currencySymbol}\n` : ''}*الصافي النهائي: ${invoice.grandTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}*
طريقة الدفع: ${invoice.paymentMethod === 'cash' ? 'نقداً' : invoice.paymentMethod === 'credit' ? 'آجل' : 'شبكة/بطاقة'}
-------------------------
نتمنى لكم دوام الصحة والعافية`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp text-slate-800 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-200" />
            <h2 className="font-bold text-sm sm:text-base">معاينة الإيصال الحراري</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Simulation */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/80 flex justify-center">
          <div
            className="w-full max-w-[340px] bg-white p-5 rounded-xl shadow-md border border-slate-300/80 text-slate-900 font-mono text-xs leading-relaxed"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Pharmacy Header */}
            <div className={`pb-3 border-b-2 border-dashed border-slate-400 space-y-1 ${
              logoAlign === 'right' ? 'text-right' : logoAlign === 'left' ? 'text-left' : 'text-center'
            }`}>
              {showLogo && (
                <div className={`mb-1.5 ${logoAlign === 'right' ? 'text-right' : logoAlign === 'left' ? 'text-left' : 'text-center'}`}>
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="inline-block object-contain"
                    style={{ maxHeight: `${logoSizePx}px` }}
                  />
                </div>
              )}
              <div className="font-black text-base text-slate-900 tracking-tight text-center">
                {settings.pharmacyName || 'صيدلية الشفاء الذكية'}
              </div>
              {settings.pharmacyNameEn && (
                <div className="text-[10px] text-slate-500 font-sans text-center font-medium">
                  {settings.pharmacyNameEn}
                </div>
              )}
              <div className="text-[11px] text-slate-600 font-sans text-center">
                {settings.branchName || 'الفرع الرئيسي'}
                {showPhone && (settings.phone || settings.mobile) && (
                  <span> | هاتف: {settings.phone || ''} {settings.mobile ? `/ ${settings.mobile}` : ''}</span>
                )}
              </div>
              {showAddress && settings.address && (
                <div className="text-[10.5px] text-slate-500 font-sans text-center">{settings.address}</div>
              )}
              {showTax && settings.taxNumber && (
                <div className="text-[10px] text-slate-700 text-center font-bold font-mono">الرقم الضريبي: {settings.taxNumber}</div>
              )}
              {settings.receiptHeaderMessage && (
                <div className="text-[10px] text-slate-600 italic bg-slate-50 p-1 rounded border border-slate-200 text-center font-sans">
                  {settings.receiptHeaderMessage}
                </div>
              )}
              <div className="text-center mt-1">
                <span className="inline-block bg-slate-100 text-slate-800 px-3 py-0.5 rounded font-bold text-[11px] border border-slate-200">
                  {invoice.paymentMethod === 'credit' ? 'فاتورة مبيعات آجلة' : 'فاتورة مبيعات نقدية'}
                </span>
              </div>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{invoice.date} {invoice.time}</span>
              </div>
              {showCustomer && (invoice.patientName || invoice.customerName) && (
                <div className="flex justify-between">
                  <span>المريض/العميل:</span>
                  <span className="font-bold">{invoice.patientName || invoice.customerName}</span>
                </div>
              )}
              {invoice.doctorName && (
                <div className="flex justify-between">
                  <span>الطبيب المعالج:</span>
                  <span>{invoice.doctorName}</span>
                </div>
              )}
              {showPharmacist && (
                <div className="flex justify-between">
                  <span>الصيدلي / الكاشير:</span>
                  <span>{invoice.pharmacistName || invoice.cashierName || 'كاشير الصيدلية'}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-400">
              <div className="flex justify-between font-bold pb-1 text-[11px] border-b border-slate-200">
                <span className="w-1/2">الصنف</span>
                <span className="w-1/4 text-center">الكمية</span>
                <span className="w-1/4 text-left">الإجمالي</span>
              </div>
              <div className="space-y-2 mt-2">
                {invoice.items.map((item, idx) => (
                  <div key={item.id || idx} className="text-[11px]">
                    <div className="font-bold text-slate-900">{item.product.name}</div>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>{item.unitName} @ {item.unitPrice.toLocaleString('ar-YE')}</span>
                      <span>× {item.quantity}</span>
                      <span className="font-bold text-slate-900">{item.total.toLocaleString('ar-YE')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Section */}
            <div className="py-2.5 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span>{invoice.subtotal.toLocaleString('ar-YE')} {settings.currencySymbol}</span>
              </div>
              {settings.enableVat && invoice.vatTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>ضريبة القيمة المضافة:</span>
                  <span>{invoice.vatTotal.toLocaleString('ar-YE')} {settings.currencySymbol}</span>
                </div>
              )}

              {/* Net Grand Total */}
              <div className="flex justify-between text-sm font-black py-2 my-1 border-y-2 border-dashed border-slate-800 text-slate-950">
                <span>إجمالي الفاتورة:</span>
                <span>{invoice.grandTotal.toLocaleString('ar-YE')} {settings.currencySymbol}</span>
              </div>

              {/* المدفوع وبجانبه المتبقي */}
              {invoice.paymentMethod === 'credit' ? (
                <div className="flex justify-between items-center bg-amber-50 p-2 rounded border border-amber-200 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">المقدّم:</span>
                    <span className="font-mono font-black text-teal-800">
                      {(invoice.paidAmount || 0).toLocaleString('ar-YE')} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 border-r border-amber-300 pr-2">
                    <span className="font-bold text-rose-700">دين آجل:</span>
                    <span className="font-mono font-black text-rose-800">
                      {(invoice.grandTotal - (invoice.paidAmount || 0)).toLocaleString('ar-YE')} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">المدفوع:</span>
                    <span className="font-mono font-black text-teal-800">
                      {(invoice.paidAmount ?? invoice.grandTotal).toLocaleString('ar-YE')} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                    <span className="font-bold text-slate-700">المتبقي:</span>
                    <span className="font-mono font-black text-slate-900">
                      {(invoice.changeAmount ?? Math.max(0, (invoice.paidAmount ?? invoice.grandTotal) - invoice.grandTotal)).toLocaleString('ar-YE')} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                <span>طريقة الدفع:</span>
                <span className="font-bold">
                  {invoice.paymentMethod === 'cash'
                    ? 'نقداً'
                    : invoice.paymentMethod === 'card'
                    ? 'شبكة / بطاقة'
                    : invoice.paymentMethod === 'credit'
                    ? (invoice.paidAmount && invoice.paidAmount > 0 ? 'آجل جزئي (مع دفعة مقدمة)' : 'آجل (ذمة بالكامل)')
                    : 'مختلط'}
                </span>
              </div>
            </div>

            {/* Barcode and Footer */}
            <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-1">
              {showBarcode && (
                <div className="text-center font-mono tracking-widest text-[12px] font-bold text-slate-800">
                  *{invoice.invoiceNumber}*
                </div>
              )}
              {settings.returnPolicyText && (
                <div className="text-[9.5px] font-sans text-slate-500 bg-slate-50 p-1.5 rounded border border-dotted border-slate-300 my-1 leading-snug">
                  <span className="font-bold text-slate-700">سياسة الاستبدال: </span>
                  {settings.returnPolicyText}
                </div>
              )}
              <div className="text-[10px] font-sans text-slate-500 font-medium pt-0.5">
                {settings.receiptHeaderMessage || 'شكراً لتعاملكم معنا'}
              </div>
              <div className="text-[10px] font-sans font-bold text-teal-800">
                {settings.receiptFooterMessage || 'نتمنى لكم دوام الصحة والعافية'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-3.5 bg-white border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-700/25 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            طباعة الإيصال
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/25 active:scale-95 transition-all"
            title="مشاركة عبر واتساب"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">واتساب</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs sm:text-sm active:scale-95 transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
