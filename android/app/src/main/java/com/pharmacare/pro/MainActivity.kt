package com.pharmacare.pro

import android.content.Context
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import com.getcapacitor.BridgeActivity
import java.io.File
import java.io.FileOutputStream

/**
 * يحلّ المشكلة: WebView.createPrintDocumentAdapter() يطبع محتوى الـ WebView المرئي.
 * هنا: نستقبل PDF (base64) من الـ WebView → نحفظه → PrintManager.print() يطبعه مباشرة.
 */
class PrintBridge(private val context: Context) {

    @JavascriptInterface
    fun printPdfBase64(base64: String, fileName: String): String {
        return try {
            Log.d(TAG, "printPdfBase64() called, fileName=$fileName, size=${base64.length}")

            // 1) فك ترميز base64
            val pdfBytes = Base64.decode(base64, Base64.DEFAULT)

            // 2) حفظ في cache
            val cacheDir = File(context.cacheDir, "print_jobs")
            cacheDir.mkdirs()
            val pdfFile = File(cacheDir, "$fileName.pdf")
            FileOutputStream(pdfFile).use { it.write(pdfBytes) }
            Log.d(TAG, "PDF saved: ${pdfFile.absolutePath} (${pdfFile.length()} bytes)")

            // 3) طباعة عبر PrintManager — PrintDocumentAdapter يقرأ ملفنا مباشرة
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            val jobName = "PharmaCare-${System.currentTimeMillis()}"

            val adapter = object : PrintDocumentAdapter() {
                override fun onLayout(
                    oldAttributes: PrintAttributes?,
                    newAttributes: PrintAttributes,
                    cancellationSignal: CancellationSignal?,
                    callback: LayoutResultCallback,
                    extras: android.os.Bundle?
                ) {
                    if (cancellationSignal?.isCanceled == true) {
                        callback.onLayoutCancelled()
                        return
                    }
                    val info = PrintDocumentInfo.Builder(fileName)
                        .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                        .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                        .build()
                    callback.onLayoutFinished(info, true)
                }

                override fun onWrite(
                    pageRanges: Array<PageRange>,
                    destination: ParcelFileDescriptor,
                    cancellationSignal: CancellationSignal?,
                    callback: WriteResultCallback
                ) {
                    try {
                        // 4) الأهم: ننسخ ملف PDF مباشرة إلى PrintManager destination
                        // الـ PDF جاهز من jsPDF، نحتاج فقط نسخه
                        FileOutputStream(destination.fileDescriptor).use { fos ->
                            pdfFile.inputStream().use { input ->
                                input.copyTo(fos)
                            }
                        }
                        callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
                        Log.d(TAG, "onWrite finished successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "onWrite failed", e)
                        callback.onWriteFailed(e.message)
                    }
                }
            }

            printManager.print(jobName, adapter, PrintAttributes.Builder().build())
            "{\"success\":true}"
        } catch (e: Exception) {
            Log.e(TAG, "printPdfBase64 failed", e)
            "{\"success\":false,\"error\":\"${e.message?.replace("\"", "'")}\"}"
        }
    }

    companion object {
        private const val TAG = "PrintBridge"
    }
}

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        // تسجيل PrintBridge في الـ WebView بعد super.onCreate (لضمان bridge جاهز)
        bridge.webView.post {
            bridge.webView.addJavascriptInterface(
                PrintBridge(this),
                "PrintBridge"
            )
            Log.d("MainActivity", "PrintBridge registered to WebView")
        }
    }
}
