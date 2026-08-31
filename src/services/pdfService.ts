/**
 * PdfService — بديل `window.print()` يحلّ مشكلة WebView.print() تطبع واجهة التطبيق.
 *
 * الاستراتيجية:
 *   1. نأخذ HTML (المرسل من printerService.ts) ونحوّله إلى PDF حقيقي عبر html2canvas + jsPDF
 *   2. نطلب من Android (Capacitor Bridge) فتح نافذة PrintManager وطباعة الـ PDF مباشرة
 *   3. الـ PDF يُرسم من المحتوى المُرسل، ليس من الـ WebView المرئي
 *
 * داخل الـ WebView في Android:
 *   - window.print()  ❌  يستدعي WebView.createPrintDocumentAdapter() → يطبع الـ WebView
 *   - nativePrintPdf() ✅  يرسل base64(PDF) إلى Android → يحفظه → PrintManager.print()
 */

import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * نقطة الدخول الرئيسية لكل دوال الطباعة.
 * تستبدل النمط القديم:
 *   const w = window.open(...);
 *   w.document.open(); w.document.write(html); w.document.close();
 *
 * بالنمط الجديد:
 *   await dispatchPrint({ html, fileName });
 */
export async function dispatchPrint(opts: {
  html: string;
  fileName: string;
  paperSize?: 'A4' | 'A5' | '80mm' | '58mm';
}): Promise<void> {
  const paperSize = opts.paperSize || pdfService.detectPaperSize(opts.html);
  await pdfService.printHtmlAsPdf(opts.html, {
    fileName: opts.fileName,
    paperSize,
  });
}

export interface PrintPdfOptions {
  /** اسم الملف (بدون .pdf) */
  fileName: string;
  /** حجم الورق: 'A4' | 'A5' | '80mm' | '58mm' */
  paperSize?: 'A4' | 'A5' | '80mm' | '58mm';
  /** اتجاه الصفحة */
  orientation?: 'portrait' | 'landscape';
}

declare global {
  interface Window {
    PrintBridge?: {
      /** يطبع PDF من base64 (Android) */
      printPdfBase64: (base64: string, fileName: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

const paperSizeMap = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  '80mm': { width: 80, height: 297 },
  '58mm': { width: 58, height: 297 },
} as const;

class PdfServiceImpl {
  /**
   * يطبع HTML كـ PDF.
   * 1) يحقن HTML في iframe مخفي
   * 2) يلتقط iframe كـ canvas (html2canvas)
   * 3) يبني PDF متعدد الصفحات (jsPDF)
   * 4) يستدعي native PrintBridge على Android أو يفتح معاينة في المتصفح
   */
  async printHtmlAsPdf(html: string, options: PrintPdfOptions): Promise<boolean> {
    try {
      const pdfBase64 = await this.htmlToPdfBase64(html, options);

      // 1) Android عبر Bridge — هذا المسار الأساسي لـ APK
      if (this.isAndroidNative()) {
        const result = await window.PrintBridge!.printPdfBase64(pdfBase64, options.fileName);
        if (!result.success) {
          console.error('[PdfService] Native print failed:', result.error);
          this.fallbackBrowserPrint(pdfBase64, options.fileName);
        }
        return result.success;
      }

      // 2) Web fallback — يفتح الـ PDF في تبويب جديد (المستخدم يطبع من هناك)
      this.fallbackBrowserPrint(pdfBase64, options.fileName);
      return true;
    } catch (err) {
      console.error('[PdfService] Error:', err);
      // Emergency fallback: window.print() (السلوك القديم)
      this.emergencyWindowPrint(html);
      return false;
    }
  }

  /**
   * يحول HTML إلى PDF (base64) متعدد الصفحات.
   * يعمل على web + WebView على حدّ سواء.
   */
  async htmlToPdfBase64(html: string, options: PrintPdfOptions): Promise<string> {
    const paperSize = options.paperSize || 'A4';
    const orientation = options.orientation || 'portrait';
    const dims = paperSizeMap[paperSize];

    // 1) حقن HTML في iframe مخفي
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;left:-99999px;top:0;width:' +
      (paperSize === '80mm' || paperSize === '58mm' ? '302px' : '794px') +
      ';height:2000px;border:0;background:#fff;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error('Could not access iframe document');
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // 2) انتظر تحميل الخطوط والصور
    await this.waitForIframeReady(iframe);

    // 3) html2canvas → canvas
    const target = iframeDoc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });

    // 4) تنظيف
    document.body.removeChild(iframe);

    // 5) jsPDF → PDF متعدد الصفحات
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format:
        paperSize === '80mm' || paperSize === '58mm'
          ? [dims.width, dims.height] // thermal: عرض ثابت، ارتفاع حسب المحتوى
          : paperSize,
    });

    const pageWidthMm =
      paperSize === '80mm' || paperSize === '58mm'
        ? dims.width
        : orientation === 'landscape'
        ? dims.height
        : dims.width;
    const pageHeightMm =
      paperSize === '80mm' || paperSize === '58mm'
        ? dims.height
        : orientation === 'landscape'
        ? dims.width
        : dims.height;

    const imgWidthMm = pageWidthMm;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    if (paperSize === '80mm' || paperSize === '58mm') {
      // Thermal: ورقة واحدة طويلة (طولها = ارتفاع المحتوى)
      pdf.internal.pageSize.height = Math.max(imgHeightMm, pageHeightMm);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    let heightLeft = imgHeightMm;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeightMm;

    while (heightLeft > 0) {
      position = heightLeft - imgHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeightMm;
    }

    // 6) استخراج base64 (بدون prefix)
    const dataUri = pdf.output('datauristring');
    const base64 = dataUri.split(',')[1];
    return base64;
  }

  private isAndroidNative(): boolean {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === 'android' &&
      typeof window.PrintBridge !== 'undefined' &&
      typeof window.PrintBridge.printPdfBase64 === 'function'
    );
  }

  private async waitForIframeReady(iframe: HTMLIFrameElement): Promise<void> {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('iframe doc not ready');

    // انتظر fonts
    if (doc.fonts && doc.fonts.ready) {
      await doc.fonts.ready;
    }

    // انتظر الصور
    const images = Array.from(doc.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalHeight > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 3000);
        });
      })
    );

    // إعطاء وقت قصير للـ layout
    await new Promise((r) => setTimeout(r, 200));
  }

  private fallbackBrowserPrint(pdfBase64: string, fileName: string): void {
    // Web fallback: حوّل base64 إلى Blob وافتحه
    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.document.title = fileName;
    } else {
      // popup blocked → حمّل الملف
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName + '.pdf';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private emergencyWindowPrint(html: string): void {
    // fallback أخير: window.print() على HTML كما كان
    const w = window.open('', '_blank');
    if (!w) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  }

  /**
   * يكتشف حجم الورق من @page CSS داخل HTML.
   * يُستخدم لتوجيه jsPDF للحجم الصحيح.
   */
  detectPaperSize(html: string): 'A4' | 'A5' | '80mm' | '58mm' {
    const lower = html.toLowerCase();
    if (lower.includes('58mm')) return '58mm';
    if (lower.includes('80mm')) return '80mm';
    if (lower.includes('a5')) return 'A5';
    return 'A4';
  }
}

export const pdfService = new PdfServiceImpl();
