import { SaleInvoice, PharmacySettings, Product, Batch, Customer, PurchaseInvoice, Supplier } from '../types';
import { dispatchPrint } from './pdfService';

/**
 * يستبدل نمط `window.print()` القديم.
 * على الويب: يفتح نافذة جديدة مع الـ HTML ثم window.print().
 * على Android (APK): يحول HTML إلى PDF ويرسله لـ PrintBridge.
 */
function printHtml(html: string, fileName: string, paperSize?: 'A4' | 'A5' | '80mm' | '58mm'): void {
  // امسح window.onload script من HTML (الذي كان يستدعي window.print())
  const cleanHtml = html.replace(
    /<script>[\s\S]*?window\.print\(\)[\s\S]*?<\/script>/g,
    ''
  );
  // نداء dispatch (async، لا ننتظر — fire-and-forget)
  dispatchPrint({ html: cleanHtml, fileName, paperSize }).catch((err) => {
    console.error('[printerService] printHtml failed, falling back to window.print():', err);
    // fallback: افتح نافذة واطبع (السلوك القديم)
    const w = window.open('', '_blank');
    if (!w) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  });
}

export const printerService = {
  /**
   * Main Dispatcher to print invoice based on configured receiptSize
   */
  printInvoice(invoice: SaleInvoice, settings: PharmacySettings) {
    const size = settings.receiptSize || settings.receiptPaperSize || '80mm';
    if (size === 'A4') {
      this.printA4Invoice(invoice, settings);
    } else if (size === 'A5') {
      this.printA5Invoice(invoice, settings);
    } else {
      this.printThermalReceipt(invoice, settings, size);
    }
  },

  /**
   * Print a professional thermal cash receipt (80mm or 58mm) with full logo & contact customization
   */
  printThermalReceipt(invoice: SaleInvoice, settings: PharmacySettings, forcedSize?: '80mm' | '58mm') {
    const effectiveSize = forcedSize || (settings.receiptSize === '58mm' ? '58mm' : '80mm');
    const is58mm = effectiveSize === '58mm';
    const paperWidth = is58mm ? '58mm' : '80mm';
    const fontSize = is58mm ? '11px' : '12px';

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const showLogo = settings.showLogoOnReceipt !== false && !!settings.logoUrl;
    const logoSizePx = settings.logoSize === 'large' ? 80 : settings.logoSize === 'small' ? 44 : 60;
    const logoAlign = settings.logoPosition || 'center';

    const showPhone = settings.showPhoneOnReceipt !== false;
    const showAddress = settings.showAddressOnReceipt !== false;
    const showTax = settings.showTaxNumberOnReceipt !== false;
    const showCr = settings.showCrNumberOnReceipt === true;
    const showBarcode = settings.showBarcodeOnReceipt !== false;
    const showQr = settings.showQrCodeOnReceipt !== false;
    const showPharmacist = settings.showPharmacistNameOnReceipt !== false;
    const showCustomer = settings.showCustomerOnReceipt !== false;
    const showDoctor = settings.showDoctorOnReceipt !== false;

    const itemsHtml = invoice.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px dashed #ccc; font-size: ${fontSize};">
          <td style="padding: 4px 2px; text-align: right; width: 48%;">
            <div style="font-weight: bold; color: #111;">${item.product.name}</div>
            <div style="font-size: 10px; color: #555;">${item.unitName} × ${item.quantity} ${item.discountPercentage > 0 ? `(خصم ${item.discountPercentage}%)` : ''}</div>
          </td>
          <td style="padding: 4px 2px; text-align: center; width: 22%; font-size: 11px;">
            ${(item.unitPrice || 0).toLocaleString('ar-YE')}
          </td>
          <td style="padding: 4px 2px; text-align: left; width: 30%; font-weight: bold;">
            ${(item.total || 0).toLocaleString('ar-YE')}
          </td>
        </tr>
      `
      )
      .join('');

    const qrData = encodeURIComponent(
      `PharmaCare|${settings.pharmacyName}|Inv:${invoice.invoiceNumber}|Total:${invoice.grandTotal}|Date:${invoice.date}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة ${invoice.invoiceNumber}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif;
              width: ${paperWidth};
              margin: 0 auto;
              padding: 6px 8px;
              color: #000;
              background: #fff;
              font-size: ${fontSize};
              line-height: 1.35;
              box-sizing: border-box;
            }
            .header {
              text-align: ${logoAlign};
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .logo-wrap {
              text-align: ${logoAlign};
              margin-bottom: 4px;
            }
            .logo-img {
              max-height: ${logoSizePx}px;
              max-width: 100%;
              object-fit: contain;
              display: inline-block;
            }
            .pharmacy-name {
              font-size: ${is58mm ? '14px' : '16px'};
              font-weight: 800;
              margin: 0 0 2px 0;
              color: #000;
              text-align: center;
            }
            .pharmacy-name-en {
              font-size: 10px;
              font-weight: 600;
              color: #444;
              margin: 0 0 3px 0;
              text-align: center;
              font-family: sans-serif;
            }
            .pharmacy-sub {
              font-size: 10.5px;
              color: #222;
              margin: 1.5px 0;
              text-align: center;
            }
            .welcome-msg {
              font-size: 10px;
              color: #333;
              font-style: italic;
              margin: 3px 0;
              text-align: center;
              padding: 2px;
              background: #f8fafc;
              border-radius: 3px;
            }
            .invoice-title {
              font-weight: bold;
              font-size: 12px;
              margin: 5px 0 3px 0;
              background: #eee;
              padding: 3px 0;
              border-radius: 3px;
              text-align: center;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
            }
            th {
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 3px 2px;
              font-size: 10.5px;
              font-weight: bold;
            }
            .totals-table {
              width: 100%;
              border-top: 1px solid #000;
              margin-top: 5px;
              padding-top: 3px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
            }
            .grand-total {
              font-size: 14px;
              font-weight: 900;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 4px 0;
              margin: 3px 0;
            }
            .barcode-box {
              text-align: center;
              margin: 6px 0 2px 0;
              font-family: monospace;
              letter-spacing: 2px;
              font-size: 12px;
              font-weight: bold;
            }
            .qr-box {
              text-align: center;
              margin: 6px auto;
            }
            .qr-img {
              width: 75px;
              height: 75px;
              margin: 0 auto;
              display: block;
            }
            .policy-box {
              font-size: 9px;
              color: #444;
              border: 1px dotted #999;
              padding: 4px;
              margin: 6px 0;
              border-radius: 3px;
              text-align: center;
              line-height: 1.3;
            }
            .footer {
              text-align: center;
              margin-top: 6px;
              font-size: 10px;
              color: #333;
              border-top: 1px dashed #777;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${
              showLogo
                ? `<div class="logo-wrap"><img src="${settings.logoUrl}" class="logo-img" alt="Logo" /></div>`
                : ''
            }
            <h1 class="pharmacy-name">${settings.pharmacyName}</h1>
            ${settings.pharmacyNameEn ? `<div class="pharmacy-name-en">${settings.pharmacyNameEn}</div>` : ''}
            ${settings.branchName ? `<div class="pharmacy-sub">${settings.branchName}</div>` : ''}
            ${
              showPhone && (settings.phone || settings.mobile)
                ? `<div class="pharmacy-sub">هاتف: ${settings.phone || ''} ${settings.mobile ? `| جوال: ${settings.mobile}` : ''}</div>`
                : ''
            }
            ${
              showAddress && settings.address
                ? `<div class="pharmacy-sub">${settings.address}</div>`
                : ''
            }
            ${
              settings.website
                ? `<div class="pharmacy-sub" style="direction: ltr; font-size: 9.5px;">${settings.website}</div>`
                : ''
            }
            ${
              showTax && settings.taxNumber
                ? `<div class="pharmacy-sub">الرقم الضريبي: <strong>${settings.taxNumber}</strong></div>`
                : ''
            }
            ${
              showCr && settings.crNumber
                ? `<div class="pharmacy-sub">السجل التجاري: ${settings.crNumber}</div>`
                : ''
            }
            ${
              settings.receiptHeaderMessage
                ? `<div class="welcome-msg">${settings.receiptHeaderMessage}</div>`
                : ''
            }
            <div class="invoice-title">${
              invoice.paymentMethod === 'credit'
                ? 'فاتورة مبيعات آجلة'
                : 'فاتورة مبيعات نقدية'
            }</div>
          </div>

          <div class="meta-row">
            <span><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</span>
            <span><strong>التاريخ:</strong> ${invoice.date}</span>
          </div>
          <div class="meta-row">
            <span><strong>الوقت:</strong> ${invoice.time}</span>
            ${
              showPharmacist
                ? `<span><strong>الكاشير:</strong> ${invoice.pharmacistName || invoice.cashierName || 'الصيدلية'}</span>`
                : ''
            }
          </div>
          ${
            showCustomer && invoice.customerName && invoice.customerName !== 'عميل نقدي'
              ? `<div class="meta-row"><span><strong>العميل:</strong> ${invoice.customerName}</span></div>`
              : ''
          }
          ${
            showDoctor && invoice.doctorName
              ? `<div class="meta-row"><span><strong>الطبيب:</strong> ${invoice.doctorName}</span></div>`
              : ''
          }

          <table>
            <thead>
              <tr>
                <th style="text-align: right;">الصنف</th>
                <th style="text-align: center;">السعر</th>
                <th style="text-align: left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-table">
            <div class="total-row">
              <span>المجموع الفرعي:</span>
              <span>${invoice.subtotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
            ${
              invoice.totalDiscount > 0
                ? `<div class="total-row" style="color: #b91c1c;">
                    <span>الخصم الممنوح:</span>
                    <span>-${invoice.totalDiscount.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
                  </div>`
                : ''
            }
            ${
              settings.enableVat && invoice.vatTotal > 0
                ? `<div class="total-row">
                    <span>ضريبة القيمة المضافة (${settings.vatPercentage}%):</span>
                    <span>${invoice.vatTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
                  </div>`
                : ''
            }
            <div class="total-row grand-total">
              <span>إجمالي الفاتورة:</span>
              <span>${invoice.grandTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
            ${
              invoice.paymentMethod === 'credit'
                ? `
                  <div class="total-row" style="background: #f8fafc; font-weight: bold; padding: 4px 2px;">
                    <span>المدفوع مقدماً: ${(invoice.paidAmount || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
                    <span style="color: #b91c1c;">المتبقي كدين: ${(invoice.grandTotal - (invoice.paidAmount || 0)).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
                  </div>
                `
                : `
                  <div class="total-row" style="background: #f8fafc; font-weight: bold; padding: 4px 2px;">
                    <span>المدفوع: ${(invoice.paidAmount ?? invoice.grandTotal).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
                    <span>المتبقي: ${(invoice.changeAmount ?? Math.max(0, (invoice.paidAmount ?? invoice.grandTotal) - invoice.grandTotal)).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
                  </div>
                `
            }
            <div class="total-row">
              <span>طريقة الدفع:</span>
              <span>${
                invoice.paymentMethod === 'cash'
                  ? 'نقداً'
                  : invoice.paymentMethod === 'card'
                  ? 'شبكة / بطاقة'
                  : invoice.paymentMethod === 'credit'
                  ? (invoice.paidAmount && invoice.paidAmount > 0 ? 'آجل جزئي' : 'آجل (ذمة بالكامل)')
                  : 'مختلط'
              }</span>
            </div>
          </div>

          ${
            showBarcode
              ? `<div class="barcode-box">*${invoice.invoiceNumber}*</div>`
              : ''
          }

          ${
            showQr
              ? `<div class="qr-box"><img src="${qrUrl}" class="qr-img" alt="QR Code" /></div>`
              : ''
          }

          ${
            settings.returnPolicyText
              ? `<div class="policy-box"><strong>سياسة الاستبدال والإرجاع:</strong><br />${settings.returnPolicyText}</div>`
              : ''
          }

          <div class="footer">
            <div style="font-weight: bold;">${settings.receiptFooterMessage || 'نتمنى لكم دوام الصحة والعافية'}</div>
            <div style="margin-top: 3px; font-size: 8.5px; color: #777;">نظام PharmaCare Pro الذكي</div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Standard A4 Tax Invoice
   */
  printA4Invoice(invoice: SaleInvoice, settings: PharmacySettings) {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const showLogo = settings.showLogoOnReceipt !== false && !!settings.logoUrl;
    const showPhone = settings.showPhoneOnReceipt !== false;
    const showAddress = settings.showAddressOnReceipt !== false;
    const showTax = settings.showTaxNumberOnReceipt !== false;
    const showCr = settings.showCrNumberOnReceipt === true;

    const qrData = encodeURIComponent(
      `PharmaCare|${settings.pharmacyName}|Inv:${invoice.invoiceNumber}|Total:${invoice.grandTotal}|Date:${invoice.date}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

    const itemsHtml = invoice.items
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
          <td style="padding: 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: #1e293b;">${item.product.name}</td>
          <td style="padding: 8px; text-align: center; color: #475569;">${item.unitName}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #0f766e;">${item.quantity}</td>
          <td style="padding: 8px; text-align: left; font-family: monospace;">${item.unitPrice.toLocaleString('ar-YE')}</td>
          <td style="padding: 8px; text-align: center;">${item.discountPercentage > 0 ? `<span style="color: #e11d48; font-weight: bold;">${item.discountPercentage}%</span>` : '-'}</td>
          <td style="padding: 8px; text-align: left; font-weight: bold; font-family: monospace;">${item.total.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة ضريبية رسمية ${invoice.invoiceNumber}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body {
              font-family: 'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif;
              color: #1e293b;
              background: #fff;
              padding: 15px;
              font-size: 12.5px;
              line-height: 1.5;
            }
            .header-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px solid #0f766e;
              padding-bottom: 15px;
              margin-bottom: 15px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo-img {
              max-height: 70px;
              max-width: 140px;
              object-fit: contain;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              color: #0f766e;
              margin: 0;
            }
            .title-en {
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              margin: 0 0 4px 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 15px;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            table.items th {
              background: #0f766e;
              color: #fff;
              border: 1px solid #0f766e;
              padding: 8px 10px;
              font-weight: bold;
              font-size: 12px;
            }
            table.items td {
              border: 1px solid #e2e8f0;
            }
            .summary-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 15px;
              gap: 20px;
            }
            .totals-box {
              width: 320px;
              border-collapse: collapse;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              overflow: hidden;
            }
            .totals-box td {
              padding: 6px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .grand-total {
              background: #f0fdfa;
              font-weight: bold;
              font-size: 15px;
              color: #0f766e;
              border-top: 2px solid #0f766e;
            }
            .footer-policy {
              margin-top: 25px;
              padding: 10px;
              background: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 6px;
              font-size: 10.5px;
              color: #475569;
              text-align: center;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              padding: 0 30px;
              font-size: 11px;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="logo-section">
              ${showLogo ? `<img src="${settings.logoUrl}" class="logo-img" alt="Logo" />` : ''}
              <div>
                <h1 class="title">${settings.pharmacyName}</h1>
                ${settings.pharmacyNameEn ? `<div class="title-en">${settings.pharmacyNameEn}</div>` : ''}
                <div style="font-size: 11px; color: #475569;">${settings.branchName || 'الفرع الرئيسي'}</div>
                ${showAddress && settings.address ? `<div style="font-size: 11px; color: #475569;">${settings.address}</div>` : ''}
                ${showPhone && (settings.phone || settings.mobile) ? `<div style="font-size: 11px; color: #475569;">هاتف: ${settings.phone} ${settings.mobile ? `| جوال: ${settings.mobile}` : ''}</div>` : ''}
                ${showTax && settings.taxNumber ? `<div style="font-size: 11px; font-weight: bold; color: #0f766e;">الرقم الضريبي: ${settings.taxNumber}</div>` : ''}
              </div>
            </div>

            <div style="text-align: left;">
              <div style="font-size: 18px; font-weight: 800; color: #0f766e;">فاتورة مبيعات ضريبية</div>
              <div style="font-size: 12px; color: #64748b;">Tax Sales Invoice</div>
              <div style="margin-top: 5px; font-weight: bold; font-family: monospace; font-size: 13px;"># ${invoice.invoiceNumber}</div>
              <div style="font-size: 11px; color: #475569;">التاريخ: ${invoice.date} ${invoice.time}</div>
            </div>
          </div>

          <div class="info-grid">
            <div>
              <div><strong>اسم العميل:</strong> ${invoice.customerName || 'عميل نقدي عام'}</div>
              ${invoice.patientName ? `<div><strong>اسم المريض:</strong> ${invoice.patientName}</div>` : ''}
              ${invoice.doctorName ? `<div><strong>الطبيب المعالج:</strong> ${invoice.doctorName}</div>` : ''}
            </div>
            <div style="text-align: left;">
              <div><strong>طريقة الدفع:</strong> ${
                invoice.paymentMethod === 'cash' ? 'نقداً (Cash)' : invoice.paymentMethod === 'credit' ? 'آجل (Credit)' : 'شبكة/بطاقة (Card)'
              }</div>
              <div><strong>المسؤول / الكاشير:</strong> ${invoice.pharmacistName || invoice.cashierName || 'الصيدلية'}</div>
              ${showCr && settings.crNumber ? `<div><strong>السجل التجاري:</strong> ${settings.crNumber}</div>` : ''}
            </div>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%; text-align: right;">اسم الصنف الدوائي</th>
                <th style="width: 10%; text-align: center;">الوحدة</th>
                <th style="width: 10%; text-align: center;">الكمية</th>
                <th style="width: 12%; text-align: left;">سعر الوحدة</th>
                <th style="width: 8%; text-align: center;">الخصم</th>
                <th style="width: 10%; text-align: left;">المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary-section">
            <div style="display: flex; align-items: center; gap: 15px;">
              <img src="${qrUrl}" style="width: 90px; height: 90px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px;" alt="QR" />
              <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
                <div>* مسح الرمز يتيح التحقق الفوري من صحة الفاتورة.</div>
                <div>* تطبق الشروط واللوائح الصيدلانية المعتمدة.</div>
              </div>
            </div>

            <table class="totals-box">
              <tr>
                <td>المجموع الفرعي:</td>
                <td style="text-align: left; font-weight: bold; font-family: monospace;">${invoice.subtotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
              </tr>
              ${
                invoice.totalDiscount > 0
                  ? `<tr>
                      <td style="color: #e11d48;">الخصم الممنوح:</td>
                      <td style="text-align: left; font-weight: bold; color: #e11d48; font-family: monospace;">-${invoice.totalDiscount.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                    </tr>`
                  : ''
              }
              ${
                settings.enableVat && invoice.vatTotal > 0
                  ? `<tr>
                      <td>ضريبة القيمة المضافة (${settings.vatPercentage}%):</td>
                      <td style="text-align: left; font-weight: bold; font-family: monospace;">${invoice.vatTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                    </tr>`
                  : ''
              }
              <tr class="grand-total">
                <td>الإجمالي النهائي:</td>
                <td style="text-align: left; font-family: monospace;">${invoice.grandTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
              </tr>
              <tr>
                <td>المدفوع:</td>
                <td style="text-align: left; font-weight: bold; color: #0f766e; font-family: monospace;">${(invoice.paidAmount ?? invoice.grandTotal).toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
              </tr>
              <tr>
                <td>المتبقي:</td>
                <td style="text-align: left; font-weight: bold; font-family: monospace;">${(invoice.changeAmount ?? Math.max(0, (invoice.paidAmount ?? invoice.grandTotal) - invoice.grandTotal)).toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
              </tr>
            </table>
          </div>

          ${
            settings.returnPolicyText
              ? `<div class="footer-policy"><strong>سياسة الاسترجاع والضمان:</strong> ${settings.returnPolicyText}</div>`
              : ''
          }

          <div class="signatures">
            <div>توقيع المستلم / العميل: ................................</div>
            <div>ختم وتوقيع الصيدلية: ................................</div>
          </div>

          <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            ${settings.receiptFooterMessage || 'نتمنى لكم دوام الصحة والعافية - شكراً لزيارتكم'}
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Half Page A5 Invoice
   */
  printA5Invoice(invoice: SaleInvoice, settings: PharmacySettings) {
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const showLogo = settings.showLogoOnReceipt !== false && !!settings.logoUrl;

    const itemsHtml = invoice.items
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 5px; text-align: center;">${idx + 1}</td>
          <td style="padding: 5px; font-weight: bold;">${item.product.name}</td>
          <td style="padding: 5px; text-align: center;">${item.quantity} ${item.unitName}</td>
          <td style="padding: 5px; text-align: left; font-family: monospace;">${item.unitPrice.toLocaleString('ar-YE')}</td>
          <td style="padding: 5px; text-align: left; font-weight: bold; font-family: monospace;">${item.total.toLocaleString('ar-YE')}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة مبيعات A5 - ${invoice.invoiceNumber}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              color: #1e293b;
              padding: 5px;
              font-size: 11px;
            }
            .header-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            table.items th {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 5px;
              font-size: 10.5px;
            }
            table.items td {
              border: 1px solid #e2e8f0;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 8px;
              background: #f8fafc;
              padding: 6px 10px;
              border-radius: 6px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${showLogo ? `<img src="${settings.logoUrl}" style="max-height: 45px;" alt="Logo" />` : ''}
              <div>
                <div style="font-size: 16px; font-weight: 800; color: #0f766e;">${settings.pharmacyName}</div>
                <div style="font-size: 10px; color: #64748b;">${settings.branchName || ''} | هاتف: ${settings.phone}</div>
              </div>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 13px; font-weight: bold; color: #0f766e;">فاتورة مبيعات</div>
              <div style="font-family: monospace; font-size: 11px;"># ${invoice.invoiceNumber} | ${invoice.date}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 6px;">
            <span><strong>العميل:</strong> ${invoice.customerName || 'عميل نقدي'}</span>
            <span><strong>الكاشير:</strong> ${invoice.pharmacistName || invoice.cashierName || 'الصيدلية'}</span>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 50%; text-align: right;">الصنف</th>
                <th style="width: 14%; text-align: center;">الكمية</th>
                <th style="width: 15%; text-align: left;">السعر</th>
                <th style="width: 15%; text-align: left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-row">
            <span>طريقة الدفع: ${invoice.paymentMethod === 'cash' ? 'نقداً' : invoice.paymentMethod === 'credit' ? 'آجل' : 'بطاقة'}</span>
            <span style="font-size: 13px; color: #0f766e;">الإجمالي: ${invoice.grandTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>

          <div style="margin-top: 10px; text-align: center; font-size: 9.5px; color: #64748b;">
            ${settings.receiptFooterMessage || 'نتمنى لكم دوام الصحة والعافية'}
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print a sample test invoice to verify printer settings
   */
  printTestReceipt(settings: PharmacySettings) {
    const sampleInvoice: SaleInvoice = {
      id: 'test-inv-001',
      invoiceNumber: 'INV-TEST-001',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      customerId: 'cust-1',
      customerName: 'تجربة طباعة نموذج الفاتورة',
      patientName: 'أحمد سالم (مريض تجريبي)',
      doctorName: 'د. خالد العمري',
      pharmacistName: 'صيدلي النظام',
      items: [
        {
          id: 'item-1',
          product: {
            id: 'p-1',
            barcode: '6281001234567',
            name: 'بانادول إكسترا 500 ملغ (Panadol Extra)',
            scientificName: 'Paracetamol + Caffeine',
            category: 'مسكنات وخافضات حرارة',
            form: 'أقراص',
            strength: '500mg',
            manufacturer: 'GSK',
            costPrice: 1100,
            price: 1500,
            minStock: 5,
            requiresPrescription: false,
            vatRate: 0,
            active: true,
            totalQuantity: 50,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          unitType: 'package',
          unitName: 'باكت (24 قرص)',
          unitMultiplier: 1,
          quantity: 2,
          unitPrice: 1500,
          discountPercentage: 0,
          discountAmount: 0,
          vatAmount: 0,
          total: 3000,
        },
        {
          id: 'item-2',
          product: {
            id: 'p-2',
            barcode: '6281007654321',
            name: 'أموكسيل 500 ملغ كبسولات (Amoxil)',
            scientificName: 'Amoxicillin Trihydrate',
            category: 'مضادات حيوية',
            form: 'كبسولات',
            strength: '500mg',
            manufacturer: 'SmithKline',
            costPrice: 1600,
            price: 2200,
            minStock: 5,
            requiresPrescription: true,
            vatRate: 0,
            active: true,
            totalQuantity: 30,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          unitType: 'package',
          unitName: 'شريط (10 كبسولات)',
          unitMultiplier: 1,
          quantity: 1,
          unitPrice: 2200,
          discountPercentage: 0,
          discountAmount: 0,
          vatAmount: 0,
          total: 2200,
        },
      ],
      subtotal: 5200,
      totalDiscount: 0,
      vatTotal: 0,
      grandTotal: 5200,
      paidAmount: 6000,
      changeAmount: 800,
      paymentMethod: 'cash',
      status: 'completed',
      cashierId: 'usr-1',
      cashierName: 'درويش (المدير العام)',
      notes: 'فاتورة تجريبية لمعاينة جودة الطباعة ومقاس الورق',
      createdAt: new Date().toISOString(),
    };

    this.printInvoice(sampleInvoice, settings);
  },

  /**
   * Print Daily Financial & Cash Closing Report (Z-Report)
   */
  printDailyFinancialReport(data: any, settings: PharmacySettings, cashierName?: string) {
    const printWindow = window.open('', '_blank', 'width=500,height=750');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>تقرير إغلاق الوردية والمالية</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              width: 78mm;
              margin: 0 auto;
              padding: 8px;
              color: #000;
              background: #fff;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .title {
              font-size: 15px;
              font-weight: 900;
            }
            .section-title {
              font-weight: bold;
              background: #f1f5f9;
              padding: 3px 5px;
              margin: 8px 0 4px 0;
              border-radius: 4px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11.5px;
            }
            .total {
              font-weight: bold;
              font-size: 13px;
              border-top: 1px solid #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              border-top: 1px dashed #666;
              padding-top: 6px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${settings.pharmacyName}</div>
            <div>تقرير تقفيل الخزينة والوردية (Z-Report)</div>
            <div>التاريخ: ${new Date().toISOString().split('T')[0]} - الوقت: ${new Date().toLocaleTimeString('ar-YE')}</div>
            ${cashierName ? `<div>المستخدم: ${cashierName}</div>` : ''}
          </div>

          <div class="section-title">ملخص المبيعات والإيرادات</div>
          <div class="row">
            <span>عدد الفواتير الصادرة:</span>
            <span>${data.invoicesCount || 0} فاتورة</span>
          </div>
          <div class="row">
            <span>إجمالي المبيعات المحققة:</span>
            <span>${(data.salesTotal || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>

          <div class="section-title">طرق التحصيل والمقبوضات</div>
          <div class="row">
            <span>المقبوض نقداً (الدرج):</span>
            <span style="font-weight: bold;">${(data.cashSales || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>
          <div class="row">
            <span>المحصل عبر البطاقة والشبكة:</span>
            <span>${(data.cardSales || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>
          <div class="row">
            <span>مبيعات آجلة (ذمم عملاء):</span>
            <span>${(data.creditSales || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>

          <div class="section-title">الأرباح والمصروفات</div>
          <div class="row">
            <span>تكلفة البضاعة المباعة (COGS):</span>
            <span>${(data.costTotal || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>
          <div class="row">
            <span>مجمل الربح التجاري:</span>
            <span>${(data.grossProfit || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>
          <div class="row">
            <span>المصروفات التشغيلية:</span>
            <span>-${(data.expensesTotal || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>
          <div class="row total">
            <span>صافي الربح الفعلي:</span>
            <span>${(data.netProfit || 0).toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
          </div>

          <div class="footer">
            <div>تم التقفيل والاعتماد بنجاح</div>
            <div>نظام PharmaCare POS لإدارة الصيدليات</div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Comprehensive Periodic Financial Report (A4 Official - Daily, Weekly, Monthly, or Custom)
   */
  printPeriodicFinancialReport(
    data: {
      periodTitle: string;
      dateRangeStr: string;
      salesTotal: number;
      costTotal: number;
      grossProfit: number;
      grossMargin: number;
      expensesTotal: number;
      netProfit: number;
      netMargin: number;
      invoicesCount: number;
      itemsSoldCount: number;
      averageInvoiceValue: number;
      cashSales: number;
      cardSales: number;
      creditSales: number;
      purchasesTotal?: number;
      supplierDebtsTotal?: number;
      customerDebtsTotal?: number;
      bestSellers?: Array<{ name: string; qty: number; revenue: number; profit: number; margin: number }>;
      expenseCategories?: Array<{ category: string; amount: number }>;
    },
    settings: PharmacySettings,
    generatedBy?: string
  ) {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const bestSellersRows = (data.bestSellers || [])
      .slice(0, 8)
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#fff'}">
          <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold;">#${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${item.name}</td>
          <td style="padding: 6px 8px; text-align: center; font-family: monospace;">${item.qty.toLocaleString('ar-YE')}</td>
          <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: bold; color: #0f766e;">${item.revenue.toLocaleString('ar-YE')}</td>
          <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: bold; color: #15803d;">${item.profit.toLocaleString('ar-YE')}</td>
          <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold; color: #0369a1;">${item.margin}%</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>${data.periodTitle} - ${settings.pharmacyName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .report-box {
              border: 1.5px solid #0f766e;
              border-radius: 12px;
              padding: 16px;
              min-height: 98%;
            }
            .header-bar {
              border-bottom: 2px solid #0f766e;
              padding-bottom: 12px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .pharmacy-title { font-size: 20px; font-weight: 900; color: #0f766e; }
            .report-badge {
              background: linear-gradient(135deg, #0f766e, #0d9488);
              color: #fff;
              padding: 6px 16px;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 800;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 14px;
            }
            .kpi-card {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 8px 10px;
              background: #f8fafc;
              text-align: center;
            }
            .kpi-title { font-size: 10px; color: #64748b; font-weight: 600; }
            .kpi-val { font-size: 14px; font-weight: 900; font-family: monospace; margin-top: 3px; }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #0f766e;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 4px;
              margin: 12px 0 8px 0;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th { background: #f1f5f9; color: #334155; padding: 6px 8px; font-size: 10px; border-bottom: 2px solid #cbd5e1; }
            .pnl-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 10px;
              border-radius: 6px;
              margin-bottom: 4px;
              font-size: 11px;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
            }
            .pnl-total {
              background: #f0fdf4;
              border: 1.5px solid #86efac;
              font-weight: 900;
              font-size: 13px;
              color: #166534;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 24px;
              text-align: center;
              font-size: 10.5px;
            }
            .sig-line { margin-top: 28px; border-top: 1px dashed #64748b; width: 70%; margin-left: auto; margin-right: auto; }
          </style>
        </head>
        <body>
          <div class="report-box">
            <div class="header-bar">
              <div>
                <div class="pharmacy-title">${settings.pharmacyName}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                  ${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone} | الرقم الضريبي: ${settings.taxNumber || 'غير مسجل'}
                </div>
              </div>
              <div style="text-align: left;">
                <div class="report-badge">${data.periodTitle}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                  فترة التقرير: ${data.dateRangeStr} | استخراج: ${new Date().toISOString().split('T')[0]}
                </div>
              </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid">
              <div class="kpi-card" style="background: #f0fdfa; border-color: #99f6e4;">
                <div class="kpi-title" style="color: #0f766e;">إجمالي المبيعات (Revenue)</div>
                <div class="kpi-val" style="color: #0f766e;">${data.salesTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${data.invoicesCount} فاتورة بيع</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">مجمل الربح التجاري (Gross)</div>
                <div class="kpi-val" style="color: #0369a1;">${data.grossProfit.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
                <div style="font-size: 9px; color: #0369a1; font-weight: bold;">هامش مجمل: ${data.grossMargin}%</div>
              </div>
              <div class="kpi-card" style="background: #fff1f2; border-color: #fecdd3;">
                <div class="kpi-title" style="color: #be123c;">المصروفات التشغيلية (OPEX)</div>
                <div class="kpi-val" style="color: #be123c;">${data.expensesTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
                <div style="font-size: 9px; color: #881337;">تشغيلية وإدارية</div>
              </div>
              <div class="kpi-card" style="background: #ecfdf5; border-color: #6ee7b7; border-width: 1.5px;">
                <div class="kpi-title" style="color: #065f46; font-weight: 800;">صافي الربح الفعلي (Net Profit)</div>
                <div class="kpi-val" style="color: #065f46; font-size: 15px;">${data.netProfit.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
                <div style="font-size: 9px; color: #065f46; font-weight: 800;">هامش صافي: ${data.netMargin}%</div>
              </div>
            </div>

            <!-- P&L Breakdown Section -->
            <div class="section-title">قائمة الدخل والنتائج المالية المحققة (P&L Breakdown)</div>
            <div>
              <div class="pnl-row">
                <span>(+) إجمالي الإيرادات والمبيعات الصافية:</span>
                <span style="font-family: monospace; font-weight: bold; color: #0f766e;">+${data.salesTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
              </div>
              <div class="pnl-row">
                <span>(-) تكلفة البضاعة المباعة (Cost of Goods Sold - COGS):</span>
                <span style="font-family: monospace; font-weight: bold; color: #b91c1c;">-${data.costTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
              </div>
              <div class="pnl-row" style="background: #f1f5f9; font-weight: bold;">
                <span>(=) مجمل الربح من عمليات البيع:</span>
                <span style="font-family: monospace; font-weight: 800; color: #0369a1;">${data.grossProfit.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
              </div>
              <div class="pnl-row">
                <span>(-) إجمالي المصروفات والنفقات التشغيلية:</span>
                <span style="font-family: monospace; font-weight: bold; color: #be123c;">-${data.expensesTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
              </div>
              <div class="pnl-row pnl-total">
                <span>(★) صافي الربح الحقيقي القابل للتوزيع:</span>
                <span style="font-family: monospace; font-weight: 900; font-size: 15px;">${data.netProfit.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
              </div>
            </div>

            <!-- Cash Flow & Payments Section -->
            <div class="section-title">حركة الخزينة والتدفقات النقدية حسب طريقة السداد</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
              <div style="border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 8px; padding: 8px; text-align: center;">
                <div style="font-size: 10px; color: #166534; font-weight: bold;">المقبوض نقداً (الصندوق)</div>
                <div style="font-size: 13px; font-weight: 900; font-family: monospace; color: #15803d; margin-top: 2px;">
                  ${data.cashSales.toLocaleString('ar-YE')} ${settings.currencySymbol}
                </div>
              </div>
              <div style="border: 1px solid #bae6fd; background: #f0f9ff; border-radius: 8px; padding: 8px; text-align: center;">
                <div style="font-size: 10px; color: #0369a1; font-weight: bold;">المحصل عبر الشبكة والبطاقات</div>
                <div style="font-size: 13px; font-weight: 900; font-family: monospace; color: #0284c7; margin-top: 2px;">
                  ${data.cardSales.toLocaleString('ar-YE')} ${settings.currencySymbol}
                </div>
              </div>
              <div style="border: 1px solid #fed7aa; background: #fff7ed; border-radius: 8px; padding: 8px; text-align: center;">
                <div style="font-size: 10px; color: #c2410c; font-weight: bold;">مبيعات آجلة (ذمم عملاء)</div>
                <div style="font-size: 13px; font-weight: 900; font-family: monospace; color: #ea580c; margin-top: 2px;">
                  ${data.creditSales.toLocaleString('ar-YE')} ${settings.currencySymbol}
                </div>
              </div>
            </div>

            <!-- Best Sellers Table if available -->
            ${
              bestSellersRows.length > 0
                ? `
              <div class="section-title">الأدوية الأكثر مبيعاً وتحقيقاً للأرباح في هذه الفترة</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 6%;">#</th>
                    <th style="text-align: right; width: 34%;">اسم الصنف الدوائي</th>
                    <th style="width: 14%;">الكمية المباعة</th>
                    <th style="text-align: left; width: 16%;">إجمالي الإيراد</th>
                    <th style="text-align: left; width: 16%;">صافي الربح</th>
                    <th style="width: 14%;">نسبة الهامش</th>
                  </tr>
                </thead>
                <tbody>
                  ${bestSellersRows}
                </tbody>
              </table>
            `
                : ''
            }

            <div class="signatures">
              <div>
                <div>المحاسب المسؤول / مدخل البيانات</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${generatedBy || 'مدير الصيدلية'}</div>
                <div class="sig-line"></div>
              </div>
              <div>
                <div>مدير الفرع / الصيدلي المسؤول</div>
                <div class="sig-line"></div>
              </div>
              <div>
                <div>ختم واعتماد الصيدلية</div>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Barcode Label Stickers for Pharmacy Shelves or Boxes (e.g. 50x25mm)
   */
  printBarcodeLabels(product: Product, batch?: Batch, quantity = 1, pharmacyName = 'صيدلية النور') {
    const printWindow = window.open('', '_blank', 'width=450,height=500');
    if (!printWindow) return;

    const labels = Array.from({ length: quantity })
      .map(
        () => `
        <div class="label-sticker">
          <div class="pharmacy-tag">${pharmacyName}</div>
          <div class="product-name">${product.name}</div>
          <div class="product-info">${product.strength || ''} - ${product.form || ''}</div>
          <div class="barcode-display">||| | |||| || ||| | |||</div>
          <div class="barcode-num">${product.barcode}</div>
          <div class="price-tag">
            <span class="price-val">${product.price.toLocaleString('ar-YE')} ر.ي</span>
            ${batch?.expiryDate ? `<span class="exp-val">EXP: ${batch.expiryDate}</span>` : ''}
          </div>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>طباعة ملصقات الباركود - ${product.name}</title>
          <style>
            @page {
              size: 50mm 25mm;
              margin: 0;
            }
            body {
              font-family: Tahoma, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .label-sticker {
              width: 48mm;
              height: 24mm;
              margin: 0.5mm auto;
              box-sizing: border-box;
              padding: 1.5mm;
              text-align: center;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .pharmacy-tag {
              font-size: 7.5px;
              font-weight: bold;
              color: #333;
            }
            .product-name {
              font-size: 9.5px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .product-info {
              font-size: 7.5px;
              color: #555;
            }
            .barcode-display {
              font-family: monospace;
              letter-spacing: 2px;
              font-weight: bold;
              font-size: 11px;
              line-height: 1;
            }
            .barcode-num {
              font-size: 8px;
              font-family: monospace;
            }
            .price-tag {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #000;
              padding-top: 1px;
            }
            .price-val {
              font-size: 10px;
              font-weight: 900;
            }
            .exp-val {
              font-size: 7.5px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${labels}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Official Customer Account Statement (A4)
   */
  printCustomerAccountStatement(
    customer: Customer,
    transactions: Array<{
      date: string;
      time?: string;
      type: string;
      typeLabel: string;
      ref: string;
      description: string;
      paymentMethod?: string;
      debit: number;
      credit: number;
      balance: number;
    }>,
    settings: PharmacySettings
  ) {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) return;

    const totalDebit = transactions.reduce((acc, t) => acc + t.debit, 0);
    const totalCredit = transactions.reduce((acc, t) => acc + t.credit, 0);
    const hasDebt = customer.currentBalance > 0;

    const rowsHtml = transactions
      .map(
        (t, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-size: 10px; color: #475569;">
            ${t.date}<br/><span style="color: #94a3b8; font-size: 9px;">${t.time || ''}</span>
          </td>
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-weight: bold; color: #3b82f6;">${t.ref}</td>
          <td style="padding: 8px 6px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; ${
              t.type === 'payment'
                ? 'background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'
                : t.type === 'return'
                ? 'background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;'
                : 'background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;'
            }">
              ${t.typeLabel}
            </span>
          </td>
          <td style="padding: 8px 8px; text-align: right; color: #1e293b;">
            <div style="font-weight: 600;">${t.description}</div>
            ${t.paymentMethod ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">طريقة الدفع: ${t.paymentMethod === 'cash' ? 'نقداً' : t.paymentMethod === 'card' ? 'شبكة / بطاقة' : t.paymentMethod === 'credit' ? 'آجل' : t.paymentMethod}</div>` : ''}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: bold; color: ${t.debit > 0 ? '#0f172a' : '#cbd5e1'};">
            ${t.debit > 0 ? t.debit.toLocaleString('ar-YE') : '-'}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: bold; color: ${t.credit > 0 ? '#15803d' : '#cbd5e1'}; background-color: ${t.credit > 0 ? '#f0fdf4' : 'transparent'};">
            ${t.credit > 0 ? '+' + t.credit.toLocaleString('ar-YE') : '-'}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: 800; color: ${t.balance > 0 ? '#b91c1c' : '#15803d'}; background-color: #f1f5f9;">
            ${t.balance.toLocaleString('ar-YE')}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>كشف حساب عميل رسمي - ${customer.name}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .statement-container {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 16px;
              min-height: 98%;
            }
            .header-bar {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .pharmacy-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .pharmacy-sub {
              font-size: 11px;
              color: #475569;
              margin-top: 2px;
            }
            .statement-badge-box {
              text-align: left;
            }
            .statement-badge {
              background: linear-gradient(135deg, #1e1b4b, #312e81);
              color: #fff;
              padding: 6px 16px;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 800;
              display: inline-block;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .info-label {
              color: #64748b;
              font-size: 10px;
              font-weight: 600;
            }
            .info-val {
              font-weight: bold;
              color: #0f172a;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            th {
              background-color: #0f172a;
              color: #fff;
              padding: 8px 6px;
              font-size: 10px;
              font-weight: 700;
              border: 1px solid #0f172a;
              text-align: center;
            }
            .summary-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              margin-top: 14px;
            }
            .status-note-box {
              flex: 1;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              font-size: 11px;
              color: #475569;
            }
            .summary-table {
              width: 340px;
              border-collapse: collapse;
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid #cbd5e1;
            }
            .summary-table td {
              padding: 6px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
            }
            .final-debt-row {
              background-color: ${hasDebt ? '#fee2e2' : '#dcfce7'};
              color: ${hasDebt ? '#991b1b' : '#166534'};
              font-weight: 900;
              font-size: 13px;
            }
            .signatures {
              margin-top: 36px;
              display: flex;
              justify-content: space-between;
              padding: 0 30px;
              font-size: 11px;
              font-weight: bold;
              color: #334155;
            }
            .signature-line {
              margin-top: 36px;
              border-top: 1px dashed #94a3b8;
              width: 130px;
            }
            @media print {
              .statement-container { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="statement-container">
            <!-- Header -->
            <div class="header-bar">
              <div>
                <div class="pharmacy-title">${settings.pharmacyName}</div>
                <div class="pharmacy-sub">
                  ${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone || settings.mobile} | العنوان: ${settings.address}
                </div>
              </div>
              <div class="statement-badge-box">
                <div class="statement-badge">كشف حساب عميل مفصل (آجل)</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace; text-align: left;">
                  تاريخ الطباعة: ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <!-- Customer Profile Info -->
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">اسم العميل:</span>
                <span class="info-val" style="font-size: 13px; color: #1e1b4b;">${customer.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهاتف:</span>
                <span class="info-val font-mono">${customer.phone}</span>
              </div>
              <div class="info-item">
                <span class="info-label">العنوان / المنطقة:</span>
                <span class="info-val">${customer.address || 'غير محدد'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">سقف الائتمان المسموح:</span>
                <span class="info-val font-mono">${customer.maxCreditLimit > 0 ? customer.maxCreditLimit.toLocaleString('ar-YE') + ' ' + settings.currencySymbol : 'بدون سقف ائتماني'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">حالة الحساب الحالية:</span>
                <span class="info-val" style="color: ${hasDebt ? '#b91c1c' : '#15803d'}; font-weight: 800;">
                  ${hasDebt ? 'رصيد مدين مستحق السداد' : 'الحساب خالص ومسدد بالكامل'}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">صافي الرصيد المتبقي:</span>
                <span class="info-val font-mono" style="color: ${hasDebt ? '#b91c1c' : '#15803d'}; font-size: 13px; font-weight: 900;">
                  ${customer.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}
                </span>
              </div>
            </div>

            <!-- Ledger Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 12%;">التاريخ والوقت</th>
                  <th style="width: 13%;">رقم المرجع</th>
                  <th style="width: 14%;">نوع الحركة</th>
                  <th style="width: 27%; text-align: right; padding-right: 8px;">البيان والتفاصيل</th>
                  <th style="width: 11%; text-align: left;">مدين (مشتريات)</th>
                  <th style="width: 12%; text-align: left;">دائن (المقبوض والمسدد)</th>
                  <th style="width: 11%; text-align: left;">الرصيد المتبقي</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align: center; padding: 25px; color: #64748b;">لا توجد حركات مسجلة في هذا الكشف</td></tr>'}
              </tbody>
            </table>

            <!-- Summary Table & Notes -->
            <div class="summary-section">
              <div class="status-note-box">
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px;">إقرار مطابقة الحساب:</div>
                <p style="margin: 0; line-height: 1.5;">
                  تم استخراج هذا الكشف آلياً من النظام المحاسبي لصيدلية <strong>${settings.pharmacyName}</strong>. يُرجى مراجعة الحركات والتواصل في حال وجود أي استفسار أو ملاحظة خلال مدة أقصاها 7 أيام من تاريخه.
                </p>
              </div>

              <table class="summary-table">
                <tr>
                  <td style="color: #475569;">إجمالي المسحوبات (المدين):</td>
                  <td style="text-align: left; font-weight: bold; font-family: monospace;">${totalDebit.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
                <tr style="background-color: #f0fdf4; color: #15803d;">
                  <td>إجمالي المقبوض والمسدد (الدائن):</td>
                  <td style="text-align: left; font-weight: bold; font-family: monospace;">+${totalCredit.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
                <tr class="final-debt-row">
                  <td>صافي الرصيد المستحق (الدين):</td>
                  <td style="text-align: left; font-weight: 900; font-family: monospace; font-size: 14px;">${customer.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
              </table>
            </div>

            <!-- Signatures -->
            <div class="signatures">
              <div>
                <div>المحاسب المسؤول / الخزينة</div>
                <div class="signature-line"></div>
              </div>
              <div>
                <div>توقيع العميل / المستلم</div>
                <div class="signature-line"></div>
              </div>
              <div>
                <div>ختم واعتماد الصيدلية</div>
                <div class="signature-line"></div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Compact Thermal 80mm/58mm Statement Slip for Customer
   */
  printCustomerStatementThermal(
    customer: Customer,
    transactions: Array<{
      id: string;
      date: string;
      time?: string;
      type: 'payment' | 'invoice' | 'return';
      typeLabel: string;
      ref: string;
      description: string;
      paymentMethod?: string;
      debit: number;
      credit: number;
      balance: number;
    }>,
    settings: PharmacySettings
  ) {
    const is58mm = settings.receiptSize === '58mm';
    const paperWidth = is58mm ? '58mm' : '80mm';
    const fontSize = is58mm ? '10px' : '11.5px';

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const totalDebit = transactions.reduce((acc, t) => acc + t.debit, 0);
    const totalCredit = transactions.reduce((acc, t) => acc + t.credit, 0);

    const rowsHtml = transactions
      .slice(-15)
      .map(
        (t) => `
        <tr style="border-bottom: 1px dashed #ccc; font-size: ${fontSize};">
          <td style="padding: 3px 2px; text-align: right;">
            <div style="font-weight: bold;">${t.ref} (${t.typeLabel})</div>
            <div style="font-size: 9px; color: #555;">${t.date}</div>
          </td>
          <td style="padding: 3px 2px; text-align: center; font-family: monospace;">
            ${t.debit > 0 ? t.debit.toLocaleString('ar-YE') : '-'}
          </td>
          <td style="padding: 3px 2px; text-align: center; font-family: monospace; font-weight: bold; color: #047857;">
            ${t.credit > 0 ? '+' + t.credit.toLocaleString('ar-YE') : '-'}
          </td>
          <td style="padding: 3px 2px; text-align: left; font-family: monospace; font-weight: bold;">
            ${t.balance.toLocaleString('ar-YE')}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>موجز كشف حساب - ${customer.name}</title>
          <style>
            @page { size: ${paperWidth} auto; margin: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              width: ${paperWidth};
              margin: 0 auto;
              padding: 6px;
              color: #000;
              background: #fff;
              font-size: ${fontSize};
              line-height: 1.3;
            }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 4px; margin-bottom: 5px; }
            .title { font-weight: bold; font-size: 13px; margin: 3px 0; }
            .info-box { background: #f4f4f4; padding: 4px; border-radius: 4px; margin-bottom: 5px; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; }
            th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 1px; font-size: 10px; }
            .totals { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; margin-top: 6px; padding: 4px 0; }
            .tot-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .due-box { background: #000; color: #fff; text-align: center; padding: 5px; font-size: 13px; font-weight: bold; margin-top: 6px; border-radius: 3px; }
            .footer { text-align: center; font-size: 9.5px; color: #444; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-weight: 800; font-size: 14px;">${settings.pharmacyName || 'الصيدلية'}</div>
            <div style="font-size: 10px;">${settings.phone || ''} ${settings.address ? ' - ' + settings.address : ''}</div>
            <div class="title">موجز كشف حساب عميل (إيصال)</div>
            <div style="font-size: 9px; color: #666;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-YE')} ${new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          <div class="info-box">
            <div><strong>العميل:</strong> ${customer.name}</div>
            <div><strong>الهاتف:</strong> ${customer.phone}</div>
            ${customer.maxCreditLimit ? `<div><strong>سقف الائتمان:</strong> ${customer.maxCreditLimit.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: right;">الحركة</th>
                <th style="text-align: center;">سحب</th>
                <th style="text-align: center;">سداد</th>
                <th style="text-align: left;">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="tot-row">
              <span>إجمالي المسحوبات:</span>
              <span style="font-family: monospace; font-weight: bold;">${totalDebit.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
            <div class="tot-row">
              <span>إجمالي المقبوضات:</span>
              <span style="font-family: monospace; font-weight: bold; color: #047857;">${totalCredit.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
          </div>

          <div class="due-box">
            المتبقي المستحق: ${customer.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}
          </div>

          <div class="footer">
            <div>شكراً لتعاملكم معنا ونسعد بخدمتكم دائماً</div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Official Receipt Voucher for Customer Debt Payment (سند قبض رسمي)
   */
  printCustomerPaymentReceipt(
    payment: {
      id: string;
      customerId: string;
      customerName: string;
      date: string;
      amount: number;
      paymentMethod: string;
      notes?: string;
      recordedBy: string;
    },
    customer: Customer,
    settings: PharmacySettings
  ) {
    const printWindow = window.open('', '_blank', 'width=550,height=750');
    if (!printWindow) return;

    const methodLabels: Record<string, string> = {
      cash: 'نقداً (خزينة)',
      card: 'شبكة / بطاقة مدى',
      bank_transfer: 'تحويل بنكي',
    };

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>سند قبض مالي - ${payment.id}</title>
          <style>
            @page { size: 148mm 210mm; margin: 8mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
              background: #fff;
              font-size: 12px;
            }
            .voucher-box {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 14px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
            }
            .receipt-badge {
              background: #15803d;
              color: #fff;
              padding: 4px 10px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 13px;
            }
            .amount-banner {
              background: #f0fdf4;
              border: 1.5px dashed #15803d;
              border-radius: 8px;
              padding: 10px;
              margin: 12px 0;
              text-align: center;
            }
            .amount-val {
              font-size: 22px;
              font-weight: 900;
              color: #15803d;
              font-family: monospace;
            }
            .field-row {
              display: flex;
              margin-bottom: 8px;
              font-size: 12px;
              line-height: 1.5;
            }
            .field-label {
              width: 140px;
              font-weight: bold;
              color: #475569;
            }
            .field-val {
              flex: 1;
              color: #0f172a;
              font-weight: 600;
            }
            .footer-sig {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              padding: 0 20px;
            }
            .sig-item {
              text-align: center;
              font-weight: bold;
            }
            .sig-space {
              margin-top: 35px;
              border-top: 1px dashed #64748b;
              width: 120px;
            }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <div class="header">
              <div>
                <div class="title">${settings.pharmacyName}</div>
                <div style="font-size: 11px; color: #64748b;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
              </div>
              <div style="text-align: left;">
                <span class="receipt-badge">سند قبض مالي</span>
                <div style="font-family: monospace; font-weight: bold; margin-top: 4px;">رقم السند: #${payment.id.slice(-6).toUpperCase()}</div>
              </div>
            </div>

            <div class="amount-banner">
              <div style="font-size: 11px; color: #166534; font-weight: bold;">المبلغ المقبوض والمسدد</div>
              <div class="amount-val">${payment.amount.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
            </div>

            <div class="field-row">
              <div class="field-label">استلمنا من العميل:</div>
              <div class="field-val" style="font-size: 13px; color: #1e1b4b;">${customer.name} (هاتف: ${customer.phone})</div>
            </div>

            <div class="field-row">
              <div class="field-label">تاريخ القبض والسداد:</div>
              <div class="field-val font-mono">${payment.date}</div>
            </div>

            <div class="field-row">
              <div class="field-label">طريقة القبض:</div>
              <div class="field-val">${methodLabels[payment.paymentMethod] || payment.paymentMethod}</div>
            </div>

            <div class="field-row">
              <div class="field-label">وذلك عن / البيان:</div>
              <div class="field-val">${payment.notes || 'سداد دفعة من الحساب الآجل والديون'}</div>
            </div>

            <div class="field-row">
              <div class="field-label">الرصيد المتبقي على العميل:</div>
              <div class="field-val font-mono" style="color: #b91c1c; font-weight: bold;">
                ${customer.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}
              </div>
            </div>

            <div class="field-row">
              <div class="field-label">المستلم / أمين الصندوق:</div>
              <div class="field-val">${payment.recordedBy}</div>
            </div>

            <div class="footer-sig">
              <div class="sig-item">
                <div>توقيع المسدد / العميل</div>
                <div class="sig-space"></div>
              </div>
              <div class="sig-item">
                <div>أمين الصندوق / الكاشير</div>
                <div class="sig-space"></div>
              </div>
              <div class="sig-item">
                <div>الختم الرسمي</div>
                <div class="sig-space"></div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print comprehensive Debtors and Receivables Report (A4)
   */
  printDebtorsReport(customers: Customer[], settings: PharmacySettings) {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const debtors = customers.filter((c) => c.currentBalance > 0);
    const totalDebts = debtors.reduce((acc, c) => acc + c.currentBalance, 0);
    const totalPurchases = customers.reduce((acc, c) => acc + c.totalPurchases, 0);

    const rowsHtml = debtors
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .map(
        (c, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px; text-align: center; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: #0f172a;">${c.name}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${c.phone}</td>
          <td style="padding: 8px; text-align: center; color: #64748b;">${c.address || '-'}</td>
          <td style="padding: 8px; text-align: left; font-family: monospace; color: #475569;">${c.maxCreditLimit > 0 ? c.maxCreditLimit.toLocaleString('ar-YE') : 'غير محدد'}</td>
          <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #0f766e;">${c.totalPurchases.toLocaleString('ar-YE')}</td>
          <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: 800; color: #b91c1c; background-color: #fef2f2;">${c.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>تقرير ديون وذمم العملاء - ${settings.pharmacyName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .report-box {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 16px;
            }
            .header-table { width: 100%; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 14px; }
            .kpi-grid { display: flex; gap: 10px; margin-bottom: 14px; }
            .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
            .kpi-val { font-size: 14px; font-weight: 800; font-family: monospace; margin-top: 4px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.data-table th { background: #f1f5f9; color: #334155; padding: 8px; font-size: 10px; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="report-box">
            <table class="header-table">
              <tr>
                <td style="text-align: right;">
                  <h2 style="margin: 0; color: #0f766e; font-size: 16px;">${settings.pharmacyName}</h2>
                  <div style="color: #64748b; font-size: 10px;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
                </td>
                <td style="text-align: left;">
                  <div style="font-size: 14px; font-weight: bold; color: #b91c1c;">كشف ديون وذمم العملاء الشامل</div>
                  <div style="font-size: 10px; color: #64748b;">تاريخ الاستخراج: ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
              </tr>
            </table>

            <div class="kpi-grid">
              <div class="kpi-card" style="border-color: #fecaca; background-color: #fef2f2;">
                <div style="color: #991b1b; font-weight: bold;">إجمالي الديون المستحقة</div>
                <div class="kpi-val" style="color: #b91c1c;">${totalDebts.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
              <div class="kpi-card">
                <div style="color: #475569; font-weight: bold;">عدد العملاء المدينين</div>
                <div class="kpi-val" style="color: #0f172a;">${debtors.length} عميل</div>
              </div>
              <div class="kpi-card">
                <div style="color: #0f766e; font-weight: bold;">إجمالي مسحوبات العملاء</div>
                <div class="kpi-val" style="color: #0f766e;">${totalPurchases.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 4%;">#</th>
                  <th style="text-align: right; width: 26%;">اسم العميل</th>
                  <th style="width: 15%;">رقم الهاتف</th>
                  <th style="width: 15%;">العنوان</th>
                  <th style="text-align: left; width: 12%;">سقف الائتمان</th>
                  <th style="text-align: left; width: 13%;">المسحوبات</th>
                  <th style="text-align: left; width: 15%;">الرصيد المدين</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
                  <td colspan="6" style="padding: 10px; text-align: left; font-size: 12px;">الإجمالي العام للديون المستحقة:</td>
                  <td style="padding: 10px; text-align: left; font-family: monospace; font-size: 13px; color: #b91c1c;">${totalDebts.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Official Purchase Invoice / Goods Receiving Voucher (A4)
   */
  printPurchaseInvoice(invoice: PurchaseInvoice, settings: PharmacySettings) {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const itemsHtml = invoice.items
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px 6px; text-align: center; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: #0f172a;">
            <div>${item.productName}</div>
            <div style="font-size: 9px; color: #64748b; font-family: monospace;">باركود: ${item.barcode}</div>
          </td>
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-weight: bold; color: #0f766e;">
            ${item.batchNumber || '-'}
          </td>
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; color: #b45309;">
            ${item.expiryDate || '-'}
          </td>
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-weight: 800; font-size: 12px;">
            ${item.quantity}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: bold; color: #0f766e;">
            ${item.costPrice.toLocaleString('ar-YE')}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; color: #475569;">
            ${item.sellingPrice.toLocaleString('ar-YE')}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: 800; color: #0f172a; background-color: #f1f5f9;">
            ${item.total.toLocaleString('ar-YE')}
          </td>
        </tr>
      `
      )
      .join('');

    const grandTotal = invoice.grandTotal || invoice.totalAmount || 0;
    const paidAmount = invoice.paidAmount || 0;
    const remaining = invoice.remainingAmount || Math.max(0, grandTotal - paidAmount);

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة شراء وتوريد #${invoice.invoiceNumber} - ${settings.pharmacyName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .invoice-box {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 16px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .meta-item { display: flex; flex-direction: column; gap: 2px; }
            .meta-label { color: #64748b; font-size: 10px; font-weight: 600; }
            .meta-val { font-weight: bold; color: #0f172a; font-size: 12px; }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            table.data-table th {
              background: #f1f5f9;
              color: #334155;
              padding: 8px;
              font-size: 10px;
              border-bottom: 2px solid #cbd5e1;
            }
            .summary-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-top: 14px;
            }
            .notes-box {
              flex: 1;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              background-color: #fafafa;
              font-size: 10px;
              color: #475569;
            }
            .summary-table {
              width: 320px;
              border-collapse: collapse;
            }
            .summary-table td {
              padding: 6px 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            .grand-total-row {
              background-color: #f0fdf4;
              font-weight: bold;
              border-top: 2px solid #0f766e;
              border-bottom: 2px solid #0f766e;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px dashed #cbd5e1;
              text-align: center;
              font-size: 11px;
            }
            .sig-line {
              margin-top: 30px;
              border-top: 1px dashed #64748b;
              width: 70%;
              margin-left: auto;
              margin-right: auto;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td style="text-align: right;">
                  <h2 style="margin: 0; color: #0f766e; font-size: 18px;">${settings.pharmacyName}</h2>
                  <div style="color: #64748b; font-size: 10px;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
                  <div style="color: #64748b; font-size: 10px;">العنوان: ${settings.address}</div>
                </td>
                <td style="text-align: left;">
                  <div style="background: linear-gradient(135deg, #0f766e, #0d9488); color: #fff; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 13px; display: inline-block;">
                    سند إدخال وفاتورة مشتريات
                  </div>
                  <div style="font-family: monospace; font-weight: bold; margin-top: 4px; font-size: 12px;">رقم الفاتورة: #${invoice.invoiceNumber}</div>
                  ${invoice.supplierInvoiceNumber ? `<div style="font-family: monospace; color: #64748b; font-size: 10px;">فاتورة المورد: ${invoice.supplierInvoiceNumber}</div>` : ''}
                </td>
              </tr>
            </table>

            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">اسم الشركة / المورد:</span>
                <span class="meta-val" style="color: #0f766e;">${invoice.supplierName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">تاريخ التوريد:</span>
                <span class="meta-val font-mono">${invoice.date}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">حالة السداد:</span>
                <span class="meta-val" style="color: ${invoice.paymentStatus === 'paid' ? '#15803d' : invoice.paymentStatus === 'partial' ? '#b45309' : '#b91c1c'};">
                  ${invoice.paymentStatus === 'paid' ? 'مدفوعة بالكامل' : invoice.paymentStatus === 'partial' ? 'مدفوعة جزئياً' : 'آجل (دين غير مسدد)'}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">أمين المخزن / المستلم:</span>
                <span class="meta-val">${invoice.createdBy || 'مدير الصيدلية'}</span>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 4%;">#</th>
                  <th style="text-align: right; width: 30%;">اسم الصنف الدوائي</th>
                  <th style="width: 13%;">رقم التشغيلة (Batch)</th>
                  <th style="width: 12%;">تاريخ الانتهاء</th>
                  <th style="width: 8%;">الكمية</th>
                  <th style="text-align: left; width: 11%;">سعر الشراء</th>
                  <th style="text-align: left; width: 11%;">سعر البيع</th>
                  <th style="text-align: left; width: 11%;">إجمالي التكلفة</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="summary-section">
              <div class="notes-box">
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px;">ملاحظات الفاتورة والتوريد:</div>
                <p style="margin: 0; line-height: 1.5;">${invoice.notes || 'تم فحص البضاعة ومطابقة التواريخ والتشغيلات واستلامها بحالة سليمة وإضافتها للمخزون الصيدلاني.'}</p>
              </div>

              <table class="summary-table">
                <tr>
                  <td style="color: #64748b;">إجمالي الأصناف:</td>
                  <td style="text-align: left; font-family: monospace; font-weight: bold;">${invoice.items.length} أصناف</td>
                </tr>
                <tr class="grand-total-row">
                  <td style="color: #0f766e; font-size: 12px;">إجمالي قيمة الفاتورة:</td>
                  <td style="text-align: left; font-family: monospace; font-size: 14px; color: #0f766e;">${grandTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="color: #15803d; font-weight: bold;">المبلغ المسدد للمورد:</td>
                  <td style="text-align: left; font-family: monospace; font-weight: bold; color: #15803d;">${paidAmount.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
                <tr style="background-color: ${remaining > 0 ? '#fef2f2' : '#f8fafc'};">
                  <td style="color: ${remaining > 0 ? '#b91c1c' : '#475569'}; font-weight: bold;">المتبقي (آجل على الصيدلية):</td>
                  <td style="text-align: left; font-family: monospace; font-weight: 800; color: ${remaining > 0 ? '#b91c1c' : '#475569'};">
                    ${remaining.toLocaleString('ar-YE')} ${settings.currencySymbol}
                  </td>
                </tr>
              </table>
            </div>

            <div class="signatures">
              <div>
                <div>مندوب شركة الأدوية / المورد</div>
                <div class="sig-line"></div>
              </div>
              <div>
                <div>أمين المخزن / المستلم</div>
                <div class="sig-line"></div>
              </div>
              <div>
                <div>اعتماد إدارة الصيدلية</div>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Thermal Receiving Slip (80mm/58mm) for Purchases
   */
  printPurchaseThermalReceipt(invoice: PurchaseInvoice, settings: PharmacySettings) {
    const is58mm = settings.receiptSize === '58mm';
    const paperWidth = is58mm ? '58mm' : '80mm';
    const fontSize = is58mm ? '11px' : '12px';

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const itemsHtml = invoice.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px dashed #ddd; font-size: ${fontSize};">
          <td style="padding: 4px 2px; text-align: right; width: 45%;">
            <div style="font-weight: bold; color: #111;">${item.productName}</div>
            <div style="font-size: 9.5px; color: #666;">EXP: ${item.expiryDate || '-'} | B: ${item.batchNumber || '-'}</div>
          </td>
          <td style="padding: 4px 2px; text-align: center; width: 25%; font-size: 11px; font-family: monospace;">
            ${item.quantity} × ${(item.costPrice || 0).toLocaleString('ar-YE')}
          </td>
          <td style="padding: 4px 2px; text-align: left; width: 30%; font-weight: bold; font-family: monospace;">
            ${(item.total || 0).toLocaleString('ar-YE')}
          </td>
        </tr>
      `
      )
      .join('');

    const grandTotal = invoice.grandTotal || invoice.totalAmount || 0;
    const paidAmount = invoice.paidAmount || 0;
    const remaining = invoice.remainingAmount || Math.max(0, grandTotal - paidAmount);

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>سند استلام بضاعة #${invoice.invoiceNumber}</title>
          <style>
            @page { size: ${paperWidth} auto; margin: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              width: ${paperWidth};
              margin: 0 auto;
              padding: 8px;
              color: #000;
              background: #fff;
              font-size: ${fontSize};
              line-height: 1.35;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
            .pharmacy-name { font-size: 16px; font-weight: 800; margin: 0 0 2px 0; }
            .title { font-weight: bold; font-size: 12px; background: #eee; padding: 3px 0; border-radius: 3px; margin: 4px 0; }
            .meta-row { display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; }
            th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 2px; font-size: 10.5px; }
            .totals { border-top: 1px solid #000; margin-top: 6px; padding-top: 4px; }
            .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
            .grand-total { font-size: 14px; font-weight: 900; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
            .footer { text-align: center; margin-top: 10px; font-size: 9.5px; color: #555; border-top: 1px dashed #999; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="pharmacy-name">${settings.pharmacyName}</h1>
            <div style="font-size: 10px;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
            <div class="title">سند استلام وتوريد مشتريات</div>
          </div>

          <div class="meta-row">
            <span><strong>رقم الفاتورة:</strong> #${invoice.invoiceNumber}</span>
            <span><strong>التاريخ:</strong> ${invoice.date}</span>
          </div>
          <div class="meta-row">
            <span><strong>المورد:</strong> ${invoice.supplierName}</span>
          </div>
          ${invoice.supplierInvoiceNumber ? `<div class="meta-row"><span><strong>فاتورة المورد:</strong> ${invoice.supplierInvoiceNumber}</span></div>` : ''}

          <table>
            <thead>
              <tr>
                <th style="text-align: right;">الصنف الدوائي</th>
                <th style="text-align: center;">الكمية × السعر</th>
                <th style="text-align: left;">التكلفة</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row grand-total">
              <span>إجمالي الفاتورة:</span>
              <span>${grandTotal.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
            <div class="total-row">
              <span>المدفوع للمورد:</span>
              <span>${paidAmount.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
            <div class="total-row" style="font-weight: bold; color: ${remaining > 0 ? '#b91c1c' : '#0f766e'};">
              <span>المتبقي (آجل):</span>
              <span>${remaining.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
            </div>
          </div>

          <div class="footer">
            <div>المستلم: ${invoice.createdBy || 'مدير الصيدلية'}</div>
            <div>تم توريد البضاعة للمخزن بنجاح</div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Official Supplier Payment / Disbursement Voucher (سند صرف مالي)
   */
  printSupplierPaymentReceipt(
    payment: {
      id: string;
      amount: number;
      date: string;
      paymentMethod: string;
      notes?: string;
      recordedBy: string;
    },
    supplier: Supplier,
    settings: PharmacySettings
  ) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const methodLabels: Record<string, string> = {
      cash: 'نقداً من الصندوق (كاش)',
      card: 'شبكة / بطاقة مصرفية',
      transfer: 'حوالة / تحويل بنكي',
      check: 'شيك مصرفي',
    };

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>سند صرف مالي للمورد #${payment.id.slice(-6).toUpperCase()}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 12px;
              line-height: 1.5;
            }
            .voucher-box {
              border: 2px solid #0f766e;
              border-radius: 12px;
              padding: 16px 20px;
              background: #fafafa;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .title { font-size: 18px; font-weight: 900; color: #0f766e; }
            .receipt-badge {
              background: #b45309;
              color: #fff;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: bold;
            }
            .amount-banner {
              background: #fffbeb;
              border: 1.5px dashed #f59e0b;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              margin-bottom: 12px;
            }
            .amount-val { font-size: 20px; font-weight: 900; color: #92400e; font-family: monospace; }
            .field-row {
              display: flex;
              align-items: baseline;
              padding: 6px 0;
              border-bottom: 1px dotted #cbd5e1;
            }
            .field-label { width: 170px; color: #475569; font-weight: 600; font-size: 11px; }
            .field-val { flex: 1; font-weight: bold; color: #0f172a; }
            .footer-sig {
              display: flex;
              justify-content: space-between;
              margin-top: 24px;
              padding-top: 10px;
              text-align: center;
              font-size: 11px;
            }
            .sig-item { width: 30%; }
            .sig-space { margin-top: 30px; border-top: 1px dashed #64748b; width: 120px; }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <div class="header">
              <div>
                <div class="title">${settings.pharmacyName}</div>
                <div style="font-size: 11px; color: #64748b;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
              </div>
              <div style="text-align: left;">
                <span class="receipt-badge">سند صرف مالي للمورد</span>
                <div style="font-family: monospace; font-weight: bold; margin-top: 4px;">رقم السند: #${payment.id.slice(-6).toUpperCase()}</div>
              </div>
            </div>

            <div class="amount-banner">
              <div style="font-size: 11px; color: #92400e; font-weight: bold;">المبلغ المصروف والمسدد</div>
              <div class="amount-val">${payment.amount.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
            </div>

            <div class="field-row">
              <div class="field-label">صُرف للمكرم / المورد:</div>
              <div class="field-val" style="font-size: 13px; color: #0f766e;">${supplier.name} (هاتف: ${supplier.phone})</div>
            </div>

            <div class="field-row">
              <div class="field-label">تاريخ الصرف والسداد:</div>
              <div class="field-val font-mono">${payment.date}</div>
            </div>

            <div class="field-row">
              <div class="field-label">طريقة الصرف:</div>
              <div class="field-val">${methodLabels[payment.paymentMethod] || payment.paymentMethod}</div>
            </div>

            <div class="field-row">
              <div class="field-label">وذلك عن / البيان:</div>
              <div class="field-val">${payment.notes || 'سداد دفعة من مستحقات وفواتير توريد الأدوية'}</div>
            </div>

            <div class="field-row">
              <div class="field-label">الرصيد المتبقي للمورد:</div>
              <div class="field-val font-mono" style="color: #b91c1c; font-weight: bold;">
                ${supplier.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}
              </div>
            </div>

            <div class="field-row">
              <div class="field-label">المسؤول عن الصرف:</div>
              <div class="field-val">${payment.recordedBy}</div>
            </div>

            <div class="footer-sig">
              <div class="sig-item">
                <div>المستلم / مندوب الشركة</div>
                <div class="sig-space"></div>
              </div>
              <div class="sig-item">
                <div>المحاسب المسؤول</div>
                <div class="sig-space"></div>
              </div>
              <div class="sig-item">
                <div>ختم الصيدلية الرسمي</div>
                <div class="sig-space"></div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Comprehensive Supplier Account Statement (A4)
   */
  printSupplierAccountStatement(
    supplier: Supplier,
    transactions: Array<{
      date: string;
      time?: string;
      type: string;
      typeLabel: string;
      ref: string;
      description: string;
      debit: number; // Invoices (money we owe)
      credit: number; // Payments (money we paid)
      balance: number;
    }>,
    settings: PharmacySettings
  ) {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) return;

    const totalDebit = transactions.reduce((acc, t) => acc + t.debit, 0);
    const totalCredit = transactions.reduce((acc, t) => acc + t.credit, 0);
    const hasDebt = supplier.currentBalance > 0;

    const rowsHtml = transactions
      .map(
        (t, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-size: 10px; color: #475569;">
            ${t.date}<br/><span style="color: #94a3b8; font-size: 9px;">${t.time || ''}</span>
          </td>
          <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-weight: bold; color: #0f766e;">${t.ref}</td>
          <td style="padding: 8px 6px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; ${
              t.type === 'payment'
                ? 'background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'
                : 'background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;'
            }">
              ${t.typeLabel}
            </span>
          </td>
          <td style="padding: 8px 8px; text-align: right; color: #1e293b;">
            <div style="font-weight: 600;">${t.description}</div>
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: bold; color: ${t.debit > 0 ? '#0f172a' : '#cbd5e1'};">
            ${t.debit > 0 ? t.debit.toLocaleString('ar-YE') : '-'}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: bold; color: ${t.credit > 0 ? '#15803d' : '#cbd5e1'}; background-color: ${t.credit > 0 ? '#f0fdf4' : 'transparent'};">
            ${t.credit > 0 ? '+' + t.credit.toLocaleString('ar-YE') : '-'}
          </td>
          <td style="padding: 8px 6px; text-align: left; font-family: monospace; font-weight: 800; color: ${t.balance > 0 ? '#b91c1c' : '#15803d'}; background-color: #f1f5f9;">
            ${t.balance.toLocaleString('ar-YE')}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>كشف حساب مورد - ${supplier.name}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .statement-container {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 16px;
              min-height: 98%;
            }
            .header-bar {
              border-bottom: 2px solid #0f766e;
              padding-bottom: 12px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .pharmacy-title { font-size: 18px; font-weight: 900; color: #0f766e; }
            .statement-badge {
              background: linear-gradient(135deg, #0f766e, #0d9488);
              color: #fff;
              padding: 6px 16px;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 800;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .info-item { display: flex; flex-direction: column; gap: 2px; }
            .info-label { color: #64748b; font-size: 10px; font-weight: 600; }
            .info-val { font-weight: bold; color: #0f172a; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; color: #334155; padding: 8px; font-size: 10px; border-bottom: 2px solid #cbd5e1; }
            .summary-section { display: flex; justify-content: space-between; margin-top: 14px; gap: 16px; }
            .summary-table { width: 320px; border-collapse: collapse; }
            .summary-table td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
            .final-debt-row { background-color: #fef2f2; color: #b91c1c; font-weight: bold; border-top: 2px solid #f87171; }
            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 24px; text-align: center; }
            .signature-line { margin-top: 30px; border-top: 1px dashed #64748b; width: 70%; margin-left: auto; margin-right: auto; }
          </style>
        </head>
        <body>
          <div class="statement-container">
            <div class="header-bar">
              <div>
                <div class="pharmacy-title">${settings.pharmacyName}</div>
                <div style="font-size: 10px; color: #64748b;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
              </div>
              <div style="text-align: left;">
                <div class="statement-badge">كشف حساب مورد معتمد</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">تاريخ الاستخراج: ${new Date().toISOString().split('T')[0]}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">اسم شركة التوريد / المورد:</span>
                <span class="info-val" style="color: #0f766e;">${supplier.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">المندوب المسؤول:</span>
                <span class="info-val">${supplier.contactPerson || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهاتف / التواصل:</span>
                <span class="info-val font-mono">${supplier.phone}</span>
              </div>
              <div class="info-item">
                <span class="info-label">إجمالي حجم التوريدات:</span>
                <span class="info-val font-mono">${supplier.totalPurchases.toLocaleString('ar-YE')} ${settings.currencySymbol}</span>
              </div>
              <div class="info-item">
                <span class="info-label">حالة الحساب الحالية:</span>
                <span class="info-val" style="color: ${hasDebt ? '#b91c1c' : '#15803d'}; font-weight: 800;">
                  ${hasDebt ? 'رصيد دائن للمورد (مستحق السداد)' : 'الحساب خالص ومسدد بالكامل'}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">صافي الرصيد المتبقي للمورد:</span>
                <span class="info-val font-mono" style="color: ${hasDebt ? '#b91c1c' : '#15803d'}; font-size: 13px; font-weight: 900;">
                  ${supplier.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}
                </span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 12%;">التاريخ والوقت</th>
                  <th style="width: 13%;">رقم المرجع</th>
                  <th style="width: 14%;">نوع الحركة</th>
                  <th style="width: 27%; text-align: right;">البيان والتفاصيل</th>
                  <th style="width: 11%; text-align: left;">وارد فواتير</th>
                  <th style="width: 12%; text-align: left;">المسدد دفعات</th>
                  <th style="width: 11%; text-align: left;">الرصيد المتبقي</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align: center; padding: 25px; color: #64748b;">لا توجد حركات مسجلة في هذا الكشف</td></tr>'}
              </tbody>
            </table>

            <div class="summary-section">
              <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #fafafa; font-size: 10px; color: #475569;">
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px;">إقرار مطابقة حساب المورد:</div>
                <p style="margin: 0; line-height: 1.5;">تم استخراج هذا الكشف آلياً لمطابقة الحسابات بين الصيدلية وشركة التوريد. نرجو مراجعة العمليات والتوقيع بالمطابقة.</p>
              </div>

              <table class="summary-table">
                <tr>
                  <td style="color: #475569;">إجمالي الفواتير الواردة:</td>
                  <td style="text-align: left; font-weight: bold; font-family: monospace;">${totalDebit.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
                <tr style="background-color: #f0fdf4; color: #15803d;">
                  <td>إجمالي المدفوعات المسددة:</td>
                  <td style="text-align: left; font-weight: bold; font-family: monospace;">+${totalCredit.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
                <tr class="final-debt-row">
                  <td>صافي الرصيد المستحق للمورد:</td>
                  <td style="text-align: left; font-weight: 900; font-family: monospace; font-size: 14px;">${supplier.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
              </table>
            </div>

            <div class="signatures">
              <div>
                <div>المحاسب المسؤول / الخزينة</div>
                <div class="signature-line"></div>
              </div>
              <div>
                <div>مندوب شركة التوريد / المستلم</div>
                <div class="signature-line"></div>
              </div>
              <div>
                <div>ختم واعتماد الصيدلية</div>
                <div class="signature-line"></div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Payables & Supplier Debts Report (A4)
   */
  printSupplierDebtsReport(suppliers: Supplier[], settings: PharmacySettings) {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const indebtedSuppliers = suppliers.filter((s) => s.currentBalance > 0);
    const totalDebts = indebtedSuppliers.reduce((acc, s) => acc + s.currentBalance, 0);
    const totalPurchases = suppliers.reduce((acc, s) => acc + s.totalPurchases, 0);

    const rowsHtml = indebtedSuppliers
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .map(
        (s, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px; text-align: center; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: #0f172a;">${s.name}</td>
          <td style="padding: 8px; text-align: center; color: #475569;">${s.contactPerson || '-'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${s.phone}</td>
          <td style="padding: 8px; text-align: center; color: #64748b;">${s.address || '-'}</td>
          <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #0f766e;">${s.totalPurchases.toLocaleString('ar-YE')}</td>
          <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: 800; color: #b91c1c; background-color: #fef2f2;">${s.currentBalance.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>تقرير ديون ومستحقات الموردين - ${settings.pharmacyName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .report-box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
            .header-table { width: 100%; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 14px; }
            .kpi-grid { display: flex; gap: 10px; margin-bottom: 14px; }
            .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
            .kpi-val { font-size: 14px; font-weight: 800; font-family: monospace; margin-top: 4px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.data-table th { background: #f1f5f9; color: #334155; padding: 8px; font-size: 10px; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="report-box">
            <table class="header-table">
              <tr>
                <td style="text-align: right;">
                  <h2 style="margin: 0; color: #0f766e; font-size: 16px;">${settings.pharmacyName}</h2>
                  <div style="color: #64748b; font-size: 10px;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
                </td>
                <td style="text-align: left;">
                  <div style="font-size: 14px; font-weight: bold; color: #b91c1c;">كشف ديون ومستحقات الموردين والشركات</div>
                  <div style="font-size: 10px; color: #64748b;">تاريخ الاستخراج: ${new Date().toISOString().split('T')[0]}</div>
                </td>
              </tr>
            </table>

            <div class="kpi-grid">
              <div class="kpi-card" style="border-color: #fecaca; background-color: #fef2f2;">
                <div style="color: #991b1b; font-weight: bold;">إجمالي المستحقات الواجبة السداد</div>
                <div class="kpi-val" style="color: #b91c1c;">${totalDebts.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
              <div class="kpi-card">
                <div style="color: #475569; font-weight: bold;">عدد الشركات الدائنة</div>
                <div class="kpi-val" style="color: #0f172a;">${indebtedSuppliers.length} شركة ومورد</div>
              </div>
              <div class="kpi-card">
                <div style="color: #0f766e; font-weight: bold;">إجمالي حجم التوريدات الكلي</div>
                <div class="kpi-val" style="color: #0f766e;">${totalPurchases.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 4%;">#</th>
                  <th style="text-align: right; width: 26%;">اسم الشركة / المورد</th>
                  <th style="width: 15%;">المندوب</th>
                  <th style="width: 15%;">رقم الهاتف</th>
                  <th style="width: 15%;">العنوان</th>
                  <th style="text-align: left; width: 12%;">إجمالي التوريدات</th>
                  <th style="text-align: left; width: 13%;">الرصيد المستحق (دين)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">لا توجد أي ديون مستحقة للموردين (جميع الحسابات خالصة)</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
                  <td colspan="6" style="padding: 10px; text-align: left; font-size: 12px;">الإجمالي العام للمستحقات:</td>
                  <td style="padding: 10px; text-align: left; font-family: monospace; font-size: 13px; color: #b91c1c;">${totalDebts.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },

  /**
   * Print Inventory Batches & Stock Expiry Status Report (A4 Official)
   */
  printInventoryBatchesReport(
    batches: Batch[],
    products: Product[],
    settings: PharmacySettings,
    filterName = 'كافة التشغيلات والدفعات'
  ) {
    const printWindow = window.open('', '_blank', 'width=950,height=950');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const now = new Date();
    const dateIn30Days = new Date();
    dateIn30Days.setDate(now.getDate() + 30);
    const dateIn90Days = new Date();
    dateIn90Days.setDate(now.getDate() + 90);

    const totalQty = batches.reduce((acc, b) => acc + (b.quantity > 0 ? b.quantity : 0), 0);
    const totalCost = batches.reduce((acc, b) => acc + (b.quantity > 0 ? b.costPrice * b.quantity : 0), 0);
    const totalRetail = batches.reduce((acc, b) => acc + (b.quantity > 0 ? b.sellingPrice * b.quantity : 0), 0);

    const rowsHtml = batches
      .map((b, idx) => {
        const prod = products.find((p) => p.id === b.productId);
        const exp = new Date(b.expiryDate);
        let statusColor = '#0f766e';
        let statusText = 'سليم وصالح';

        if (b.quantity <= 0) {
          statusColor = '#64748b';
          statusText = 'نافد (0)';
        } else if (exp <= now) {
          statusColor = '#b91c1c';
          statusText = 'منتهي الصلاحية';
        } else if (exp <= dateIn30Days) {
          statusColor = '#c2410c';
          statusText = 'ينتهي خلال 30 يوم';
        } else if (exp <= dateIn90Days) {
          statusColor = '#b45309';
          statusText = 'ينتهي خلال 90 يوم';
        }

        const isExpired = exp <= now && b.quantity > 0;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px; ${
            isExpired
              ? 'background-color: #fef2f2;'
              : idx % 2 === 1
              ? 'background-color: #f8fafc;'
              : '#fff'
          }">
            <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold;">#${idx + 1}</td>
            <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${prod?.name || b.productName || 'دواء'}</td>
            <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #0f766e; text-align: center;">${b.batchNumber}</td>
            <td style="padding: 6px 8px; font-family: monospace; font-weight: 700; color: ${isExpired ? '#b91c1c' : '#334155'}; text-align: center;">${b.expiryDate}</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 10px;">${statusText}</td>
            <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold; color: #0f172a; font-size: 11px;">${b.quantity}</td>
            <td style="padding: 6px 8px; text-align: left; font-family: monospace; color: #475569;">${b.costPrice.toLocaleString('ar-YE')}</td>
            <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: bold; color: #059669;">${b.sellingPrice.toLocaleString('ar-YE')}</td>
            <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: bold; color: #0f766e;">${(b.costPrice * b.quantity).toLocaleString('ar-YE')}</td>
            <td style="padding: 6px 8px; color: #64748b; font-size: 10px;">${b.supplierName || 'توريد مباشر'}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>تقرير المخزون والدفعات وتواريخ الصلاحية</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .report-box { border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; }
            .header-table { width: 100%; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 12px;
            }
            .kpi-card {
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              border-radius: 8px;
              padding: 8px 10px;
              text-align: center;
            }
            .kpi-val { font-size: 13px; font-weight: 900; font-family: monospace; margin-top: 3px; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            .data-table th {
              background: #0f766e;
              color: #fff;
              padding: 6px 8px;
              font-size: 10px;
              font-weight: bold;
              border: 1px solid #0d9488;
            }
            .data-table td { border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="report-box">
            <table class="header-table">
              <tr>
                <td style="text-align: right;">
                  <h2 style="margin: 0; color: #0f766e; font-size: 16px;">${settings.pharmacyName}</h2>
                  <div style="color: #64748b; font-size: 10px;">${settings.branchName || 'الفرع الرئيسي'} | هاتف: ${settings.phone}</div>
                </td>
                <td style="text-align: left;">
                  <div style="font-size: 14px; font-weight: bold; color: #0f766e;">تقرير جرد المخزون والدفعات (${filterName})</div>
                  <div style="font-size: 10px; color: #64748b;">تاريخ التقرير: ${new Date().toISOString().split('T')[0]} | إجمالي الدفعات: ${batches.length}</div>
                </td>
              </tr>
            </table>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div style="color: #475569; font-size: 10px; font-weight: bold;">إجمالي العبوات بالمخزن</div>
                <div class="kpi-val" style="color: #0f172a;">${totalQty.toLocaleString('ar-YE')} عبوة</div>
              </div>
              <div class="kpi-card" style="border-color: #99f6e4; background-color: #f0fdfa;">
                <div style="color: #0f766e; font-size: 10px; font-weight: bold;">قيمة المخزون (سعر الشراء)</div>
                <div class="kpi-val" style="color: #0f766e;">${totalCost.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
              <div class="kpi-card" style="border-color: #a7f3d0; background-color: #f0fdf4;">
                <div style="color: #15803d; font-size: 10px; font-weight: bold;">قيمة المخزون (سعر البيع)</div>
                <div class="kpi-val" style="color: #15803d;">${totalRetail.toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
              <div class="kpi-card">
                <div style="color: #0284c7; font-size: 10px; font-weight: bold;">الأرباح المتوقعة</div>
                <div class="kpi-val" style="color: #0284c7;">${(totalRetail - totalCost).toLocaleString('ar-YE')} ${settings.currencySymbol}</div>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 3%;">#</th>
                  <th style="text-align: right; width: 22%;">اسم الدواء والصنف</th>
                  <th style="width: 11%;">رقم التشغيلة (Batch)</th>
                  <th style="width: 10%;">تاريخ الانتهاء</th>
                  <th style="width: 12%;">حالة الصلاحية</th>
                  <th style="width: 7%;">الكمية</th>
                  <th style="text-align: left; width: 9%;">سعر التكلفة</th>
                  <th style="text-align: left; width: 9%;">سعر البيع</th>
                  <th style="text-align: left; width: 9%;">إجمالي التكلفة</th>
                  <th style="text-align: right; width: 8%;">المورد</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="10" style="text-align: center; padding: 16px; color: #64748b;">لا توجد دفعات مسجلة</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
                  <td colspan="5" style="padding: 8px; text-align: left; font-size: 11px;">الإجمالي الكلي:</td>
                  <td style="padding: 8px; text-align: center; font-family: monospace; font-size: 11px;">${totalQty.toLocaleString('ar-YE')}</td>
                  <td colspan="2" style="padding: 8px;"></td>
                  <td style="padding: 8px; text-align: left; font-family: monospace; font-size: 11px; color: #0f766e;">${totalCost.toLocaleString('ar-YE')} ${settings.currencySymbol}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printHtml(html, `doc-${Date.now()}`);
  },
};
