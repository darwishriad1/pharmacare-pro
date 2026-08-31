# PharmaCare Pro — APK مع إصلاح مشكلة الطباعة

## 🔴 المشكلة

`WebView.createPrintDocumentAdapter()` يطبع محتوى الـ WebView المرئي (واجهة التطبيق) بدلاً من طباعة الفاتورة/المستند.

## ✅ الحل

نولّد PDF حقيقي في الـ WebView عبر `jsPDF` + `html2canvas`، ثم نرسله إلى Android عبر `JavascriptInterface`، وAndroid يطبعه مباشرة عبر `PrintManager` (بدون أي WebView).

```
Web (TS)                    Android (Kotlin)
──────                      ────────────────
html2canvas()    ─┐
       ↓          │
jsPDF output()    ├──→  base64  ──→  PrintBridge.printPdfBase64()
       ↓          │                          ↓
datauristring     │                    حفظ في cache
       ↓          │                          ↓
dispatchPrint()  ─┘                    PrintManager.print()
                                              ↓
                                        🖨️ طابعة المستخدم
```

## 📁 الملفات المعدّلة/المضافة

| ملف | تغيير |
|---|---|
| `src/services/pdfService.ts` (جديد) | يحول HTML → PDF ويرسله لـ Android Bridge |
| `src/services/printerService.ts` | استبدل `window.print()` بـ `printHtml()` |
| `android/app/src/main/java/com/pharmacare/pro/MainActivity.kt` (جديد) | Bridge يستقبل PDF ويطبعه |
| `android/app/build.gradle` | إضافة Kotlin plugin |
| `android/build.gradle` | Kotlin classpath |
| `capacitor.config.json` | إعدادات Capacitor |
| `.github/workflows/build-apk.yml` (جديد) | يبني APK موقّع تلقائياً على GitHub |

## 🚀 بناء APK

### الطريقة 1: GitHub Actions (الأسهل — موصى به)

1. **ارفع المشروع على GitHub:**
   ```bash
   cd pharmacare-pro
   git init
   git add .
   git commit -m "Initial: fixed print bridge"
   git remote add origin https://github.com/YOUR_USER/pharmacare-pro.git
   git push -u origin main
   ```

2. **أضف Secrets** (Settings → Secrets and variables → Actions → New repository secret):
   - `KEYSTORE_BASE64`:
     ```bash
     # أنشئ keystystore أولاً (مرة واحدة)
     keytool -genkey -v -keystore pharmacare.keystore -alias pharmacare \
       -keyalg RSA -keysize 2048 -validity 10000 \
       -storepass YOUR_STORE_PWD -keypass YOUR_KEY_PWD
     # شفّر base64
     base64 -i pharmacare.keystore | tr -d '\n' > keystore.b64.txt
     # الصق محتوى keystore.b64.txt كقيمة السر
     ```
   - `KEYSTORE_PROPERTIES_BASE64`:
     ```
     # أنشئ android/keystore.properties:
     storeFile=pharmacare.keystore
     storePassword=YOUR_STORE_PWD
     keyAlias=pharmacare
     keyPassword=YOUR_KEY_PWD
     # شفّره
     base64 -i android/keystore.properties | tr -d '\n' > props.b64.txt
     ```

3. **شغّل الـ workflow:** Actions → Build Android APK → Run workflow

4. **حمّل الـ APK** من Artifacts (أسفل الصفحة)

### الطريقة 2: محلياً (يحتاج Android SDK + Java 21)

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleRelease    # موقّع (يحتاج keystore)
# أو
./gradlew assembleDebug      # بدون توقيع
```

الـ APK في: `android/app/build/outputs/apk/release/app-release.apk`

## 🧪 اختبار

### على الويب (للتطوير)
```bash
npm run dev
# افتح http://localhost:3000
# اطبع أي فاتورة → يفتح PDF في تبويب جديد
```

### على APK
- ثبّت APK على الجهاز
- افتح أي فاتورة → اضغط "طباعة"
- يجب أن يُفتح نظام طباعة Android
- اختر الطابعة → اطبع
- **يجب أن تطبع الفاتورة، لا واجهة التطبيق** ✅

## 🐛 استكشاف الأخطاء

### "PrintBridge is not defined" في Android
- تحقق من `Logcat` بـ filter `MainActivity`:
  ```
  adb logcat -s MainActivity PrintBridge
  ```
- يجب أن ترى: `PrintBridge registered to WebView`

### PDF فاضي / بدون محتوى
- تحقق إن الخطوط العربية محمّلة (Tajawal, Noto Sans Arabic)
- افتح `chrome://inspect` على Chrome Desktop لتفقد الـ WebView

### APK يرفض التثبيت
- غيّر `versionCode` في `android/app/build.gradle`
- إذا غيّرت `applicationId`، احذف القديم أولاً:
  ```bash
  adb uninstall com.pharmacare.pro
  adb install app-release.apk
  ```

## 📦 معلومات الإصدار

- **App ID:** `com.pharmacare.pro`
- **Version:** 1.0
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 36
