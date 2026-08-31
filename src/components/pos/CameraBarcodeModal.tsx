import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  ScanLine,
  Zap,
  ZapOff,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Package,
  ZoomIn,
  ZoomOut,
  Upload,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Product, UnitType } from '../../types';
import { decodeBarcodeInput, playScannerBeep, playScannerErrorBeep } from '../../utils/barcodeDecoder';

interface CameraBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => boolean; // returns true if product found
  allProducts: Product[];
  activeUnit?: UnitType;
  onSelectUnit?: (unit: UnitType) => void;
}

export const CameraBarcodeModal: React.FC<CameraBarcodeModalProps> = ({
  isOpen,
  onClose,
  onScan,
  allProducts,
  activeUnit = 'package',
  onSelectUnit,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Camera capabilities
  const [torchSupported, setTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({ min: 1, max: 3, step: 0.1 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Scan modes & feedback
  const [continuousScan, setContinuousScan] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScannedResultInfo, setLastScannedResultInfo] = useState<{
    name: string;
    format: string;
    barcode: string;
    expiry?: string;
    batch?: string;
    success: boolean;
  } | null>(null);

  // Active readers & references for stable callbacks
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingFrameRef = useRef(false);
  const lastScanTimestampRef = useRef(0);
  const initSessionIdRef = useRef(0);
  const isMountedRef = useRef(true);

  // Synchronize dynamic values into refs so callbacks stay stable
  const onScanRef = useRef(onScan);
  const allProductsRef = useRef(allProducts);
  const onCloseRef = useRef(onClose);
  const soundEnabledRef = useRef(soundEnabled);
  const continuousScanRef = useRef(continuousScan);
  const lastScannedBarcodeRef = useRef(lastScannedBarcode);

  useEffect(() => {
    onScanRef.current = onScan;
    allProductsRef.current = allProducts;
    onCloseRef.current = onClose;
    soundEnabledRef.current = soundEnabled;
    continuousScanRef.current = continuousScan;
    lastScannedBarcodeRef.current = lastScannedBarcode;
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Setup ZXing and Native BarcodeDetector
  useEffect(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const zxing = new BrowserMultiFormatReader(hints, 300);
    zxingReaderRef.current = zxing;

    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            'ean_13',
            'ean_8',
            'code_128',
            'code_39',
            'code_93',
            'upc_a',
            'upc_e',
            'data_matrix',
            'qr_code',
            'itf',
          ],
        });
      } catch (e) {
        console.warn('Native BarcodeDetector not supported, using ZXing', e);
      }
    }

    return () => {
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch {}
      }
    };
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    initSessionIdRef.current += 1;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Enumerate camera video devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const allDevs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevs.filter((d) => d.kind === 'videoinput');
      if (isMountedRef.current) {
        setDevices(videoDevs);
      }
    } catch (e) {
      console.warn('Could not enumerate video devices', e);
    }
  }, []);

  // Handle scanned result from any engine
  const handleBarcodeSuccess = useCallback((rawScannedCode: string, detectedFormatName?: string) => {
    const code = rawScannedCode.trim();
    if (!code) return;

    const now = Date.now();
    if (code === lastScannedBarcodeRef.current && now - lastScanTimestampRef.current < 1600) {
      return;
    }

    lastScanTimestampRef.current = now;
    setLastScannedBarcode(code);

    const decoded = decodeBarcodeInput(code);

    const matchedProduct = allProductsRef.current.find(
      (p) =>
        p.barcode.trim().toLowerCase() === decoded.normalizedCode.toLowerCase() ||
        (decoded.gtin && p.barcode.trim().toLowerCase() === decoded.gtin.toLowerCase()) ||
        p.barcode.trim().toLowerCase() === code.toLowerCase()
    );

    const success = onScanRef.current(decoded.normalizedCode);

    if (success) {
      if (soundEnabledRef.current) {
        playScannerBeep();
      }
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([40, 30, 40]);
        }
      } catch {}

      setScannedCount((prev) => prev + 1);
      setLastScannedResultInfo({
        name: matchedProduct ? matchedProduct.name : 'تمت الإضافة للسلة',
        format: detectedFormatName || decoded.format || 'Barcode',
        barcode: decoded.normalizedCode,
        expiry: decoded.expiryDate,
        batch: decoded.batchNumber,
        success: true,
      });

      if (!continuousScanRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            onCloseRef.current();
          }
        }, 700);
      } else {
        setTimeout(() => {
          if (isMountedRef.current) {
            setLastScannedBarcode(null);
          }
        }, 1600);
      }
    } else {
      if (soundEnabledRef.current) {
        playScannerErrorBeep();
      }
      setLastScannedResultInfo({
        name: 'صنف غير مسجل في قاعدة البيانات',
        format: detectedFormatName || decoded.format || 'Barcode',
        barcode: decoded.normalizedCode,
        expiry: decoded.expiryDate,
        batch: decoded.batchNumber,
        success: false,
      });
      setTimeout(() => {
        if (isMountedRef.current) {
          setLastScannedBarcode(null);
        }
      }, 2000);
    }
  }, []);

  // Main Detection Loop
  const startDetectionLoop = useCallback(() => {
    let lastScanTime = 0;

    const detectLoop = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || videoRef.current.paused) {
        animationFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const now = Date.now();
      if (now - lastScanTime > 180 && !isProcessingFrameRef.current) {
        lastScanTime = now;
        isProcessingFrameRef.current = true;

        try {
          let detected = false;

          // 1. Try Native BarcodeDetector first
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue?.trim();
                const fmt = barcodes[0].format?.toUpperCase();
                if (rawVal) {
                  detected = true;
                  handleBarcodeSuccess(rawVal, fmt);
                }
              }
            } catch {}
          }

          // 2. ZXing Reader fallback directly on video element
          if (!detected && zxingReaderRef.current && videoRef.current) {
            try {
              // @ts-ignore
              const result = zxingReaderRef.current.decode(videoRef.current);
              if (result) {
                const rawText = result.getText()?.trim();
                const formatName = result.getBarcodeFormat() ? BarcodeFormat[result.getBarcodeFormat()] : 'Barcode';
                if (rawText) {
                  detected = true;
                  handleBarcodeSuccess(rawText, formatName);
                }
              }
            } catch {}
          }

          // 3. Center crop fallback for tiny medicine packaging
          if (!detected && canvasRef.current && videoRef.current) {
            try {
              const canvas = canvasRef.current;
              const video = videoRef.current;
              const vWidth = video.videoWidth || 640;
              const vHeight = video.videoHeight || 480;

              const cropW = Math.floor(vWidth * 0.7);
              const cropH = Math.floor(vHeight * 0.45);
              const cropX = Math.floor((vWidth - cropW) / 2);
              const cropY = Math.floor((vHeight - cropH) / 2);

              canvas.width = cropW;
              canvas.height = cropH;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                if (zxingReaderRef.current) {
                  try {
                    // @ts-ignore
                    const canvasResult = zxingReaderRef.current.decode(canvas as any);
                    if (canvasResult) {
                      const txt = canvasResult.getText()?.trim();
                      const fmt = canvasResult.getBarcodeFormat() ? BarcodeFormat[canvasResult.getBarcodeFormat()] : 'Barcode';
                      if (txt) {
                        handleBarcodeSuccess(txt, fmt);
                      }
                    }
                  } catch {}
                }
              }
            } catch {}
          }
        } finally {
          isProcessingFrameRef.current = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    animationFrameRef.current = requestAnimationFrame(detectLoop);
  }, [handleBarcodeSuccess]);

  // Start Camera Stream with clean abort handling
  const startCamera = useCallback(async (deviceIdToUse?: string, preferredFacing?: 'environment' | 'user') => {
    stopCamera();
    const currentSessionId = initSessionIdRef.current;

    setIsInitializing(true);
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم فتح الكاميرا مباشرة');
      }

      const activeFacing = preferredFacing || facingMode;
      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse
          ? {
              deviceId: { exact: deviceIdToUse },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
            }
          : {
              facingMode: { ideal: activeFacing },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // If user closed modal or switched camera while waiting for getUserMedia, stop this stream
      if (!isMountedRef.current || initSessionIdRef.current !== currentSessionId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          // @ts-ignore
          const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
          setTorchSupported('torch' in capabilities);

          if ('zoom' in capabilities) {
            setZoomSupported(true);
            setZoomRange({
              // @ts-ignore
              min: capabilities.zoom.min || 1,
              // @ts-ignore
              max: capabilities.zoom.max || 3,
              // @ts-ignore
              step: capabilities.zoom.step || 0.1,
            });
            // @ts-ignore
            setZoomLevel(capabilities.zoom.min || 1);
          } else {
            setZoomSupported(false);
          }

          if ('focusMode' in capabilities) {
            // @ts-ignore
            if (capabilities.focusMode.includes('continuous')) {
              await videoTrack.applyConstraints({
                // @ts-ignore
                advanced: [{ focusMode: 'continuous' }],
              } as any);
            }
          }
        } catch (capErr) {
          console.warn('Could not read track capabilities:', capErr);
        }
      }

      if (videoRef.current && isMountedRef.current && initSessionIdRef.current === currentSessionId) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');

        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playErr: any) {
          if (playErr.name === 'AbortError' || playErr.name === 'NotAllowedError') {
            // Normal interruption when modal is closed or changed, ignore
            return;
          }
          console.warn('Camera video play interrupted:', playErr);
        }

        if (isMountedRef.current && initSessionIdRef.current === currentSessionId) {
          setHasCameraPermission(true);
          setIsInitializing(false);
          await refreshDevices();
          startDetectionLoop();
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current || initSessionIdRef.current !== currentSessionId) {
        return;
      }
      console.error('Camera initialization error:', err);
      setHasCameraPermission(false);
      setIsInitializing(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'تم رفض إذن الوصول للكاميرا. يرجى السماح بالوصول من أيقونة القفل في شريط عنوان المتصفح.'
          : err.name === 'NotFoundError'
          ? 'لم يتم العثور على كاميرا متصلة بالجهاز.'
          : 'تعذر تشغيل الكاميرا. تأكد من عدم استخدامها بواسطة تطبيق آخر.'
      );
    }
  }, [facingMode, refreshDevices, startDetectionLoop, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newState }],
      });
      setIsTorchOn(newState);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Change Zoom
  const handleZoomChange = async (newZoom: number) => {
    if (!streamRef.current || !zoomSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const clamped = Math.max(zoomRange.min, Math.min(zoomRange.max, newZoom));
      await (track as any).applyConstraints({
        advanced: [{ zoom: clamped }],
      });
      setZoomLevel(clamped);
    } catch (e) {
      console.warn('Zoom change failed', e);
    }
  };

  // Handle Switch Camera
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedDeviceId('');
    startCamera(undefined, nextFacing);
  };

  // Handle Device Selection
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  // Handle Image File Upload for Barcode Scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((res) => {
        img.onload = res;
      });

      let found = false;

      // 1. Try Native BarcodeDetector on image
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(img);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue?.trim();
            if (code) {
              found = true;
              handleBarcodeSuccess(code, barcodes[0].format?.toUpperCase());
            }
          }
        } catch {}
      }

      // 2. Try ZXing on image
      if (!found && zxingReaderRef.current) {
        try {
          // @ts-ignore
          const result = zxingReaderRef.current.decode(img as any);
          if (result) {
            const txt = result.getText()?.trim();
            const fmt = result.getBarcodeFormat() ? BarcodeFormat[result.getBarcodeFormat()] : 'Image Barcode';
            if (txt) {
              found = true;
              handleBarcodeSuccess(txt, fmt);
            }
          }
        } catch {}
      }

      if (!found) {
        alert('لم يتم التعرف على باركود واضح في هذه الصورة. يرجى تجربة صورة أوضح أو توجيه الكاميرا مباشرة.');
      }
    } catch (err) {
      console.error('File scan error:', err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId || undefined);
      setScannedCount(0);
      setLastScannedBarcode(null);
      setLastScannedResultInfo(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-3.5 bg-slate-800 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  قارئ الباركود بالكاميرا الفائق
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  دقة عالية
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                يدعم باركود الأدوية EAN-13, GS1 DataMatrix, Code 128, QR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-teal-400 border-teal-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
              title={soundEnabled ? 'كتم صوت الصافرة' : 'تفعيل صوت الصافرة'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Scanner Viewport Area */}
        <div className="relative bg-black flex-1 min-h-[280px] max-h-[380px] flex items-center justify-center overflow-hidden select-none">
          {hasCameraPermission !== false ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Target Scan Reticle Overlay with animated beam */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="relative w-72 h-44 sm:w-80 sm:h-48 border-2 border-teal-400/80 rounded-2xl bg-teal-500/5 shadow-[0_0_30px_rgba(20,184,166,0.35)] flex items-center justify-center overflow-hidden">
                  
                  {/* Corner Targets */}
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />

                  {/* Laser Scanning Beam */}
                  <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_16px_#f43f5e] animate-bounce" />

                  <div className="absolute bottom-2 text-[10px] text-teal-300 font-bold bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-teal-500/30 backdrop-blur-xs flex items-center gap-1.5">
                    <ScanLine className="w-3 h-3 text-teal-400" />
                    ضع باركود الدواء في منتصف الإطار
                  </div>
                </div>
              </div>

              {/* Top Controls Overlay on Camera View */}
              <div className="absolute top-3 right-3 left-3 flex items-center justify-between pointer-events-auto gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Torch / Flashlight button */}
                  {torchSupported && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isTorchOn
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30'
                          : 'bg-slate-900/85 text-amber-400 hover:bg-slate-800 border-slate-700'
                      }`}
                      title="تشغيل كشاف الإضاءة"
                    >
                      {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                      <span className="hidden sm:inline text-[11px]">{isTorchOn ? 'الكشاف شغال' : 'إضاءة'}</span>
                    </button>
                  )}

                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md cursor-pointer active:scale-95 shadow-lg"
                    title="تبديل الكاميرا"
                  >
                    <RotateCcw className="w-4 h-4 text-teal-400" />
                    <span className="hidden sm:inline text-[11px]">تبديل العدسة</span>
                  </button>

                  {/* Multiple Cameras Selector */}
                  {devices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleDeviceSelect(e.target.value)}
                      className="bg-slate-900/90 text-white border border-slate-700 text-[10px] rounded-xl px-2 py-1.5 max-w-[120px] truncate cursor-pointer"
                    >
                      <option value="">الكاميرا الافتراضية</option>
                      {devices.map((d, idx) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `كاميرا ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Scanned Badge */}
                <div className="bg-slate-900/90 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم مسح: {scannedCount}</span>
                </div>
              </div>

              {/* Bottom Controls on Video: Zoom Slider */}
              {zoomSupported && (
                <div className="absolute bottom-3 right-3 left-3 flex items-center justify-center pointer-events-auto">
                  <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => handleZoomChange(zoomLevel - 0.3)}
                      className="text-slate-300 hover:text-white p-0.5"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={zoomRange.min}
                      max={zoomRange.max}
                      step={zoomRange.step}
                      value={zoomLevel}
                      onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                      className="w-24 accent-teal-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleZoomChange(zoomLevel + 0.3)}
                      className="text-slate-300 hover:text-white p-0.5"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-teal-300 font-bold min-w-[24px]">
                      {zoomLevel.toFixed(1)}x
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">إذن الكاميرا مطلوب</h4>
              <p className="text-xs text-amber-200/90 font-medium max-w-xs mx-auto leading-relaxed">
                {errorMessage}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Detected Feedback Banner */}
        {lastScannedResultInfo && (
          <div
            className={`p-3 border-t border-b flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150 ${
              lastScannedResultInfo.success
                ? 'bg-teal-950/90 border-teal-800 text-teal-100'
                : 'bg-rose-950/90 border-rose-800 text-rose-100'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {lastScannedResultInfo.success ? (
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">
                  {lastScannedResultInfo.name}
                </div>
                <div className="text-[10px] flex items-center gap-2 flex-wrap font-mono mt-0.5">
                  <span className="text-teal-400 font-bold">
                    كود: {lastScannedResultInfo.barcode}
                  </span>
                  <span className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[9px] text-slate-300">
                    {lastScannedResultInfo.format}
                  </span>
                  {lastScannedResultInfo.expiry && (
                    <span className="text-amber-300 text-[9px]">
                      صلاحية: {lastScannedResultInfo.expiry}
                    </span>
                  )}
                  {lastScannedResultInfo.batch && (
                    <span className="text-sky-300 text-[9px]">
                      تشغيلة: {lastScannedResultInfo.batch}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {lastScannedResultInfo.success && (
              <span className="text-xs bg-teal-600 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 shadow">
                +1 أضيف
              </span>
            )}
          </div>
        )}

        {/* Unit Selector & Fast Scan Mode */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Unit selection inside camera */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">وحدة الإضافة:</span>
            <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => onSelectUnit?.('package')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeUnit === 'package'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                عبوة
              </button>
              <button
                type="button"
                onClick={() => onSelectUnit?.('strip')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeUnit === 'strip'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                شريط
              </button>
              <button
                type="button"
                onClick={() => onSelectUnit?.('piece')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeUnit === 'piece'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                حبة
              </button>
            </div>
          </div>

          {/* Continuous Scan Checkbox */}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={continuousScan}
              onChange={(e) => setContinuousScan(e.target.checked)}
              className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
            />
            مسح مستمر متتابع
          </label>
        </div>

        {/* Quick Testing Barcodes & Image Upload fallback */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              أدوية جاهزة للمسح التجريبي الفوري:
            </span>

            {/* Upload image button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-teal-400 hover:text-teal-300 bg-slate-800 hover:bg-slate-750 px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                title="مسح من صورة مخزنة بالجهاز"
              >
                <Upload className="w-3 h-3" />
                مسح من صورة
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {allProducts.slice(0, 8).map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleBarcodeSuccess(prod.barcode)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-teal-900/60 text-slate-200 hover:text-teal-200 border border-slate-700 hover:border-teal-600 text-[10px] font-bold text-right shrink-0 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Package className="w-3 h-3 text-teal-400 shrink-0" />
                <span className="truncate max-w-[110px]">{prod.name}</span>
                <span className="font-mono text-[9px] text-slate-400 bg-slate-950 px-1 rounded border border-slate-700">
                  {prod.barcode.slice(-4)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-800 border-t border-slate-700/80 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-medium">
            تأكد من وجود إضاءة كافية وتثبيت الباركود داخل الإطار
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95"
          >
            إغلاق ({scannedCount} تم إضافتها)
          </button>
        </div>
      </div>
    </div>
  );
};
